import mongoose from "mongoose";
let ready = false;
export async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    console.log("MongoDB not configured. Persistent APIs require MONGODB_URI.");
    return false;
  }
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  ready = true;
  mongoose.connection.on("connected", () => {
    ready = true;
  });
  mongoose.connection.on("reconnected", () => {
    ready = true;
  });
  mongoose.connection.on("disconnected", () => {
    ready = false;
  });
  console.log("Connected to MongoDB.");
  return true;
}
export const databaseReady = () =>
  ready && mongoose.connection.readyState === 1;
