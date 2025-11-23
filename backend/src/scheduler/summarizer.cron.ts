import cron from "node-cron";
import { processSummaries } from "../utils/summarizer/summarizer.js";
import { SchedulerLock } from "./scheduler.lock.js";

async function runSummarization() {
  // Try to acquire global lock
  if (!(await SchedulerLock.acquire("Summarization"))) {
    return;
  }

  console.log("\n=== Summarization Started ===");
  console.log("Time:", new Date().toISOString());

  try {
    await processSummaries();
    console.log("\n=== Summarization Complete ===");
  } catch (err: any) {
    console.error("Summarization error:", err.message);
  } finally {
    SchedulerLock.release();
  }
}

// Run every day at 3 AM
cron.schedule("0 3 * * *", runSummarization);

console.log("Summarizer cron scheduled (daily at 3 AM)");
