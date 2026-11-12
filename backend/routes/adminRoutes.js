import { Router } from "express";
import {
  createRole,
  createUser,
  listAudit,
  listRoles,
  listUsers,
  removeRole,
  updateRole,
  updateUser,
} from "../controllers/adminController.js";
import { requireAuth, requireRole, requireTeamOwner } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";

const router = Router();
router.use(requireAuth, requireRole("admin"), asyncHandler(requireTeamOwner));
router.get("/roles", asyncHandler(listRoles));
router.post("/roles", asyncHandler(createRole));
router.patch("/roles/:key", asyncHandler(updateRole));
router.delete("/roles/:key", asyncHandler(removeRole));
router.get("/users", asyncHandler(listUsers));
router.post("/users", asyncHandler(createUser));
router.patch("/users/:id", asyncHandler(updateUser));
router.get("/audit", asyncHandler(listAudit));
export default router;
