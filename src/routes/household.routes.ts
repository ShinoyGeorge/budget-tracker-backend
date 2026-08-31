import {Router} from "express";
import {authenticate} from "../middleware/authenticate";
import {
    approveHouseholdJoinController,
    listHouseholdMembersController,
    listPendingJoinRequestsController, rejectHouseholdJoinController
} from "../controller/household.controller";


const router = Router();

router.post("/join-requests/:id/approve", authenticate, approveHouseholdJoinController);
router.get("/members", authenticate, listHouseholdMembersController);
router.get("/join-requests", authenticate, listPendingJoinRequestsController);
router.post("/join-requests/:id/reject", authenticate, rejectHouseholdJoinController);

export default router;