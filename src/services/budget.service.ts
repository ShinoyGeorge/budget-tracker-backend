import {PrismaClient} from "../generated/prisma/client";
import {PrismaPg} from "@prisma/adapter-pg";
import {getUserOrThrow} from "./user.service";
import {CategoryNotFoundError, InvalidPrivilegeError} from "../errors";
import {AuthenticatedUser} from "../types/express";
import {SetBudgetInput} from "../types/budget";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function assertCategoryAccessible(categoryId: string, householdId: string) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
        throw new CategoryNotFoundError("Category not found");
    }

    if (!category.isGlobal && category.householdId !== householdId) {
        throw new InvalidPrivilegeError("You do not have access to this category");
    }
}

export async function setBudget(input: SetBudgetInput, caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);
    await assertCategoryAccessible(input.categoryId, user.householdId);

    const existing = await prisma.budget.findFirst({
        where: {
            householdId: user.householdId,
            categoryId: input.categoryId,
            effectiveYear: input.effectiveYear,
            effectiveMonth: input.effectiveMonth,
        },
    });

    if (existing) {
        return prisma.budget.update({
            where: { id: existing.id },
            data: { amount: input.amount },
        });
    }

    return prisma.budget.create({
        data: {
            householdId: user.householdId,
            categoryId: input.categoryId,
            amount: input.amount,
            effectiveYear: input.effectiveYear,
            effectiveMonth: input.effectiveMonth,
        },
    });
}

async function getEffectiveBudget(householdId: string, categoryId: string, year: number, month: number) {
    return prisma.budget.findFirst({
        where: {
            householdId,
            categoryId,
            OR: [
                { effectiveYear: { lt: year } },
                { effectiveYear: year, effectiveMonth: { lte: month } },
            ],
        },
        orderBy: [{ effectiveYear: "desc" }, { effectiveMonth: "desc" }],
    });
}

export async function getBudgetSummary(year: number, month: number, caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);

    const categories = await prisma.category.findMany({
        where: { OR: [{ isGlobal: true }, { householdId: user.householdId }] },
    });

    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1));

    const summaries = await Promise.all(
        categories.map(async (category) => {
            const budget = await getEffectiveBudget(user.householdId, category.id, year, month);
            if (!budget) {
                return null;
            }

            const spendResult = await prisma.transaction.aggregate({
                where: {
                    categoryId: category.id,
                    type: "EXPENSE",
                    account: { householdId: user.householdId },
                    date: { gte: monthStart, lt: monthEnd },
                },
                _sum: { amount: true },
            });

            return {
                categoryId: category.id,
                categoryName: category.name,
                budgetAmount: budget.amount,
                actualSpend: spendResult._sum.amount ?? 0,
            };
        })
    );

    return summaries.filter((s) => s !== null);
}