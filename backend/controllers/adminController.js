import { z } from "zod";
import { builtInRoles, permissionCatalog } from "../config/roles.js";
import { AuditModel, RoleModel, UserModel, WorkspaceModel } from "../models/index.js";
import { hashPassword } from "../middleware/auth.js";
import { audit } from "../services/auditService.js";

const roleSchema = z.object({
  key: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/)
    .min(2)
    .max(80),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(300).optional().default(""),
  permissions: z.array(z.string()).max(30).default([]),
});
const userSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(10).max(128),
  role: z.string().trim().toLowerCase().min(2).max(80),
  serviceRole: z
    .enum(["web-developer", "video-editor", "custom-service"])
    .default("custom-service"),
});
const allowedPermissions = new Set(permissionCatalog);
const cleanRole = (role) => ({
  id: String(role._id),
  key: role.key,
  name: role.name,
  description: role.description,
  permissions: role.permissions,
  builtIn: role.builtIn,
  active: role.active,
});

export async function seedWorkspaceRoles(workspaceId) {
  await Promise.all(
    builtInRoles.map((role) =>
      RoleModel.updateOne(
        { workspaceId, key: role.key },
        { $setOnInsert: { ...role, workspaceId, builtIn: true } },
        { upsert: true },
      ),
    ),
  );
}

