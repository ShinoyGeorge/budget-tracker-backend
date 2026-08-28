interface CreateTransactionInput {
    accountId: string;
    type: "INCOME" | "EXPENSE";
    amount: number;
    date: string;
    description?: string;
    categoryId?: string;
}

interface ListTransactionsFilters {
    accountId?: string;
    category?: string; // categoryId
    type?: string;
    dateMin?: string;
    dateMax?: string;
}

interface UpdateTransactionInput {
    amount?: number;
    date?: string;
    description?: string;
    categoryId?: string;
    accountId?: string;
}

export {
    CreateTransactionInput,
    ListTransactionsFilters,
    UpdateTransactionInput,
}