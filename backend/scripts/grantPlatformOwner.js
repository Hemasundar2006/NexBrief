import dotenv from "dotenv";
dotenv.config({ path: new URL("../.env", import.meta.url) });
import { connectDatabase } from "../config/database.js";
import { UserModel } from "../models/index.js";
import mongoose from "mongoose";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Usage: node backend/scripts/grantPlatformOwner.js owner@example.com");
  process.exit(1);
}
try {
  if (!await connectDatabase()) throw new Error("MONGODB_URI is required.");
  const user = await UserModel.findOne({email,deletedAt:null});
  if (!user) throw new Error("An existing account with that email is required.");
  user.platformOwner = true;
  await user.save();
  console.log(`Platform owner enabled for ${email}. Customer CRM access is blocked for this account.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
