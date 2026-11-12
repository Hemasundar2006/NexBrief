import dotenv from "dotenv";
dotenv.config({ path: new URL("./.env", import.meta.url) });
import app from "./app.js";
import { connectDatabase } from "./config/database.js";
const port = Number(process.env.PORT || 4000);
connectDatabase().catch((error) =>
  console.error("MongoDB connection failed.", error.message),
);
app.listen(port, () =>
  console.log(`NexBrief API running at http://localhost:${port}`),
);
