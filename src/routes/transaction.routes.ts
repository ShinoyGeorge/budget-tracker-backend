import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import {
    createTransactionController, listTransactionsController, deleteTransactionController,
    updateTransactionController, getTransactionSummaryController
} from "../controller/transaction.controller";

const router = Router();

router.get("/", authenticate, listTransactionsController);
router.get("/summary", authenticate, getTransactionSummaryController);
router.post("/", authenticate, createTransactionController);
router.put("/:id", authenticate, updateTransactionController);
router.patch("/:id", authenticate, updateTransactionController);
router.delete("/:id", authenticate, deleteTransactionController);

export default router;