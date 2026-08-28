import {Request, Response} from "express";
import {login, LoginResult, logout, refreshAccessToken, register} from "../services/auth.service";
import {
    EmailInUseError,
    HouseholdExistsError,
    HouseholdNotFoundError,
    InvalidCredentialsError, InvalidRefreshTokenError,
    PendingRequestError, UserNotFoundError
} from "../errors";
import {handleControllerError} from "./errorHandler";

export async function loginController(req: Request, res: Response) {
    try {
        let loginResult: LoginResult = await login(req.body.email, req.body.password)
        res.status(200).json({
            accessToken: loginResult.accessToken,
            refreshToken: loginResult.refreshToken,
            user: loginResult.user
        });
    } catch (error) {
        return handleControllerError(
            error,
            res,
            [ { errorClass: InvalidCredentialsError, status: 401 }],
            "loginController"
        );
    }
}


export async function registerController(req: Request, res: Response) {
    try {
        const registration = await register(req.body);
        res.status(201).json({ message: registration.message });
    } catch (error) {
        return handleControllerError(
            error,
            res,
            [
                { errorClass: EmailInUseError, status: 409 },
                { errorClass: PendingRequestError, status: 409 },
                { errorClass: HouseholdExistsError, status: 409 },
                { errorClass: HouseholdNotFoundError, status: 404 }
            ],
            "registerController"
        );
    }
}

export async function refreshController(req: Request, res: Response) {
    try {
        const result = await refreshAccessToken(req.body.refreshToken);
        return res.status(200).json(result);
    } catch (error) {
        return handleControllerError(
            error,
            res,
            [
                { errorClass: InvalidRefreshTokenError, status: 401 },
                { errorClass: UserNotFoundError, status: 404 }
            ],
            "refreshController"
        );
    }
}

export async function logoutController(req: Request, res: Response) {
    try {
        await logout(req.body.refreshToken);
        return res.status(200).json({ message: "Logged out." });
    } catch (error) {
        return handleControllerError(error, res, [], "logoutController"
        );
    }
}

