import {Request, Response} from "express";
import {AuthenticatedUser} from "../types/express";
import {
    createGlobalCategory,
    createPersonalCategory,
    deleteCategory,
    listCategories,
    updateCategory
} from "../services/category.service";
import {CategoryNotFoundError, DuplicateCategoryError, InvalidPrivilegeError, UserNotFoundError} from "../errors";
import {handleControllerError} from "./errorHandler";

export async function listCategoriesController(req: Request, res: Response) {
    try {
        const categories = await listCategories(req.user as AuthenticatedUser);
        return res.status(200).json(categories);
    } catch (error) {
        return handleControllerError(error,
            res,
            [{ errorClass: UserNotFoundError, status: 404 }],
            "listCategoriesController"
        );
    }
}

export async function createGlobalCategoryController(req: Request, res: Response) {
    try {
        const category = await createGlobalCategory(req.body.name);
        return res.status(201).json(category);
    } catch (error) {
        return handleControllerError(error,
            res,
            [{ errorClass: DuplicateCategoryError, status: 409 }],
            "createGlobalCategoryController"
        );
    }
}

export async function createPersonalCategoryController(req: Request, res: Response) {
    try {
        const category = await createPersonalCategory(req.body.name, req.user as AuthenticatedUser);
        return res.status(201).json(category);
    } catch (error) {
        return handleControllerError(error,
            res,
            [
                { errorClass: UserNotFoundError, status: 404 },
                { errorClass: DuplicateCategoryError, status: 409 },
            ],
            "createPersonalCategoryController"
        );
    }
}

export async function updateCategoryController(req: Request, res: Response) {
    try {
        const category = await updateCategory(req.params.id as string, req.body.name, req.user as AuthenticatedUser);
        return res.status(200).json(category);
    } catch (error) {
        return handleControllerError(error,
            res,
            [
                { errorClass: CategoryNotFoundError, status: 404 },
                { errorClass: InvalidPrivilegeError, status: 403 },
                { errorClass: UserNotFoundError, status: 404 }
            ],
            "updateCategoryController"
        );
    }
}

export async function deleteCategoryController(req: Request, res: Response) {
    try {
        await deleteCategory(req.params.id as string, req.user as AuthenticatedUser);
        return res.status(200).json({ message: "Category deleted." });
    } catch (error) {
        return handleControllerError(error,
            res,
            [
                { errorClass: CategoryNotFoundError, status: 404 },
                { errorClass: InvalidPrivilegeError, status: 403 },
                { errorClass: UserNotFoundError, status: 404 }
            ],
            "deleteCategoryController"
        );
    }
}