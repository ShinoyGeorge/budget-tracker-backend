import {Request, Response} from "express";
import {HouseholdCreationRequestNotFoundError} from "../errors";
import {handleControllerError} from "./errorHandler";
import {
    approveHouseholdCreation,
    listPendingHouseholdCreationRequests,
    rejectHouseholdCreation
} from "../services/admin.service";

export async function listPendingHouseholdCreationRequestsController(req: Request, res: Response) {
    try {
        const requests = await listPendingHouseholdCreationRequests();
        return res.status(200).json(requests);
    } catch (error) {
        return handleControllerError(error, res, [], "listPendingHouseholdCreationRequestsController");
    }
}

export async function approveHouseholdCreationController(req: Request, res: Response) {
    try {
        await approveHouseholdCreation(req.params.id as string);
        return res.status(200).json({ message: "Household creation request approved." });
    } catch (error) {
        return handleControllerError(error, res, [
            { errorClass: HouseholdCreationRequestNotFoundError, status: 404 },
        ], "approveHouseholdCreationController");
    }
}

export async function rejectHouseholdCreationController(req: Request, res: Response) {
    try {
        await rejectHouseholdCreation(req.params.id as string);
        return res.status(200).json({ message: "Request rejected." });
    } catch (error) {
        return handleControllerError(error, res, [
            { errorClass: HouseholdCreationRequestNotFoundError, status: 404 },
        ], "rejectHouseholdCreationController");
    }
}
