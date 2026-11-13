import { databaseReady } from "../config/database.js";

export function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  }
  next();
}
const attempts = new Map();
export const rateLimit =
  (max = 30, windowMs = 60000) =>
  (req, res, next) => {
    const key = `${req.ip}:${req.method}:${req.baseUrl}${req.path}`,
      now = Date.now(),
      entry = attempts.get(key);
    if (!entry || entry.reset < now) {
      attempts.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    if (entry.count >= max)
      return res.status(429).json({ error: { code: "RATE_LIMITED" } });
    entry.count++;
    next();
  };
export const requireDatabase = (req, res, next) =>
  req.path === "/health" ||
  req.path.endsWith("/health") ||
  databaseReady()
    ? next()
    : res.status(503).json({
        error: {
          code: "DATABASE_NOT_CONFIGURED",
          message: "Configure MONGODB_URI to use persistent APIs.",
        },
      });
