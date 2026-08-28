import { Response } from "express";
import {ErrorMapping} from "../types/errorHandler";

export function handleControllerError(
    error: unknown,
    res: Response,
    mappings: ErrorMapping[],
    actionName: string
) {
    for (const { errorClass, status } of mappings) {
        if (error instanceof errorClass) {
            return res.status(status).json({ error: (error as Error).message });
        }
    }
    console.error(`Unexpected error in ${actionName}:`, error);
    return res.status(500).json({ error: "Internal server error. Please contact the administrator." });
}