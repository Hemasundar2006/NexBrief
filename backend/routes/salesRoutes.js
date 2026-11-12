import { Router } from "express";
import {
  activities,
  createDraft,
  listDrafts,
  createProposal,
  listProposals,
  pipeline,
  recordPayment,
  updateProposal,
} from "../controllers/salesController.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { rateLimit } from "../middleware/security.js";

const router = Router();
router.use(requireAuth);
router.get(
  "/pipeline",
  requirePermission("pipeline:read"),
  asyncHandler(pipeline),
);
router.get(
  "/activities",
  requirePermission("pipeline:read"),
  asyncHandler(activities),
);
router.post(
  "/ai/drafts",
  requirePermission("outreach:generate"),
  rateLimit(30),
  asyncHandler(createDraft),
);
router.get(
  "/ai/drafts",
  requirePermission("outreach:generate"),
  asyncHandler(listDrafts),
);
router.get(
  "/proposals",
  requirePermission("proposals:read"),
  asyncHandler(listProposals),
);
router.post(
  "/proposals",
  requirePermission("proposals:write"),
  asyncHandler(createProposal),
);
router.patch(
  "/proposals/:id",
  requirePermission("proposals:write"),
  asyncHandler(updateProposal),
);
router.post(
  "/payments/manual",
  requirePermission("payments:read"),
  asyncHandler(recordPayment),
);
router.post(
  "/payments/checkout",
  requirePermission("payments:read"),
  (_req, res) =>
    res
      .status(501)
      .json({ error: { code: "PAYMENT_PROVIDER_NOT_CONFIGURED" } }),
);
export default router;
