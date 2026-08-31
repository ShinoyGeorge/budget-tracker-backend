import {HouseholdCreationRequestNotFoundError} from "../errors";
import {PrismaPg} from "@prisma/adapter-pg";
import {PrismaClient} from "../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function listPendingHouseholdCreationRequests() {
    return prisma.householdCreationRequest.findMany({
        orderBy: { createdAt: "desc" },
    });
}

export async function approveHouseholdCreation(requestId: string): Promise<void> {
    const houseHoldCreationRequest = await prisma.householdCreationRequest.findUnique({ where: { id: requestId } });
    if (!houseHoldCreationRequest) {
        throw new HouseholdCreationRequestNotFoundError("Request to add house hold not found");
    }

    await prisma.$transaction(async (tx) => {
        const household = await tx.household.create({
            data: { name: houseHoldCreationRequest.householdName }
        });
        await tx.user.create({
            data: {
                email: houseHoldCreationRequest.email,
                passwordHash: houseHoldCreationRequest.passwordHash,
                role: "MEMBER",
                householdId: household.id,
                name: houseHoldCreationRequest.founderName,
            }
        });
        await tx.householdCreationRequest.delete({ where: { id: requestId } });
    });
}

export async function rejectHouseholdCreation(requestId: string): Promise<void> {
    const request = await prisma.householdCreationRequest.findUnique({ where: { id: requestId } });
    if (!request) {
        throw new HouseholdCreationRequestNotFoundError("Request not found");
    }
    await prisma.householdCreationRequest.delete({ where: { id: requestId } });
}