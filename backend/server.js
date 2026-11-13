import dotenv from "dotenv";
dotenv.config({ path: new URL("./.env", import.meta.url) });
const { default: app } = await import("./app.js");
const { connectDatabase } = await import("./config/database.js");
const { startMailWorker } = await import("./services/journeyService.js");
const port = Number(process.env.PORT || 4000);
startMailWorker();
connectDatabase().catch((error) =>
  console.error("MongoDB connection failed.", error.message),
);
app.listen(port, () =>
  console.log(`NexBrief API running at http://localhost:${port}`),
);
