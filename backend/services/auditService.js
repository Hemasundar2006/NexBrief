import { createHash } from "node:crypto";
import { AuditModel, ActivityModel } from "../models/index.js";
export async function audit(req, action, entityType, entityId, metadata = {}) {
  const ipHash = createHash("sha256")
    .update(`${process.env.AUDIT_SALT || "dev"}:${req.ip}`)
    .digest("hex")
    .slice(0, 24);
  return AuditModel.create({
    workspaceId: req.user?.workspaceId,
    actorId: req.user?.id,
    action,
    entityType,
    entityId,
    ipHash,
    metadata,
  });
}
export async function recordActivity(req, type, summary, leadId, metadata = {}) {
  return ActivityModel.create({
    workspaceId: req.user.workspaceId,
    actorId: req.user.id,
    ...(leadId ? { leadId } : {}),
    type,
    summary,
    metadata,
  });
}
