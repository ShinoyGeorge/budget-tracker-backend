import { Router } from "express";
import {authenticate} from "../middleware/authenticate";
import {requireAdmin} from "../middleware/admin";
import {approveHouseholdCreationController} from "../controller/admin.controller";


const router: Router = Router();

router.post("/household-creation-requests/:id/approve", authenticate, requireAdmin, approveHouseholdCreationController);

export default router;