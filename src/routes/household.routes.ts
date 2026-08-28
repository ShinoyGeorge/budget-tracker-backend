import {Router} from "express";
import {authenticate} from "../middleware/authenticate";
import {approveHouseholdJoinController, listHouseholdMembersController} from "../controller/household.controller";


const router = Router();

router.post("/join-requests/:id/approve", authenticate, approveHouseholdJoinController);
router.get("/members", authenticate, listHouseholdMembersController);

export default router;