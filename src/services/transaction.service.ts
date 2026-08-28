import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getUserOrThrow } from "./user.service";
import { TransactionNotFoundError, InvalidPrivilegeError, AccountNotFoundError } from "../errors";
import { AuthenticatedUser } from "../types/express";
import { TransactionType } from "../generated/prisma/enums";
import {CreateTransactionInput, ListTransactionsFilters, UpdateTransactionInput} from "../types/transaction";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function getOwnedAccountOrThrow(accountId: string, householdId: string) {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) {
        throw new AccountNotFoundError("Account not found");
    }
    if (account.householdId !== householdId) {
        throw new InvalidPrivilegeError("You do not have access to this account");
    }
    return account;
}

export async function createTransaction(input: CreateTransactionInput, caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);
    await getOwnedAccountOrThrow(input.accountId, user.householdId);

    return prisma.transaction.create({
        data: {
            type: input.type as TransactionType,
            amount: input.amount,
            date: new Date(input.date),
            description: input.description,
            accountId: input.accountId,
            categoryId: input.categoryId ?? null,
            userId: user.id,
        },
    });
}

export async function listTransactions(filters: ListTransactionsFilters, caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);

    return prisma.transaction.findMany({
        where: {
            account: { householdId: user.householdId },
            ...(filters.accountId && { accountId: filters.accountId }),
            ...(filters.category && { categoryId: filters.category }),
            ...(filters.type && { type: filters.type as TransactionType }),
            ...(filters.dateMin || filters.dateMax
                ? {
                    date: {
                        ...(filters.dateMin && { gte: new Date(filters.dateMin) }),
                        ...(filters.dateMax && { lte: new Date(filters.dateMax) }),
                    },
                }
                : {}),
        },
        orderBy: { date: "desc" },
        include: {
            user: { select: { name: true } },
            category: { select: { name: true } },
            account: { select: { name: true, accountType: true, institution: true } },
        },
    });
}

export async function deleteTransaction(transactionId: string, caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);

    const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction) {
        throw new TransactionNotFoundError("Transaction not found");
    }

    const account = await prisma.account.findUnique({ where: { id: transaction.accountId } });
    if (!account || account.householdId !== user.householdId) {
        throw new InvalidPrivilegeError("You do not have access to this transaction");
    }

    if (transaction.type === "TRANSFER" && transaction.transferPairId) {
        await prisma.$transaction([
            prisma.recurringBillPayment.deleteMany({ where: { transactionId: transaction.id } }),
            prisma.recurringBillPayment.deleteMany({ where: { transactionId: transaction.transferPairId } }),
            prisma.transaction.delete({ where: { id: transaction.id } }),
            prisma.transaction.delete({ where: { id: transaction.transferPairId } }),
        ]);
        return;
    }

    await prisma.$transaction([
        prisma.recurringBillPayment.deleteMany({ where: { transactionId } }),
        prisma.transaction.delete({ where: { id: transactionId } }),
    ]);
}

export async function updateTransaction(transactionId: string, input: UpdateTransactionInput, caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);

    const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction) {
        throw new TransactionNotFoundError("Transaction not found");
    }

    const account = await prisma.account.findUnique({ where: { id: transaction.accountId } });
    if (!account || account.householdId !== user.householdId) {
        throw new InvalidPrivilegeError("You do not have access to this transaction");
    }

    if (transaction.type === "TRANSFER") {
        throw new InvalidPrivilegeError("Transfer transactions cannot be edited directly");
    }

    // if accountId is being changed, verify the new account also belongs to this household
    if (input.accountId && input.accountId !== transaction.accountId) {
        const newAccount = await prisma.account.findUnique({ where: { id: input.accountId } });
        if (!newAccount || newAccount.householdId !== user.householdId) {
            throw new InvalidPrivilegeError("You do not have access to the target account");
        }
    }

    return prisma.transaction.update({
        where: { id: transactionId },
        data: {
            ...(input.amount !== undefined && { amount: input.amount }),
            ...(input.date && { date: new Date(input.date) }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
            ...(input.accountId && { accountId: input.accountId }),
        },
    });
}

export async function getTransactionSummary(year: number, month: number, caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);

    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1));

    const [incomeResult, expenseResult] = await Promise.all([
        prisma.transaction.aggregate({
            where: { type: "INCOME", account: { householdId: user.householdId }, date: { gte: monthStart, lt: monthEnd } },
            _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
            where: { type: "EXPENSE", account: { householdId: user.householdId }, date: { gte: monthStart, lt: monthEnd } },
            _sum: { amount: true },
        }),
    ]);

    const income = Number(incomeResult._sum.amount ?? 0);
    const expenses = Number(expenseResult._sum.amount ?? 0);

    return { income, expenses, net: income - expenses };
}