export interface SetBudgetInput {
    categoryId: string;
    amount: number;
    effectiveYear: number;
    effectiveMonth: number; // 1-12
}