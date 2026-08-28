import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getUserOrThrow } from "./user.service";
import { AccountNotFoundError, InvalidPrivilegeError, RecurringBillNotFoundError, CategoryNotFoundError } from "../errors";
import { AuthenticatedUser } from "../types/express";
import {CreateBillInput, UpdateBillInput} from "../types/bill";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function assertOwnedAccount(accountId: string, householdId: string) {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new AccountNotFoundError("Account not found");
    if (account.householdId !== householdId) throw new InvalidPrivilegeError("You do not have access to this account");
}

async function assertOwnedCategory(categoryId: string, householdId: string) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new CategoryNotFoundError("Category not found");
    if (!category.isGlobal && category.householdId !== householdId) {
        throw new InvalidPrivilegeError("You do not have access to this category");
    }
}

export async function createBill(input: CreateBillInput, caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);
    await assertOwnedAccount(input.accountId, user.householdId);
    if (input.categoryId) await assertOwnedCategory(input.categoryId, user.householdId);

    return prisma.recurringBill.create({
        data: {
            householdId: user.householdId,
            accountId: input.accountId,
            categoryId: input.categoryId ?? null,
            description: input.description,
            amount: input.amount,
            dayOfMonth: input.dayOfMonth,
            createdByUserId: user.id,
        },
    });
}

export async function listBills(caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);
    const now = new Date();

    const bills = await prisma.recurringBill.findMany({
        where: { householdId: user.householdId },
        include: {
            account: { select: { name: true, accountType: true, institution: true } },
            category: { select: { name: true } },
            recurringBillPayments: {
                where: { year: now.getFullYear(), month: now.getMonth() + 1 },
            },
        },
    });

    return bills.map(({ recurringBillPayments, ...bill }) => ({
        ...bill,
        isPaidThisMonth: recurringBillPayments.length > 0,
        currentMonthTransactionId: recurringBillPayments[0]?.transactionId ?? null,
    }));
}

async function getOwnedBillOrThrow(billId: string, householdId: string) {
    const bill = await prisma.recurringBill.findUnique({ where: { id: billId } });
    if (!bill) throw new RecurringBillNotFoundError("Recurring bill not found");
    if (bill.householdId !== householdId) throw new InvalidPrivilegeError("You do not have access to this bill");
    return bill;
}

export async function updateBill(billId: string, input: UpdateBillInput, caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);
    await getOwnedBillOrThrow(billId, user.householdId);
    if (input.accountId) await assertOwnedAccount(input.accountId, user.householdId);
    if (input.categoryId) await assertOwnedCategory(input.categoryId, user.householdId);

    return prisma.recurringBill.update({ where: { id: billId }, data: input });
}

export async function deleteBill(billId: string, caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);
    await getOwnedBillOrThrow(billId, user.householdId);

    await prisma.$transaction([
        prisma.recurringBillPayment.deleteMany({ where: { recurringBillId: billId } }),
        prisma.recurringBill.delete({ where: { id: billId } }),
    ]);
}

export async function logBillPayment(billId: string, transactionId: string, caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);
    const bill = await prisma.recurringBill.findUnique({ where: { id: billId } });
    if (!bill) throw new RecurringBillNotFoundError("Recurring bill not found");
    if (bill.householdId !== user.householdId) throw new InvalidPrivilegeError("You do not have access to this bill");

    const now = new Date();
    return prisma.recurringBillPayment.create({
        data: {
            recurringBillId: billId,
            transactionId,
            year: now.getFullYear(),
            month: now.getMonth() + 1,
        },
    });
}