export async function listRoles(req, res) {
  await seedWorkspaceRoles(req.user.workspaceId);
  const roles = await RoleModel.find({
    workspaceId: req.user.workspaceId,
    active: true,
  })
    .sort({ builtIn: -1, name: 1 })
    .lean();
  res.json({ data: roles.map(cleanRole), permissionCatalog });
}
export async function createRole(req, res) {
  const value = roleSchema.safeParse(req.body);
  if (!value.success)
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", details: value.error.flatten() },
    });
  const permissions = value.data.permissions.filter((permission) =>
    allowedPermissions.has(permission),
  );
  const role = await RoleModel.create({
    ...value.data,
    permissions,
    workspaceId: req.user.workspaceId,
    builtIn: false,
  });
  await audit(req, "role.create", "role", role.id, {
    key: role.key,
    permissions,
  });
  res.status(201).json({ data: cleanRole(role) });
}
export async function updateRole(req, res) {
  const value = roleSchema.omit({ key: true }).partial().safeParse(req.body);
  if (!value.success)
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", details: value.error.flatten() },
    });
  const role = await RoleModel.findOne({
    workspaceId: req.user.workspaceId,
    key: req.params.key,
    active: true,
  });
  if (!role) return res.status(404).json({ error: { code: "ROLE_NOT_FOUND" } });
  if (role.builtIn && value.data.permissions)
    return res.status(400).json({
      error: {
        code: "BUILT_IN_ROLE_LOCKED",
        message: "Built-in role permissions cannot be changed.",
      },
    });
  Object.assign(
    role,
    value.data,
    value.data.permissions
      ? {
          permissions: value.data.permissions.filter((permission) =>
            allowedPermissions.has(permission),
          ),
        }
      : {},
  );
  await role.save();
  await audit(req, "role.update", "role", role.id, value.data);
  res.json({ data: cleanRole(role) });
}
export async function removeRole(req, res) {
  const role = await RoleModel.findOne({
    workspaceId: req.user.workspaceId,
    key: req.params.key,
    active: true,
  });
  if (!role) return res.status(404).json({ error: { code: "ROLE_NOT_FOUND" } });
  if (role.builtIn || role.key === "admin")
    return res.status(400).json({
      error: {
        code: "BUILT_IN_ROLE_LOCKED",
        message: "Built-in roles cannot be removed.",
      },
    });
  if (
    await UserModel.exists({
      workspaceId: req.user.workspaceId,
      accessRole: role.key,
      deletedAt: null,
    })
  )
    return res.status(409).json({
      error: {
        code: "ROLE_IN_USE",
        message: "Move users to another role before removing this role.",
      },
    });
  role.active = false;
  await role.save();
  await audit(req, "role.remove", "role", role.id, { key: role.key });
  res.status(204).end();
}
export async function listUsers(req, res) {
  const users = await UserModel.find({
    workspaceId: req.user.workspaceId,
    deletedAt: null,
  })
    .select("-passwordHash")
    .sort({ createdAt: -1 })
    .lean();
  res.json({
    data: users.map((user) => ({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.accessRole || (user.role === "owner" ? "admin" : "member"),
      serviceRole: user.serviceRole,
      accountType: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    })),
  });
}
export async function createUser(req, res) {
  const value = userSchema.safeParse(req.body);
  if (!value.success)
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", details: value.error.flatten() },
    });
  if (
    await UserModel.exists({
      email: value.data.email.toLowerCase(),
      deletedAt: null,
    })
  )
    return res.status(409).json({ error: { code: "EMAIL_EXISTS" } });
  const workspace = await WorkspaceModel.findById(req.user.workspaceId).select("plan").lean();
  if (workspace?.plan !== "team") return res.status(403).json({error:{code:"TEAM_PLAN_REQUIRED"}});
  const role = await RoleModel.findOne({
    workspaceId: req.user.workspaceId,
    key: value.data.role,
    active: true,
  });
  if (!role) return res.status(400).json({ error: { code: "ROLE_NOT_FOUND" } });
  const memberCount = await UserModel.countDocuments({workspaceId:req.user.workspaceId,role:"member",deletedAt:null});
  await WorkspaceModel.updateOne({_id:req.user.workspaceId},{$max:{memberSlotsUsed:memberCount}});
  const seat = await WorkspaceModel.findOneAndUpdate({_id:req.user.workspaceId,plan:"team",memberSlotsUsed:{$lt:4}},{$inc:{memberSlotsUsed:1}},{new:true});
  if (!seat) return res.status(409).json({error:{code:"TEAM_LIMIT_REACHED",message:"The Team plan allows up to four members."}});
  let user;
  try { user = await UserModel.create({
    name: value.data.name,
    email: value.data.email.toLowerCase(),
    passwordHash: await hashPassword(value.data.password),
    workspaceId: req.user.workspaceId,
    role: "member",
    accessRole: role.key,
    serviceRole: value.data.serviceRole,
    status: "active",
  }); } catch(error) { await WorkspaceModel.updateOne({_id:req.user.workspaceId},{$inc:{memberSlotsUsed:-1}}); throw error; }
  await audit(req, "user.create", "user", user.id, {
    role: role.key,
    serviceRole: value.data.serviceRole,
  });
  res.status(201).json({
    data: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.accessRole,
      serviceRole: user.serviceRole,
      status: user.status,
    },
  });
}
export async function updateUser(req, res) {
  const value = z
    .object({
      role: z.string().trim().toLowerCase().optional(),
      serviceRole: z
        .enum(["web-developer", "video-editor", "custom-service"])
        .optional(),
      status: z.enum(["active", "suspended"]).optional(),
    })
    .safeParse(req.body);
  if (!value.success)
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", details: value.error.flatten() },
    });
  const user = await UserModel.findOne({
    _id: req.params.id,
    workspaceId: req.user.workspaceId,
    deletedAt: null,
  });
  if (!user) return res.status(404).json({ error: { code: "USER_NOT_FOUND" } });
  if (user.role === "owner") return res.status(403).json({error:{code:"OWNER_ACCOUNT_PROTECTED",message:"The workspace owner account cannot be changed from team management."}});
  if (
    String(user._id) === String(req.user.id) &&
    value.data.status === "suspended"
  )
    return res
      .status(400)
      .json({ error: { code: "SELF_SUSPEND_NOT_ALLOWED" } });
  if (value.data.role) {
    const role = await RoleModel.findOne({
      workspaceId: req.user.workspaceId,
      key: value.data.role,
      active: true,
    });
    if (!role)
      return res.status(400).json({ error: { code: "ROLE_NOT_FOUND" } });
    user.accessRole = role.key;
  }
  if (value.data.serviceRole) user.serviceRole = value.data.serviceRole;
  if (value.data.status) user.status = value.data.status;
  await user.save();
  await audit(req, "user.update", "user", user.id, value.data);
  res.json({
    data: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.accessRole,
      serviceRole: user.serviceRole,
      status: user.status,
    },
  });
}
export async function listAudit(req, res) {
  const limit = Math.min(Number(req.query.limit || 100), 500);
  const events = await AuditModel.find({ workspaceId: req.user.workspaceId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  res.json({ data: events });
}
