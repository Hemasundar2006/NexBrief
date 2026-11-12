import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  ActivityModel,
  ConsentModel,
  DraftModel,
  LeadModel,
  ProposalModel,
  UserModel,
  WorkspaceModel,
} from "../models/index.js";
import { hashPassword, verifyPassword } from "../middleware/auth.js";
import { audit } from "../services/auditService.js";
export async function consents(req, res) {
  res.json({
    data: await ConsentModel.find({ userId: req.user.id })
      .sort({ recordedAt: -1 })
      .lean(),
  });
}
export async function setConsent(req, res) {
  const purpose = z
      .enum(["ai-processing", "marketing"])
      .safeParse(req.params.purpose),
    body = z.object({ granted: z.boolean() }).safeParse(req.body);
  if (!purpose.success || !body.success)
    return res.status(400).json({ error: { code: "VALIDATION_ERROR" } });
  const data = await ConsentModel.create({
    userId: req.user.id,
    workspaceId: req.user.workspaceId,
    purpose: purpose.data,
    granted: body.data.granted,
    policyVersion: process.env.PRIVACY_POLICY_VERSION || "2026-01",
  });
  await audit(req, "privacy.consent", "consent", String(data._id));
  res.json({ data });
}
export async function exportData(req, res) {
  const w = req.user.workspaceId;
  const [
    user,
    workspace,
    leads,
    activities,
    drafts,
    proposals,
    consentHistory,
  ] = await Promise.all([
    UserModel.findById(req.user.id).select("-passwordHash").lean(),
    WorkspaceModel.findById(w).lean(),
    LeadModel.find({ workspaceId: w }).lean(),
    ActivityModel.find({ workspaceId: w }).lean(),
    DraftModel.find({ workspaceId: w }).lean(),
    ProposalModel.find({ workspaceId: w }).lean(),
    ConsentModel.find({ workspaceId: w }).lean(),
  ]);
  await audit(req, "privacy.export");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="nexbrief-data-export.json"',
  );
  res.json({
    exportedAt: new Date().toISOString(),
    user,
    workspace,
    leads,
    activities,
    drafts,
    proposals,
    consents: consentHistory,
  });
}
export async function deleteAccount(req, res) {
  const p = z
    .object({
      confirmation: z.literal("DELETE MY ACCOUNT"),
      password: z.string(),
    })
    .safeParse(req.body);
  if (!p.success)
    return res.status(400).json({ error: { code: "CONFIRMATION_REQUIRED" } });
  const user = await UserModel.findById(req.user.id);
  if (!user || !(await verifyPassword(p.data.password, user.passwordHash)))
    return res.status(401).json({ error: { code: "INVALID_CREDENTIALS" } });
  const w = req.user.workspaceId;
  await Promise.all([
    LeadModel.deleteMany({ workspaceId: w }),
    ActivityModel.deleteMany({ workspaceId: w }),
    DraftModel.deleteMany({ workspaceId: w }),
    ProposalModel.deleteMany({ workspaceId: w }),
    ConsentModel.deleteMany({ workspaceId: w }),
    WorkspaceModel.deleteOne({ _id: w }),
  ]);
  user.deletedAt = new Date();
  user.email = `deleted+${user._id}@invalid.local`;
  user.name = "Deleted user";
  user.passwordHash = await hashPassword(randomUUID());
  await user.save();
  res.status(204).send();
}
export async function updateWorkspace(req, res) {
  const p = z
    .object({
      name: z.string().min(2).max(120).optional(),
      profession: z
        .enum(["web-developer", "video-editor", "creative"])
        .optional(),
      currency: z.string().length(3).optional(),
      retentionDays: z.number().int().min(30).max(3650).optional(),
    })
    .safeParse(req.body);
  if (!p.success)
    return res.status(400).json({ error: { code: "VALIDATION_ERROR" } });
  res.json({
    data: await WorkspaceModel.findByIdAndUpdate(req.user.workspaceId, p.data, {
      new: true,
      runValidators: true,
    }),
  });
}
