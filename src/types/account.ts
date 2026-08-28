export interface CreateAccountInput {
    name: string;
    accountType: string;
    institution?: string;
    startingBalance: number;
}

export interface UpdateAccountInput {
    name?: string;
    accountType?: string;
    institution?: string;
}