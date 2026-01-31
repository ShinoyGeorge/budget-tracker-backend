import { Request, Response } from "express";
import {getUsers, User} from "./user.service";

export const fetchUsers = (request: Request, response: Response) => {
    try {
        const users: User[] = getUsers();
        return response.status(200).json(users);
    } catch (e) {
        return response.status(500).json({error: (e as Error).message});
    }
}