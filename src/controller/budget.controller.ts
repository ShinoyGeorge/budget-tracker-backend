import {Request, Response} from "express";
import {AuthenticatedUser} from "../types/express";
import {getBudgetSummary, setBudget} from "../services/budget.service";
import {CategoryNotFoundError, InvalidPrivilegeError, UserNotFoundError} from "../errors";
import {handleControllerError} from "./errorHandler";

export async function setBudgetController(req: Request, res: Response) {
    try {
        const budget = await setBudget(req.body, req.user as AuthenticatedUser);
        return res.status(201).json(budget);
    } catch (error) {
        return handleControllerError(error,
            res,
            [
                { errorClass: CategoryNotFoundError, status: 404 },
                { errorClass: InvalidPrivilegeError, status: 403 },
                { errorClass: UserNotFoundError, status: 404 }
            ],
            "setBudgetController"
        );
    }
}

export async function getBudgetSummaryController(req: Request, res: Response) {
    try {
        const year = parseInt(req.query.year as string, 10);
        const month = parseInt(req.query.month as string, 10);
        const summary = await getBudgetSummary(year, month, req.user as AuthenticatedUser);
        return res.status(200).json(summary);
    } catch (error) {
        return handleControllerError(error,
            res,
            [{ errorClass: UserNotFoundError, status: 404 }],
            "getBudgetSummaryController"
        );
    }
}