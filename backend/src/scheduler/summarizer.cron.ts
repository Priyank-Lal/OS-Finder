import cron from "node-cron";
import { processSummaries } from "../utils/summarizer";

// Runs every day at 3 AM
cron.schedule("0 3 * * *", async () => {
  console.log("Summarization cron started:", new Date().toISOString());
  try {
    await processSummaries();
  } catch (err) {
    console.error("Summarization cron failed:", err);
  }
  console.log("Summarization cron finished:", new Date().toISOString());
});
