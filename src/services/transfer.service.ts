import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getUserOrThrow } from "./user.service";
import { AccountNotFoundError, InvalidPrivilegeError } from "../errors";
import { AuthenticatedUser } from "../types/express";
import { TransactionType } from "../generated/prisma/enums";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function createTransfer(input: CreateTransferInput, caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);

    const [fromAccount, toAccount] = await Promise.all([
        prisma.account.findUnique({ where: { id: input.fromAccountId } }),
        prisma.account.findUnique({ where: { id: input.toAccountId } }),
    ]);

    if (!fromAccount || !toAccount) {
        throw new AccountNotFoundError("One or both accounts were not found");
    }
    if (fromAccount.householdId !== user.householdId || toAccount.householdId !== user.householdId) {
        throw new InvalidPrivilegeError("You do not have access to one or both of these accounts");
    }

    return prisma.$transaction(async (tx) => {
        const outTransaction = await tx.transaction.create({
            data: {
                type: TransactionType.TRANSFER,
                amount: input.amount,
                date: new Date(input.date),
                description: input.description ?? "Transfer out",
                accountId: input.fromAccountId,
                userId: user.id,
                transferFromAccountId: input.fromAccountId,
                transferToAccountId: input.toAccountId,
            },
        });

        const inTransaction = await tx.transaction.create({
            data: {
                type: TransactionType.TRANSFER,
                amount: input.amount,
                date: new Date(input.date),
                description: input.description ?? "Transfer in",
                accountId: input.toAccountId,
                userId: user.id,
                transferFromAccountId: input.fromAccountId,
                transferToAccountId: input.toAccountId,
                transferPairId: outTransaction.id,
            },
        });

        const updatedOutTransaction = await tx.transaction.update({
            where: { id: outTransaction.id },
            data: { transferPairId: inTransaction.id },
        });

        return { out: updatedOutTransaction, in: inTransaction };
    });
}