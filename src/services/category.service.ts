import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getUserOrThrow } from "./user.service";
import {CategoryNotFoundError, DuplicateCategoryError, InvalidPrivilegeError} from "../errors";
import { AuthenticatedUser } from "../types/express";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function listCategories(caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);
    return prisma.category.findMany({
        where: {
            OR: [{ isGlobal: true }, { householdId: user.householdId }],
        },
    });
}

export async function createGlobalCategory(name: string) {
    const existing = await prisma.category.findFirst({
        where: {
            isGlobal: true,
            name: { equals: name, mode: "insensitive" },
        },
    });
    if (existing) {
        throw new DuplicateCategoryError(`A global category named "${name}" already exists`);
    }

    return prisma.category.create({
        data: { name, isGlobal: true, householdId: null },
    });
}

export async function createPersonalCategory(name: string, caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);

    const existing = await prisma.category.findFirst({
        where: {
            householdId: user.householdId,
            name: { equals: name, mode: "insensitive" },
        },
    });
    if (existing) {
        throw new DuplicateCategoryError(`A category named "${name}" already exists`);
    }

    return prisma.category.create({
        data: { name, isGlobal: false, householdId: user.householdId },
    });
}

async function getOwnedCategoryOrThrow(categoryId: string, caller: AuthenticatedUser) {
    const user = await getUserOrThrow(caller.sub);
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
        throw new CategoryNotFoundError("Category not found");
    }
    if (category.isGlobal) {
        if (caller.role !== "ADMIN") {
            throw new InvalidPrivilegeError("Only the administrator can modify global categories");
        }
    } else if (category.householdId !== user.householdId) {
        throw new InvalidPrivilegeError("You do not have access to this category");
    }
    return category;
}

export async function updateCategory(categoryId: string, name: string, caller: AuthenticatedUser) {
    await getOwnedCategoryOrThrow(categoryId, caller);
    return prisma.category.update({ where: { id: categoryId }, data: { name } });
}

export async function deleteCategory(categoryId: string, caller: AuthenticatedUser) {
    await getOwnedCategoryOrThrow(categoryId, caller);
    return prisma.category.delete({ where: { id: categoryId } });
}