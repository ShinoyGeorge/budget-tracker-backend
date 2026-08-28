import { Response } from "express";

interface ErrorMapping {
    errorClass: new (...args: any[]) => Error;
    status: number;
}

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