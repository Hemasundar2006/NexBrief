import { Router } from "express";
import {
  archive,
  create,
  get,
  importMany,
  list,
  update,
} from "../controllers/leadController.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";

const router = Router();
router.use(requireAuth);
router.get("/", requirePermission("leads:read"), asyncHandler(list));
router.post("/", requirePermission("leads:write"), asyncHandler(create));
router.post(
  "/import",
  requirePermission("leads:write"),
  asyncHandler(importMany),
);
router.get("/:id", requirePermission("leads:read"), asyncHandler(get));
router.patch("/:id", requirePermission("leads:write"), asyncHandler(update));
router.delete("/:id", requirePermission("leads:write"), asyncHandler(archive));
export default router;
