import { Router } from "express";
import {
  generateOutreach,
  getAudit,
  getDiscoveryJob,
  listBusinesses,
  saveBusiness,
  startAudit,
  startDiscovery,
  usage,
} from "../controllers/discoveryController.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";

const router = Router();
router.use(requireAuth);
router.get("/usage", asyncHandler(usage));
router.post(
  "/discoveries",
  requirePermission("leads:read"),
  asyncHandler(startDiscovery),
);
router.get(
  "/discoveries/:id",
  requirePermission("leads:read"),
  asyncHandler(getDiscoveryJob),
);
router.get(
  "/businesses",
  requirePermission("leads:read"),
  asyncHandler(listBusinesses),
);
router.post(
  "/businesses/:id/audit",
  requirePermission("leads:read"),
  asyncHandler(startAudit),
);
router.get(
  "/audits/:id",
  requirePermission("leads:read"),
  asyncHandler(getAudit),
);
router.post(
  "/businesses/:id/save-to-crm",
  requirePermission("leads:write"),
  asyncHandler(saveBusiness),
);
router.post(
  "/businesses/:id/outreach",
  requirePermission("outreach:generate"),
  asyncHandler(generateOutreach),
);
export default router;
