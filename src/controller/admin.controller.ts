import {Request, Response} from "express";
import {approveHouseholdCreation} from "../services/auth.service";
import {HouseholdCreationRequestNotFoundError} from "../errors";
import {handleControllerError} from "./errorHandler";

export async function approveHouseholdCreationController(req: Request, res: Response) {
    try {
        await approveHouseholdCreation(req.params.id as string);
        return res.status(200).json({ message: "Household creation request approved." });
    } catch (error) {
        return handleControllerError(
            error,
            res,
            [ { errorClass: HouseholdCreationRequestNotFoundError, status: 404 }],
            "approveHouseholdCreationController"
        );
    }
}