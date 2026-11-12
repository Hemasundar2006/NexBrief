import { PlatformSettingModel } from "../models/index.js";
import { databaseReady } from "../config/database.js";
import { audit } from "./auditService.js";

let cachedSettings = {
  maintenanceMode: false,
  pauseRegistrations: false,
  maintenanceNotice:
    "NexBrief is currently undergoing scheduled maintenance. Please check back shortly.",
  updatedAt: new Date(),
};
let loaded = false;

export async function getPlatformSettings() {
  if (!databaseReady()) return cachedSettings;
  try {
    if (!loaded) {
      const doc = await PlatformSettingModel.findOne({ key: "global" }).lean();
      if (doc) {
        cachedSettings = {
          maintenanceMode: Boolean(doc.maintenanceMode),
          pauseRegistrations: Boolean(doc.pauseRegistrations),
          maintenanceNotice:
            doc.maintenanceNotice ||
            "NexBrief is currently undergoing scheduled maintenance. Please check back shortly.",
          updatedAt: doc.updatedAt || new Date(),
          updatedBy: doc.updatedBy,
        };
      }
      loaded = true;
    }
    return cachedSettings;
  } catch (err) {
    console.error("Error reading platform settings:", err.message);
    return cachedSettings;
  }
}

export async function updatePlatformSettings(updates, req) {
  if (!databaseReady()) throw new Error("Database not connected");

  const setObj = {};
  if (typeof updates.maintenanceMode === "boolean") {
    setObj.maintenanceMode = updates.maintenanceMode;
  }
  if (typeof updates.pauseRegistrations === "boolean") {
    setObj.pauseRegistrations = updates.pauseRegistrations;
  }
  if (typeof updates.maintenanceNotice === "string") {
    setObj.maintenanceNotice = updates.maintenanceNotice.trim().slice(0, 500);
  }
  if (req?.user?.id) {
    setObj.updatedBy = req.user.id;
  }

  const doc = await PlatformSettingModel.findOneAndUpdate(
    { key: "global" },
    { $set: setObj },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  cachedSettings = {
    maintenanceMode: Boolean(doc.maintenanceMode),
    pauseRegistrations: Boolean(doc.pauseRegistrations),
    maintenanceNotice: doc.maintenanceNotice,
    updatedAt: doc.updatedAt,
    updatedBy: doc.updatedBy,
  };
  loaded = true;

  if (req) {
    await audit(req, "platform.maintenance.update", "platform", "global", {
      maintenanceMode: cachedSettings.maintenanceMode,
      pauseRegistrations: cachedSettings.pauseRegistrations,
    }).catch(() => {});
  }

  return cachedSettings;
}

export function isMaintenanceActive() {
  return cachedSettings.maintenanceMode;
}

export function isRegistrationsPaused() {
  return cachedSettings.pauseRegistrations;
}

