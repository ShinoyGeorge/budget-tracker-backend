import { Request, Response } from "express";
import { AuthenticatedUser } from "../types/express";
import { createTransfer } from "../services/transfer.service";
import {AccountNotFoundError, InvalidPrivilegeError, TransactionNotFoundError, UserNotFoundError} from "../errors";
import {handleControllerError} from "./errorHandler";

export async function createTransferController(req: Request, res: Response) {
    try {
        const result = await createTransfer(req.body, req.user as AuthenticatedUser);
        return res.status(201).json(result);
    } catch (error) {
        return handleControllerError(error,
            res,
            [
                { errorClass: AccountNotFoundError, status: 404 },
                { errorClass: InvalidPrivilegeError, status: 403 },
                { errorClass: UserNotFoundError, status: 404 }
            ],
            "createTransferController"
        );
    }
}