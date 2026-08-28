import { Request, Response } from "express";
import { AuthenticatedUser } from "../types/express";
import {
    createTransaction,
    listTransactions,
    deleteTransaction,
    updateTransaction, getTransactionSummary
} from "../services/transaction.service";
import {
    TransactionNotFoundError, InvalidPrivilegeError, AccountNotFoundError, UserNotFoundError,
    CategoryNotFoundError
} from "../errors";
import {handleControllerError} from "./errorHandler";

export async function createTransactionController(req: Request, res: Response) {
    try {
        const transaction = await createTransaction(req.body, req.user as AuthenticatedUser);
        return res.status(201).json(transaction);
    } catch (error) {
        return handleControllerError(error,
            res,
            [
                { errorClass: AccountNotFoundError, status: 404 },
                { errorClass: InvalidPrivilegeError, status: 403 },
                { errorClass: UserNotFoundError, status: 404 }
            ],
            "createTransactionController"
        );
    }
}

export async function listTransactionsController(req: Request, res: Response) {
    try {
        const transactions = await listTransactions(req.query, req.user as AuthenticatedUser);
        return res.status(200).json(transactions);
    } catch (error) {
        return handleControllerError(error,
            res,
            [{ errorClass: UserNotFoundError, status: 404 }],
            "listTransactionsController"
        );
    }
}

export async function deleteTransactionController(req: Request, res: Response) {
    try {
        await deleteTransaction(req.params.id as string, req.user as AuthenticatedUser);
        return res.status(200).json({ message: "Transaction deleted." });
    } catch (error) {
        return handleControllerError(error,
            res,
            [
                { errorClass: TransactionNotFoundError, status: 404 },
                    { errorClass: InvalidPrivilegeError, status: 403 },
                { errorClass: UserNotFoundError, status: 404 }
            ],
            "deleteTransactionController"
        );
    }
}

export async function updateTransactionController(req: Request, res: Response) {
    try {
        const transaction = await updateTransaction(req.params.id as string, req.body, req.user as AuthenticatedUser);
        return res.status(200).json(transaction);
    } catch (error) {
        return handleControllerError(error, res, [
            { errorClass: TransactionNotFoundError, status: 404 },
            { errorClass: InvalidPrivilegeError, status: 403 },
            { errorClass: UserNotFoundError, status: 404 },
        ], "updateTransactionController");
    }
}

export async function getTransactionSummaryController(req: Request, res: Response) {
    try {
        const year = parseInt(req.query.year as string, 10);
        const month = parseInt(req.query.month as string, 10);
        const summary = await getTransactionSummary(year, month, req.user as AuthenticatedUser);
        return res.status(200).json(summary);
    } catch (error) {
        return handleControllerError(error, res, [
            { errorClass: UserNotFoundError, status: 404 },
        ], "getTransactionSummaryController");
    }
}