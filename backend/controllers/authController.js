import mongoose from "mongoose";
import { z } from "zod";
import { effectiveWorkspacePlan } from "../config/plans.js";
import {
  ConsentModel,
  RefreshSessionModel,
  RoleModel,
  UserModel,
  WorkspaceModel,
  WaitlistModel,
} from "../models/index.js";
import {
  clearRefreshCookie,
  createRefreshSession,
  getRefreshCookie,
  hashPassword,
  issueAccessToken,
  revokeRefreshSession,
  rotateRefreshSession,
  verifyPassword,
} from "../middleware/auth.js";
import { audit } from "../services/auditService.js";
import { seedWorkspaceRoles } from "../services/roleService.js";
import { getPlatformSettings } from "../services/platformSettingsService.js";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(12).max(128).regex(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/),
  profession: z
    .enum(["web-developer", "video-editor", "creative"])
    .default("creative"),
  serviceRole: z
    .enum(["web-developer", "video-editor", "custom-service"])
    .optional(),
  serviceConsent: z.literal(true),
  aiConsent: z.boolean().default(false),
  marketingConsent: z.boolean().default(false),
});
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
const safeUser = (user) => ({
  id: String(user._id || user.id),
  workspaceId: String(user.workspaceId),
  email: user.email,
  name: user.name,
  role: user.platformOwner ? "platform-owner" : user.accessRole || "custom-service",
  platformOwner: Boolean(user.platformOwner),
  serviceRole: user.serviceRole || "custom-service",
  accountType: user.role || "member",
  status: user.status || "active",
});
function validation(res, result) {
  return result.success
    ? result.data
    : res.status(400).json({
        error: { code: "VALIDATION_ERROR", details: result.error.flatten() },
      });
}

export async function register(req, res) {
  const settings = await getPlatformSettings();
  if (settings.pauseRegistrations || settings.maintenanceMode) {
    return res.status(503).json({
      error: {
        code: "REGISTRATIONS_PAUSED",
        message:
          settings.maintenanceNotice ||
          "New member registrations are temporarily paused for scheduled maintenance.",
      },
    });
  }
  const value = validation(res, registerSchema.safeParse(req.body));
  if (!value || !value.email) return;
  const email = value.email.toLowerCase();
  if (await UserModel.exists({ email, deletedAt: null }))
    return res.status(409).json({
      error: {
        code: "EMAIL_EXISTS",
        message: "An account with this email already exists.",
      },
    });
  const userId = new mongoose.Types.ObjectId();
  const workspaceId = new mongoose.Types.ObjectId();
  const beta = await WaitlistModel.findOne({ email, status: 'approved', betaAccessUntil: { $gt: new Date() } }).lean();
  await WorkspaceModel.create({
    _id: workspaceId,
    name: `${value.name}'s workspace`,
    ownerId: userId,
    profession: value.profession,
    ...(beta ? { plan: 'pro', billingStatus: 'active', subscriptionStatus: 'BETA', expiresAt: beta.betaAccessUntil } : {}),
  });
  if (beta) await WaitlistModel.updateOne({ _id: beta._id }, { $set: { reviewedAt: new Date() } });
  const serviceRole =
    value.serviceRole ||
    (value.profession === "web-developer"
      ? "web-developer"
      : value.profession === "video-editor"
        ? "video-editor"
        : "custom-service");
  const user = await UserModel.create({
    _id: userId,
    name: value.name,
    email,
    passwordHash: await hashPassword(value.password),
    workspaceId,
    role: "member",
    accessRole: serviceRole,
    serviceRole,
    status: "active",
  });
  await seedWorkspaceRoles(workspaceId);
  await ConsentModel.insertMany(
    ["service", "ai-processing", "marketing"].map((purpose, i) => ({
      userId,
      workspaceId,
      purpose,
      granted: [true, value.aiConsent, value.marketingConsent][i],
      policyVersion: process.env.PRIVACY_POLICY_VERSION || "2026-01",
    })),
  );
  const current = safeUser(user);
  req.user = current;
  await createRefreshSession(user, req, res);
  await audit(req, "auth.register", "user", current.id);
  res.status(201).json({
    data: {
      user: current,
      accessToken: issueAccessToken(user),
      expiresIn: Number(process.env.JWT_ACCESS_TTL_SECONDS || 900),
    },
  });
}

