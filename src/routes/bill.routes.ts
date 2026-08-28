import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import {
    createBillController, listBillsController, updateBillController, deleteBillController,
    logBillPaymentController
} from "../controller/bill.controller";

const router = Router();
router.get("/", authenticate, listBillsController);
router.post("/", authenticate, createBillController);
router.put("/:id", authenticate, updateBillController);
router.patch("/:id", authenticate, updateBillController);
router.delete("/:id", authenticate, deleteBillController);
router.post("/:id/payments", authenticate, logBillPaymentController);
export default router;