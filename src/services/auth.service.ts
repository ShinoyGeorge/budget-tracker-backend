import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {PrismaClient, RequestStatus, Role} from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {AuthenticatedUser} from "../types/express";
import {getUserOrThrow} from "./user.service";
import crypto from "crypto";
import {
    EmailInUseError,
    HouseholdCreationRequestNotFoundError, HouseholdExistsError,
    HouseholdJoinRequestNotFoundError, HouseholdNotFoundError, InvalidCredentialsError,
    InvalidPrivilegeError, InvalidRefreshTokenError, PendingRequestError, UserNotFoundError
} from "../errors";
import {LoginResult, RegisterInput} from "../types/auth";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });


export async function approveHouseholdJoin(requestId: string, loggedInUser: AuthenticatedUser): Promise<void> {
    const householdJoinRequest = await prisma.householdJoinRequest.findUnique({ where: { id: requestId } });
    if (!householdJoinRequest) {
        throw new HouseholdJoinRequestNotFoundError("Request to add house hold not found");
    }
    const user = await getUserOrThrow(loggedInUser.sub);
    if(user.householdId != householdJoinRequest.householdId){
        throw new InvalidPrivilegeError("User is not part of household");
    }

    await prisma.$transaction(async (tx) => {
        await tx.user.create({
            data: {
                email: householdJoinRequest.email,
                passwordHash: householdJoinRequest.passwordHash,
                role: Role.MEMBER,
                householdId: householdJoinRequest.householdId,
                name: householdJoinRequest.name,
            }
        });
        await tx.householdJoinRequest.delete({ where: { id: requestId } })
    });
}

function generateRefreshToken(): string {
    return crypto.randomBytes(40).toString("hex");
}

export async function refreshAccessToken(oldRefreshToken: string) {
    const stored = await prisma.refreshToken.findUnique({ where: { token: oldRefreshToken } });

    if (!stored) {
        throw new InvalidRefreshTokenError("Refresh token is invalid");
    }

    if (stored.revoked) {
        await prisma.refreshToken.updateMany({
            where: { userId: stored.userId },
            data: { revoked: true },
        });
        throw new InvalidRefreshTokenError("Refresh token has already been used. All sessions have been revoked for your safety.");
    }

    if (stored.expiresAt < new Date()) {
        throw new InvalidRefreshTokenError("Refresh token has expired");
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) {
        throw new UserNotFoundError("User not found");
    }

    const newRefreshToken = generateRefreshToken();

    await prisma.$transaction([
        prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } }),
        prisma.refreshToken.create({
            data: {
                token: newRefreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        }),
    ]);

    const newAccessToken = jwt.sign(
        { sub: user.id, role: user.role },
        process.env.JWT_SECRET as string,
        { expiresIn: "15m" }
    );

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshToken: string) {
    await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revoked: true },
    });
}

export async function login(email: string, password: string): Promise<LoginResult> {
    const user = await prisma.user.findUnique(
        {
            where: { email },
            include: { household: { select: { name: true } } },
        });
    if (!user) {
        throw new InvalidCredentialsError("Invalid email or password");
    }

    const passwordMatches: boolean = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
        throw new InvalidCredentialsError("Invalid email or password");
    }

    const accessToken = jwt.sign(
        { sub: user.id, role: user.role },
        process.env.JWT_SECRET as string,
        { expiresIn: "15m" }
    );

    const refreshToken = generateRefreshToken();
    await prisma.refreshToken.create({
        data: {
            token: refreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    });

    return {
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, role: user.role, householdName: user.household.name },
    };
}

export async function register(input: RegisterInput): Promise<{ message: string }> {
    const { name, email, password, isNewHouseHold, householdName } = input;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new EmailInUseError("This email is already registered to a household");
    }

    const [existingJoinRequest, newHouseHoldRequest] = await Promise.all([
        prisma.householdJoinRequest.findUnique({ where: { email } }),
        prisma.householdCreationRequest.findUnique({ where: { email } }),
    ]);

    if (existingJoinRequest || newHouseHoldRequest) {
        throw new PendingRequestError("A request to join a household already exists.");
    }

    const passwordHash: string = await bcrypt.hash(password, 10);
    let message: string;
    if(isNewHouseHold) {
        const houseHold = await prisma.household.findUnique({where: {name : householdName}})
        if(houseHold) {
            throw new HouseholdExistsError("A household with this name already exists. Please choose a different name.");
        }

        await prisma.householdCreationRequest.create({
            data: {
                householdName,
                founderName: name,
                email,
                passwordHash,
                status: RequestStatus.PENDING,
            },
        });
        message = "A request to create a household has been sent. Please wait for the administrator to approve your request.";
    } else {
        const houseHold = await prisma.household.findUnique({where: {name : householdName}})
        if(houseHold == null) {
            throw new HouseholdNotFoundError("A household with this name does not exist. Please register as new household.");
        }

        await prisma.householdJoinRequest.create({
            data: {
                name,
                email,
                passwordHash,
                householdId: houseHold.id,
                status: RequestStatus.PENDING,
            },
        });
        message = "A request to join a household has been sent. Please wait for a house hold member to approve your request.";
    }
    return { message };
}