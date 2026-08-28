import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireAdmin } from "../middleware/admin";
import {
    listCategoriesController,
    createGlobalCategoryController,
    createPersonalCategoryController,
    updateCategoryController,
    deleteCategoryController,
} from "../controller/category.controller";

const router = Router();

router.get("/", authenticate, listCategoriesController);
router.post("/", authenticate, createPersonalCategoryController);
router.post("/global", authenticate, requireAdmin, createGlobalCategoryController);
router.put("/:id", authenticate, updateCategoryController);
router.patch("/:id", authenticate, updateCategoryController);
router.delete("/:id", authenticate, deleteCategoryController);

export default router;