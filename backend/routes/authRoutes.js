import { Router } from "express";
import {
  login,
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
router.use(rateLimit(20, 900000));
router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/refresh", rateLimit(60, 900000), asyncHandler(refresh));
router.post("/logout", asyncHandler(logout));
router.post("/logout-all", requireAuth, asyncHandler(logoutAll));
router.get("/me", requireAuth, asyncHandler(me));
export default router;
