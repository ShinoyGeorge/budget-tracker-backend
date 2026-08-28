import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { setBudgetController, getBudgetSummaryController } from "../controller/budget.controller";

const router = Router();
router.post("/", authenticate, setBudgetController);
router.get("/summary", authenticate, getBudgetSummaryController);
export default router;