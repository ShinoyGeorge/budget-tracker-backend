import {NextFunction, Request, Response} from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).send('Access denied');
    }
    next();
}