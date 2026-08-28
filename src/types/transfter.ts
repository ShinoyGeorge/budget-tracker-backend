interface CreateTransferInput {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    description?: string;
}