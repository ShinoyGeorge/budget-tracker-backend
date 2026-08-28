import {NextFunction, Request, Response} from "express";
import jwt, {TokenExpiredError} from "jsonwebtoken";
import {AuthenticatedUser} from "../types/express";
export function authenticate(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const token: string = authHeader.split(" ")[1];
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET as string) as AuthenticatedUser;
    } catch (error) {
        if (error instanceof TokenExpiredError) {
            return res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
        }
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}