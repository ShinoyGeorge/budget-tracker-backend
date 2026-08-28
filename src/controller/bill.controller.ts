import {Request, Response} from "express";
import {AuthenticatedUser} from "../types/express";
import {createBill, deleteBill, listBills, logBillPayment, updateBill} from "../services/bill.service";
import {
    AccountNotFoundError, CategoryNotFoundError, InvalidPrivilegeError,
    RecurringBillNotFoundError, UserNotFoundError
} from "../errors";
import {handleControllerError} from "./errorHandler";

export async function createBillController(req: Request, res: Response) {
    try {
        const bill = await createBill(req.body, req.user as AuthenticatedUser);
        return res.status(201).json(bill);
    } catch (error) {
        return handleBillError(error, res, "createBillController");
    }
}

export async function listBillsController(req: Request, res: Response) {
    try {
        const bills = await listBills(req.user as AuthenticatedUser);
        return res.status(200).json(bills);
    } catch (error) {
        return handleBillError(error, res, "listBillsController");
    }
}

export async function updateBillController(req: Request, res: Response) {
    try {
        const bill = await updateBill(req.params.id as string, req.body, req.user as AuthenticatedUser);
        return res.status(200).json(bill);
    } catch (error) {
        return handleBillError(error, res, "updateBillController");
    }
}

export async function deleteBillController(req: Request, res: Response) {
    try {
        await deleteBill(req.params.id as string, req.user as AuthenticatedUser);
        return res.status(200).json({ message: "Recurring bill deleted." });
    } catch (error) {
        return handleBillError(error, res, "deleteBillController");
    }
}

function handleBillError(error: unknown, res: Response, action: string) {
    return handleControllerError(error, res, [
        { errorClass: AccountNotFoundError, status: 404 },
        { errorClass: CategoryNotFoundError, status: 404 },
        { errorClass: InvalidPrivilegeError, status: 403 },
        { errorClass: UserNotFoundError, status: 404 },
    ], action);
}

export async function logBillPaymentController(req: Request, res: Response) {
    try {
        const payment = await logBillPayment(req.params.id as string, req.body.transactionId, req.user as AuthenticatedUser);
        return res.status(201).json(payment);
    } catch (error) {
        return handleControllerError(error, res, [
            { errorClass: RecurringBillNotFoundError, status: 404 },
            { errorClass: InvalidPrivilegeError, status: 403 },
            { errorClass: UserNotFoundError, status: 404 },
        ], "logBillPaymentController");
    }
}