export async function login(req, res) {
  const value = validation(res, loginSchema.safeParse(req.body));
  if (!value || !value.email) return;
  const user = await UserModel.findOne({
    email: value.email.toLowerCase(),
    deletedAt: null,
  });
  if (!user || !(await verifyPassword(value.password, user.passwordHash)))
    return res.status(401).json({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Email or password is incorrect.",
      },
    });
  if (user.status !== "active")
    return res.status(403).json({ error: { code: "ACCOUNT_INACTIVE", message: "This account is not active." } });
  const settings = await getPlatformSettings();
  if (settings.maintenanceMode && !user.platformOwner) {
    return res.status(503).json({
      error: {
        code: "PLATFORM_MAINTENANCE",
        message:
          settings.maintenanceNotice ||
          "NexBrief is currently undergoing scheduled maintenance. Please check back shortly.",
      },
    });
  }
  user.lastLoginAt = new Date();
  await user.save();
  const current = safeUser(user);
  req.user = current;
  await createRefreshSession(user, req, res);
  await audit(req, "auth.login", "user", current.id);
  res.json({
    data: {
      user: current,
      accessToken: issueAccessToken(user),
      expiresIn: Number(process.env.JWT_ACCESS_TTL_SECONDS || 900),
    },
  });
}

export async function refresh(req, res) {
  const user = await rotateRefreshSession(getRefreshCookie(req), req, res);
  if (!user)
    return res.status(401).json({
      error: {
        code: "REFRESH_INVALID",
        message: "Your session has expired. Please sign in again.",
      },
    });
  res.json({
    data: {
      user: safeUser(user),
      accessToken: issueAccessToken(user),
      expiresIn: Number(process.env.JWT_ACCESS_TTL_SECONDS || 900),
    },
  });
}
export async function logout(req, res) {
  await revokeRefreshSession(getRefreshCookie(req));
  clearRefreshCookie(res);
  res.status(204).end();
}
export async function logoutAll(req, res) {
  await RefreshSessionModel.updateMany(
    { userId: req.user.id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  clearRefreshCookie(res);
  res.status(204).end();
}
export async function changePassword(req, res) {
  const parsed = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(12).max(128).regex(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, 'Use letters, numbers, and a symbol.') }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Use a new password of at least 12 characters with letters, numbers, and a symbol.' } });
  const user = await UserModel.findById(req.user.id);
  if (!user || user.status !== 'active') return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) return res.status(403).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect.' } });
  if (await verifyPassword(parsed.data.newPassword, user.passwordHash)) return res.status(400).json({ error: { code: 'PASSWORD_REUSED', message: 'Choose a different password.' } });
  user.passwordHash = await hashPassword(parsed.data.newPassword);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  await RefreshSessionModel.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  clearRefreshCookie(res);
  await audit(req, 'auth.password_changed', 'user', String(user._id));
  res.status(204).end();
}
export async function me(req, res) {
  const user = await UserModel.findOne({ _id: req.user.id, deletedAt: null })
    .select("-passwordHash")
    .lean();
  if (!user) return res.status(401).json({ error: { code: "UNAUTHORIZED" } });
  const settings = await getPlatformSettings();
  if (settings.maintenanceMode && !user.platformOwner) {
    return res.status(503).json({
      error: {
        code: "PLATFORM_MAINTENANCE",
        message:
          settings.maintenanceNotice ||
          "NexBrief is currently undergoing scheduled maintenance. Please check back shortly.",
      },
    });
  }
  const current = safeUser(user);
  const [role, workspace] = await Promise.all([
    RoleModel.findOne({workspaceId:user.workspaceId,key:current.role,active:true}).select('permissions').lean(),
    WorkspaceModel.findById(user.workspaceId).select('name profession currency plan billingStatus retentionDays subscriptionId subscriptionStatus billingCycle subscriptionAmount subscriptionCurrency authorizationStatus mandateStatus activatedAt nextBillingDate expiresAt autoRenew').lean(),
  ]);
  if (workspace && effectiveWorkspacePlan(workspace) === "free" && workspace.plan !== "free") {
    await WorkspaceModel.updateOne({ _id: workspace._id, plan: workspace.plan }, { $set: { plan: "free", billingStatus: "past_due", autoRenew: false } });
    workspace.plan = "free"; workspace.billingStatus = "past_due"; workspace.autoRenew = false;
  }
  res.json({ data: {...current, permissions: current.role === 'platform-owner' ? [] : role?.permissions || [], workspace} });
}
