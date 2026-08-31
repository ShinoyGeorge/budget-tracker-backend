import { Router } from "express";
import {authenticate} from "../middleware/authenticate";
import {requireAdmin} from "../middleware/admin";
import {
    approveHouseholdCreationController,
    listPendingHouseholdCreationRequestsController, rejectHouseholdCreationController
} from "../controller/admin.controller";


const router: Router = Router();

router.get("/household-creation-requests", authenticate, requireAdmin, listPendingHouseholdCreationRequestsController);
router.post("/household-creation-requests/:id/approve", authenticate, requireAdmin, approveHouseholdCreationController);
router.post("/household-creation-requests/:id/reject", authenticate, requireAdmin, rejectHouseholdCreationController);

export default router;