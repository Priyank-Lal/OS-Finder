import cron from "node-cron";
import { processSummaries } from "../utils/summarizer/summarizer";

let isRunning = false;

async function runSummarization() {
  // Simple check to prevent overlap
  if (isRunning) {
    console.log("Summarization already running, skipping");
    return;
  }

  isRunning = true;
  console.log("\n=== Summarization Started ===");
  console.log("Time:", new Date().toISOString());

  try {
    await processSummaries();
    console.log("\n=== Summarization Complete ===");
  } catch (err: any) {
    console.error("Summarization error:", err.message);
  } finally {
    isRunning = false;
  }
}

// Run every day at 3 AM
cron.schedule("0 3 * * *", runSummarization);

console.log("Summarizer cron scheduled (daily at 3 AM)");
