import cron from "node-cron";
import { fetchRepos } from "../controllers/github.controller.js";
import { Project } from "../models/project.model.js";
import { SchedulerLock } from "./scheduler.lock.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runRepoSync() {
  // Try to acquire global lock
  if (!(await SchedulerLock.acquire("Repo Sync"))) {
    return;
  }

  console.log("\n=== Repo Sync Started ===");
  console.log("Time:", new Date().toISOString());

  try {
    // Get languages that have at least 5 repos
    const langs = await Project.aggregate([
      { $group: { _id: "$language", count: { $sum: 1 } } },
      { $match: { count: { $gte: 5 } } },
      { $project: { _id: 0, language: "$_id" } },
    ]);

    const languages = langs.map((l) => l.language);

    if (languages.length === 0) {
      console.log("No languages found to update");
      return;
    }

    console.log(`Syncing ${languages.length} languages:`, languages.join(", "));

    for (const lang of languages) {
      try {
        console.log(`\nFetching ${lang}...`);
        await fetchRepos(lang, 100);
        console.log(`✓ ${lang} done`);
      } catch (error: any) {
        console.error(`✗ ${lang} failed:`, error.message);
      }

      // Wait 10 seconds between languages
      await sleep(10000);
    }

    console.log("\n=== Repo Sync Complete ===");
  } catch (err: any) {
    console.error("Repo sync error:", err.message);
  } finally {
    SchedulerLock.release();
  }
}

// Run every 12 hours
// cron.schedule("0 */12 * * *", runRepoSync);

console.log("Repo sync cron PAUSED");
