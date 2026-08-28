import {Router} from "express";
import {authenticate} from "../middleware/authenticate";
import {
    createAccountController,
    getAccountByIdController,
    listAccountController, updateAccountController
} from "../controller/account.controller";

const router: Router = Router();

router.get("/:id", authenticate, getAccountByIdController);
router.put("/:id", authenticate, updateAccountController);
router.patch("/:id", authenticate, updateAccountController);

router.get("/", authenticate, listAccountController);
router.post("/", authenticate, createAccountController);

export default router;