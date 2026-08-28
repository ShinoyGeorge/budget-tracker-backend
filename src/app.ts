import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

import accountRoutes from "./routes/account.routes";
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import billRoutes from "./routes/bill.routes";
import budgetRoutes from "./routes/budget.routes";
import categoryRoutes from "./routes/category.routes";
import houseHoldRoutes from "./routes/household.routes";
import transactionRoutes from "./routes/transaction.routes";
import transferRoutes from "./routes/transfer.routes";

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173" }));
app.use("/api/accounts", accountRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/households", houseHoldRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/transfers", transferRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});