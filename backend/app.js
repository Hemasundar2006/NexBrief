import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import privacyRoutes from "./routes/privacyRoutes.js";
import discoveryRoutes from "./routes/discoveryRoutes.js";
import platformRoutes from "./routes/platformRoutes.js";
import paytmRoutes from "./routes/paytmRoutes.js";
import { databaseReady } from "./config/database.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { securityHeaders } from "./middleware/security.js";
const app = express();
app.disable("x-powered-by");
const allowedOrigins = new Set((process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",").map(value => value.trim()).filter(Boolean));
app.use(securityHeaders);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error("CORS origin is not allowed."));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.get("/api/health", (_req, res) =>
  res.json({
    ok: true,
    service: "nexbrief-api",
    database: databaseReady() ? "connected" : "setup-required",
    ai: process.env.OPENAI_API_KEY ? "configured" : "mock",
    payments: process.env.STRIPE_SECRET_KEY ? "configured" : "manual",
  }),
);
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
