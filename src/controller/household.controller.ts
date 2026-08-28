import {Request, Response} from "express";
import {approveHouseholdJoin} from "../services/auth.service";
import {AuthenticatedUser} from "../types/express";
import {HouseholdJoinRequestNotFoundError, InvalidPrivilegeError, UserNotFoundError} from "../errors";
import {handleControllerError} from "./errorHandler";
import {listHouseholdMembers} from "../services/household.service";

export async function approveHouseholdJoinController(req: Request, res: Response) {
    try {
        await approveHouseholdJoin(req.params.id as string, req.user as AuthenticatedUser);
        return res.status(200).json({ message: "Household join request approved." });
    } catch (error) {
        return handleControllerError(
            error,
            res,
            [
                { errorClass: HouseholdJoinRequestNotFoundError, status: 404 },
                { errorClass: InvalidPrivilegeError, status: 403 },
                { errorClass: UserNotFoundError, status: 404 }
            ],
            "approveHouseholdCreationController"
        );
    }
}

export async function listHouseholdMembersController(req: Request, res: Response) {
    try {
        const members = await listHouseholdMembers(req.user as AuthenticatedUser);
        return res.status(200).json(members);
    } catch (error) {
        return handleControllerError(error, res, [
            { errorClass: UserNotFoundError, status: 404 },
        ], "listHouseholdMembersController");
    }
}