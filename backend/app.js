import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import privacyRoutes from "./routes/privacyRoutes.js";
import discoveryRoutes from "./routes/discoveryRoutes.js";
import platformRoutes from "./routes/platformRoutes.js";
import paytmRoutes from "./routes/paytmRoutes.js";
import {
  getPlatformSettings,
  isMaintenanceActive,
} from "./services/platformSettingsService.js";
import { verifyJwt } from "./middleware/auth.js";
import { UserModel } from "./models/index.js";
import { databaseReady } from "./config/database.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { securityHeaders } from "./middleware/security.js";
const app = express();
app.disable("x-powered-by");
const allowedOrigins = new Set(
  (process.env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((value) => value.trim().replace(/\/+$/, ""))
    .filter(Boolean),
);
app.use(securityHeaders);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalized = origin.trim().replace(/\/+$/, "");
      if (allowedOrigins.has(normalized)) return callback(null, true);
      return callback(new Error("CORS origin is not allowed."));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.get(["/robots.txt", "/robust.txt"], (_req, res) => {
  res.type("text/plain").send(`User-agent: *
Allow: /
Allow: /start-free
Allow: /sign-in
Disallow: /app
Disallow: /api/

Sitemap: https://www.nexbrief.in/sitemap.xml
`);
});

app.get("/sitemap.xml", (_req, res) => {
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.nexbrief.in/</loc>
    <lastmod>2026-11-13</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.nexbrief.in/start-free</loc>
    <lastmod>2026-11-13</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.nexbrief.in/sign-in</loc>
    <lastmod>2026-11-13</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`);
});

app.get("/api/health", async (_req, res) => {
  const settings = await getPlatformSettings();
  res.json({
    ok: true,
    service: "nexbrief-api",
    database: databaseReady() ? "connected" : "setup-required",
    maintenance: settings.maintenanceMode,
    registrationsPaused: settings.pauseRegistrations,
    ai: process.env.OPENAI_API_KEY ? "configured" : "mock",
    payments: process.env.STRIPE_SECRET_KEY ? "configured" : "manual",
  });
});

app.get("/api/status", async (_req, res) => {
  const settings = await getPlatformSettings();
  res.json({
    ok: true,
    maintenance: settings.maintenanceMode,
    pauseRegistrations: settings.pauseRegistrations,
    notice: settings.maintenanceNotice,
  });
});

app.use("/api", (req, res, next) =>
  databaseReady()
    ? next()
    : res.status(503).json({
        error: {
          code: "DATABASE_NOT_CONFIGURED",
          message: "Configure MONGODB_URI to use persistent APIs.",
        },
      }),
);

app.use("/api", async (req, res, next) => {
  if (!isMaintenanceActive()) return next();
  // Allow health/status, platform administration, and auth endpoints
  if (
    req.path === "/health" ||
    req.path === "/status" ||
    req.path.startsWith("/platform") ||
    req.path.startsWith("/auth")
  ) {
    return next();
  }
  // Check if caller is a platform owner with a valid token
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (token) {
    const claims = verifyJwt(token);
    if (claims?.sub) {
      const user = await UserModel.findById(claims.sub).select("platformOwner").lean();
      if (user?.platformOwner) return next();
    }
  }
  const settings = await getPlatformSettings();
  return res.status(503).json({
    error: {
      code: "PLATFORM_MAINTENANCE",
      message:
        settings.maintenanceNotice ||
        "NexBrief is currently undergoing scheduled maintenance. Please check back shortly.",
    },
  });
});
app.use("/api/auth", authRoutes);
app.use("/api/platform", platformRoutes);
app.use("/api/paytm", paytmRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api", salesRoutes);
app.use("/api/privacy", privacyRoutes);
app.use("/api/growth", discoveryRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
