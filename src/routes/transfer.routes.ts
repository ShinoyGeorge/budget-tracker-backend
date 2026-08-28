import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { createTransferController } from "../controller/transfer.controller";

const router = Router();
router.post("/", authenticate, createTransferController);
export default router;