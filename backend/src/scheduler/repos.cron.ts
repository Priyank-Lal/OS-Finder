import cron from "node-cron";
import { fetchRepos } from "../controllers/github.controller";
import { Project } from "../models/project.model";
import fs from "fs";
import path from "path";

const LOCK_FILE = path.join(__dirname, "../../.repos-cron.lock");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function acquireLock(): boolean {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const lockTime = fs.statSync(LOCK_FILE).mtime.getTime();
      const now = Date.now();
      // If lock is older than 6 hours, it's stale
      if (now - lockTime > 6 * 60 * 60 * 1000) {
        console.log("Stale lock detected, removing");
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

async function runRepoSync() {
  if (!acquireLock()) {
    console.log("Repo sync already running, skipping");
    return;
  }

  const startTime = Date.now();
  let stats = {
    total: 0,
    successful: 0,
    failed: 0,
    fetched: 0,
  };

  try {
    console.log("\n=== Repo Sync Cron Started ===");
    console.log(`Time: ${new Date().toISOString()}`);

    // Get languages with at least 5 repos
    const langs = await Project.aggregate([
      { $group: { _id: "$language", count: { $sum: 1 } } },
      { $match: { count: { $gte: 5 } } },
      { $project: { _id: 0, language: "$_id", count: 1 } },
      { $sort: { count: -1 } },
    ]);

    const languages = langs.map((l) => l.language).filter(Boolean);

    if (languages.length === 0) {
      console.log("No languages found to update");
      return;
    }

    console.log(
      `Syncing ${languages.length} languages: ${languages.join(", ")}`
    );
    stats.total = languages.length;

    for (const lang of languages) {
      try {
        console.log(`\nFetching ${lang} repos...`);
        const result = await fetchRepos(lang, 100);
        stats.fetched += result.inserted || 0;
        stats.successful++;
        console.log(`✓ ${lang}: ${result.inserted} repos inserted`);
      } catch (error: any) {
        stats.failed++;
        console.error(`✗ ${lang} failed:`, error.message);
      }

      // Rate limiting delay
      await sleep(10000); // 10 seconds between languages
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("\n=== Repo Sync Complete ===");
    console.log(`Duration: ${duration}s`);
    console.log(`Languages: ${stats.successful}/${stats.total} successful`);
    console.log(`Total repos fetched: ${stats.fetched}`);
  } catch (err: any) {
    console.error("Repo sync crashed:", err.message);
    console.error(err.stack);
  } finally {
    releaseLock();
  }
}

// Run every 12 hours
cron.schedule("0 */12 * * *", runRepoSync, {
  timezone: "UTC",
});

console.log("Repo sync cron scheduled (every 12 hours)");
