import { Router } from "express";
import {loginController, logoutController, refreshController, registerController} from "../controller/auth.controller"

const router: Router = Router();

router.post("/login", loginController);
router.post("/register", registerController);
router.post("/refresh", refreshController);
router.post("/logout", logoutController);

export default router;