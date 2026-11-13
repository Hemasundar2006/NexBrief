import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { RefreshSessionModel, RoleModel, UserModel } from "../models/index.js";

const scrypt = promisify(scryptCallback);
const accessSecret =
  process.env.JWT_ACCESS_SECRET ||
  process.env.AUTH_SECRET ||
  "development-only-change-me";
const accessTtlSeconds = Number(process.env.JWT_ACCESS_TTL_SECONDS || 900);
const refreshTtlDays = Number(process.env.JWT_REFRESH_TTL_DAYS || 30);

if (
  process.env.NODE_ENV === "production" &&
  (!process.env.JWT_ACCESS_SECRET || accessSecret.length < 32)
)
  throw new Error(
    "JWT_ACCESS_SECRET must be set to a random value of at least 32 characters in production.",
  );

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password, stored) {
  const [salt, hex] = String(stored || "").split(":");
  if (!salt || !hex) return false;
  const key = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  const expected = Buffer.from(hex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}
function b64(value) {
  return Buffer.from(value).toString("base64url");
}
function signJwt(payload) {
  const h = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64(JSON.stringify(payload));
  const s = createHmac("sha256", accessSecret)
    .update(`${h}.${p}`)
    .digest("base64url");
  return `${h}.${p}.${s}`;
}
export function verifyJwt(token) {
  const [h, p, s] = String(token || "").split(".");
  if (!h || !p || !s) return null;
  const expected = createHmac("sha256", accessSecret)
    .update(`${h}.${p}`)
    .digest("base64url");
  const a = Buffer.from(s);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const header = JSON.parse(Buffer.from(h, "base64url").toString("utf8"));
    if (header.alg !== "HS256" || header.typ !== "JWT") return null;
    const value = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
    return value.iss === "nexbrief-api" &&
      value.exp > Math.floor(Date.now() / 1000)
      ? value
      : null;
  } catch {
    return null;
  }
}
export function issueAccessToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const accessRole =
    user.accessRole || (user.role === "owner" ? "admin" : "member");
  return signJwt({
    iss: "nexbrief-api",
    sub: String(user.id || user._id),
    workspaceId: String(user.workspaceId),
    role: accessRole,
    serviceRole: user.serviceRole || "custom-service",
    tokenVersion: user.tokenVersion || 0,
    iat: now,
    exp: now + accessTtlSeconds,
    jti: randomBytes(16).toString("hex"),
  });
}
function cookieValue(req, name) {
  const raw = req.headers.cookie || "";
  const item = raw
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}
function setRefreshCookie(res, token) {
  const maxAge = refreshTtlDays * 86400;
  res.setHeader(
    "Set-Cookie",
    `nexbrief_refresh=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/api/auth; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  );
}
export async function createRefreshSession(user, req, res) {
  const raw = randomBytes(48).toString("base64url");
  const tokenHash = createHmac("sha256", accessSecret)
    .update(raw)
    .digest("hex");
  await RefreshSessionModel.create({
    userId: user.id || user._id,
    workspaceId: user.workspaceId,
    tokenHash,
    expiresAt: new Date(Date.now() + refreshTtlDays * 86400000),
    userAgent: req.get("user-agent")?.slice(0, 500),
    ipAddress: req.ip,
  });
  setRefreshCookie(res, raw);
  return raw;
}
export async function rotateRefreshSession(raw, req, res) {
  const tokenHash = createHmac("sha256", accessSecret)
    .update(String(raw || ""))
    .digest("hex");
  const session = await RefreshSessionModel.findOne({
    tokenHash,
    revokedAt: null,
  });
  if (!session || session.expiresAt <= new Date()) return null;
  session.revokedAt = new Date();
  session.replacedBy = randomBytes(16).toString("hex");
  await session.save();
  const user = await UserModel.findOne({
    _id: session.userId,
    deletedAt: null,
  }).lean();
  if (!user || user.status !== "active") return null;
  await createRefreshSession(user, req, res);
  return user;
}
export function clearRefreshCookie(res) {
  res.setHeader(
    "Set-Cookie",
    "nexbrief_refresh=; Max-Age=0; Path=/api/auth; HttpOnly; SameSite=Lax",
  );
}
export function getRefreshCookie(req) {
  return cookieValue(req, "nexbrief_refresh");
}
export async function revokeRefreshSession(raw) {
  if (!raw) return;
  const tokenHash = createHmac("sha256", accessSecret)
    .update(raw)
    .digest("hex");
  await RefreshSessionModel.updateOne(
    { tokenHash, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}
export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const claims = token ? verifyJwt(token) : null;
  if (!claims)
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Your session is missing or expired.",
      },
    });
  try {
    const user = await UserModel.findOne({
      _id: claims.sub,
      workspaceId: claims.workspaceId,
      deletedAt: null,
    })
      .select("status accessRole role serviceRole platformOwner tokenVersion")
      .lean();
    if (!user || user.status !== "active" || (user.tokenVersion || 0) !== (claims.tokenVersion || 0))
      return res.status(401).json({
        error: {
          code: "ACCOUNT_INACTIVE",
          message: "This account is not active.",
        },
      });
    req.user = {
      id: claims.sub,
      workspaceId: claims.workspaceId,
      role: user.platformOwner ? "platform-owner" : user.accessRole || claims.role,
      accountType: user.role,
      platformOwner: Boolean(user.platformOwner),
      serviceRole: user.serviceRole || claims.serviceRole,
    };
    next();
  } catch (error) {
    next(error);
  }
}
export function requireRole(...roles) {
  return (req, res, next) =>
    roles.includes(req.user?.role)
      ? next()
      : res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission for this action.",
          },
        });
}
export function requirePermission(permission) {
  return async (req, res, next) => {
    if (req.user?.platformOwner) return res.status(403).json({error:{code:"PLATFORM_METADATA_ONLY",message:"Platform owners cannot access customer CRM records."}});
    try {
      const role = await RoleModel.findOne({
        workspaceId: req.user.workspaceId,
        key: req.user.role,
        active: true,
      })
        .select("permissions")
        .lean();
      if (role?.permissions?.includes(permission)) return next();
      return res.status(403).json({
        error: {
          code: "PERMISSION_DENIED",
          message: `Your role does not allow ${permission}.`,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
