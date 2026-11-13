import { Router } from "express";
import {
  login,
  changePassword,
  logout,
  logoutAll,
  me,
  refresh,
  register,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { rateLimit } from "../middleware/security.js";

const router = Router();
router.post("/register", rateLimit(8, 900000), asyncHandler(register));
router.post("/login", rateLimit(12, 900000), asyncHandler(login));
router.post("/refresh", rateLimit(60, 900000), asyncHandler(refresh));
router.post("/logout", rateLimit(30, 900000), asyncHandler(logout));
router.post("/logout-all", requireAuth, asyncHandler(logoutAll));
router.post("/change-password", requireAuth, rateLimit(5, 900000), asyncHandler(changePassword));
router.get("/me", requireAuth, asyncHandler(me));
export default router;
