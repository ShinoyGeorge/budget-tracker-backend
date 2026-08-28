import {AuthenticatedUser} from "../types/express";
import {PrismaClient, TransactionType} from "../generated/prisma/client";
import {PrismaPg} from "@prisma/adapter-pg";
import {getUserOrThrow} from "./user.service";
import {AccountNotFoundError, InvalidPrivilegeError} from "../errors";
import {CreateAccountInput, UpdateAccountInput} from "../types/account";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function createAccount(input: CreateAccountInput, creator: AuthenticatedUser) {
    const { name, accountType, startingBalance, institution } = input;

    const user = await getUserOrThrow(creator.sub);
    return await prisma.$transaction(async (tx) => {
        const account = await tx.account.create({
            data: {
                name,
                accountType: accountType.toUpperCase(),
                householdId: user.householdId,
                institution: institution ?? null
            }
        });

        await tx.transaction.create({
            data: {
                type: TransactionType.INCOME,
                amount: startingBalance,
                date: new Date(),
                accountId: account.id,
                description: "Initial Balance",
                userId: user.id
            }
        });

        return account;
    });
}

export async function getAccountById(accountId: string, caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) {
        throw new AccountNotFoundError("Account not found");
    }
    if (account.householdId !== user.householdId) {
        throw new InvalidPrivilegeError("You do not have access to this account");
    }
    return account;
}

export async function listAccounts(caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);
    return prisma.account.findMany(
        { where: {householdId: user.householdId }
    });
}

export async function updateAccount(accountId: string, input: UpdateAccountInput, caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);

    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) {
        throw new AccountNotFoundError("Account not found");
    }
    if (account.householdId !== user.householdId) {
        throw new InvalidPrivilegeError("You do not have access to this account");
    }

    return prisma.account.update({
        where: { id: accountId },
        data: input,
    });
}