export interface AuthenticatedUser {
    sub: string;
    role: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
        }
    }
}