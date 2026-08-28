import {Request, Response} from "express";
import {
    createAccount,
    getAccountById,
    listAccounts,
    updateAccount,
} from "../services/account.service";
import {AuthenticatedUser} from "../types/express";
import {AccountNotFoundError, InvalidPrivilegeError, UserNotFoundError} from "../errors";
import {handleControllerError} from "./errorHandler";
import {CreateAccountInput, UpdateAccountInput} from "../types/account";

export async function createAccountController(req: Request, res: Response) {
    try {
        const newAccount = await createAccount(req.body as CreateAccountInput, req.user as AuthenticatedUser);
        return res.status(201).json({ id: newAccount.id });
    } catch (error) {
        return handleControllerError(
            error,
            res,
            [{ errorClass: UserNotFoundError, status: 404 }],
            "createAccountController");
    }
}

export async function getAccountByIdController(req: Request, res: Response) {
    try {
        const account = await getAccountById(req.params.id as string, req.user as AuthenticatedUser);
        return res.status(200).json(account);
    } catch (error) {
        return handleControllerError(error,
            res,
            [
                { errorClass: AccountNotFoundError, status: 404 },
                { errorClass: InvalidPrivilegeError, status: 403 },
                { errorClass: UserNotFoundError, status: 404 }],
            "getAccountByIdController"
        );
    }
}

export async function listAccountController(req: Request, res: Response) {
    try {
        const accounts = await listAccounts(req.user as AuthenticatedUser);
        return res.status(200).json(accounts);
    } catch (error) {
        return handleControllerError(error,
            res,
            [{ errorClass: UserNotFoundError, status: 404 }],
            "listAccountController"
        );
    }
}

export async function updateAccountController(req: Request, res: Response) {
    try {
        const updated = await updateAccount(req.params.id as string, req.body as UpdateAccountInput, req.user as AuthenticatedUser);
        return res.status(200).json(updated);
    } catch (error) {
        return handleControllerError(error,
            res,
            [
                { errorClass: AccountNotFoundError, status: 404 },
                { errorClass: InvalidPrivilegeError, status: 403 },
                { errorClass: UserNotFoundError, status: 404 }],
            "updateAccountController"
        );
    }
}