import cron from "node-cron";
import { processSummaries } from "../utils/summarizer";
import fs from "fs";
import path from "path";

const LOCK_FILE = path.join(__dirname, "../../.summarizer-cron.lock");

function acquireLock(): boolean {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const lockTime = fs.statSync(LOCK_FILE).mtime.getTime();
      const now = Date.now();
      if (now - lockTime > 12 * 60 * 60 * 1000) {
        console.log("Stale summarizer lock detected, removing");
        fs.unlinkSync(LOCK_FILE);
      } else {
        return false;
      }
    }
    fs.writeFileSync(LOCK_FILE, String(Date.now()));
    return true;
  } catch (err) {
    console.error("Lock acquisition failed:", err);
    return false;
  }
}

function releaseLock(): void {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch (err) {
    console.error("Lock release failed:", err);
  }
}

async function runSummarization() {
  if (!acquireLock()) {
    console.log("Summarization already running, skipping");
    return;
  }

  const startTime = Date.now();

  try {
    console.log("\n=== Summarization Cron Started ===");
    console.log(`Time: ${new Date().toISOString()}`);

    const stats = await processSummaries();

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log("\n=== Summarization Complete ===");
    console.log(`Duration: ${duration} minutes`);
    console.log(`Processed: ${stats.successful}/${stats.total}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Scored: ${stats.scored}`);
  } catch (err: any) {
    console.error("Summarization cron crashed:", err.message);
    console.error(err.stack);
  } finally {
    releaseLock();
  }
}

// Run every day at 3 AM UTC
cron.schedule("0 3 * * *", runSummarization, {
  timezone: "UTC",
});

console.log("Summarizer cron scheduled (daily at 3 AM UTC)");
