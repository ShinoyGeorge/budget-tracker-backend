import {AuthenticatedUser} from "../types/express";
import {getUserOrThrow} from "./user.service";
import {PrismaClient} from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {HouseholdJoinRequestNotFoundError, InvalidPrivilegeError} from "../errors";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function listHouseholdMembers(caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);
    return prisma.user.findMany({
        where: { householdId: user.householdId },
        select: { id: true, name: true },
    });
}

export async function listPendingJoinRequests(caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);
    return prisma.householdJoinRequest.findMany({
        where: { householdId: user.householdId },
        orderBy: { createdAt: "desc" },
    });
}

export async function rejectHouseholdJoin(requestId: string, caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);
    const request = await prisma.householdJoinRequest.findUnique({ where: { id: requestId } });
    if (!request) {
        throw new HouseholdJoinRequestNotFoundError("Request not found");
    }
    if (request.householdId !== user.householdId) {
        throw new InvalidPrivilegeError("You do not have access to this request");
    }
    await prisma.householdJoinRequest.delete({ where: { id: requestId } });
}