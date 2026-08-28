import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export class UserNotFoundError extends Error {}

export async function getUserOrThrow(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } }); if (!user) { throw new UserNotFoundError("..."); }
    if (!user) {
        throw new UserNotFoundError("Your user details are not found. Contact the administrator.");
    }
    return user;
}