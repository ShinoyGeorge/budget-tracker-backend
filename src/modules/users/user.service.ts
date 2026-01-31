export interface User {
    id: number;
    name: string;
    email: string;
}

export const getUsers = (): User[] => {
    return [
        { id: 1, name: "Test User", email: "test@example.com" }
    ];
};