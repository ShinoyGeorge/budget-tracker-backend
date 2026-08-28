export interface CreateBillInput {
    accountId: string;
    categoryId?: string;
    description: string;
    amount: number;
    dayOfMonth: number;
}

export interface UpdateBillInput {
    description?: string;
    amount?: number;
    dayOfMonth?: number;
    accountId?: string;
    categoryId?: string;
}