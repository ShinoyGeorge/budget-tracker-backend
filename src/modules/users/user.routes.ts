import {Router} from "express";
import {fetchUsers} from "./user.controller";

const router: Router = Router();

router.get('/', fetchUsers);

export default router;