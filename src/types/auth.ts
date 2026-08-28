export interface LoginResult {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        role: string;
        householdName: string;
    };
}

export interface RegisterInput {
    name: string;
    email: string;
    password: string;
    isNewHouseHold: boolean;
    householdName: string;
}