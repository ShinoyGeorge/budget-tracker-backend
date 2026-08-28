import {AuthenticatedUser} from "../types/express";
import {getUserOrThrow} from "./user.service";
import {PrismaClient} from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function listHouseholdMembers(caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);
    return prisma.user.findMany({
        where: { householdId: user.householdId },
        select: { id: true, name: true },
    });
}