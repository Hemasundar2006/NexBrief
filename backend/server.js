import dotenv from "dotenv";
dotenv.config({ path: new URL("./.env", import.meta.url) });
const { default: app } = await import("./app.js");
const { connectDatabase } = await import("./config/database.js");
const { startMailWorker } = await import("./services/journeyService.js");
const port = Number(process.env.PORT || 4000);

try {
  // Authentication and every persistent API depend on MongoDB. Waiting here
  // prevents the server from briefly accepting requests before the database
  // connection is ready after a local or production restart.
  await connectDatabase();
  startMailWorker();
  app.listen(port, () =>
    console.log(`NexBrief API running at http://localhost:${port}`),
  );
} catch (error) {
  console.error("NexBrief API startup failed: MongoDB is unavailable.", error.message);
  process.exitCode = 1;
}
