import cron from "node-cron";
import { fetchRepos } from "../controllers/github.controller.js";
import { SchedulerLock } from "./scheduler.lock.js";

const LANGUAGES = [
  "JavaScript",
  "Python",
  "TypeScript",
  "Java",
  "Go",
  "Rust",
  "C++",
  "Ruby",
  "PHP",
  "C#",
  "Swift",
  "Kotlin",
];

let currentLangIndex = 0;

async function runDiscovery() {
  // Try to acquire global lock
  if (!(await SchedulerLock.acquire("Discovery"))) {
    return;
  }

  const lang = LANGUAGES[currentLangIndex];
  
  console.log("\n=== Discovery Job Started ===");
  console.log(`Target Language: ${lang}`);
  console.log("Time:", new Date().toISOString());

  try {
    // Fetch 500 repos (conservative batch)
    await fetchRepos(lang, 100);
    
    console.log(`✓ Discovery complete for ${lang}`);
    
    // Rotate to next language for next run
    currentLangIndex = (currentLangIndex + 1) % LANGUAGES.length;
    
  } catch (err: any) {
    console.error(`✗ Discovery failed for ${lang}:`, err.message);
  } finally {
    SchedulerLock.release();
    console.log("=== Discovery Job Finished ===\n");
  }
}

// Run at minute 30 past every 4th hour (00:30, 04:30, 08:30...)
// This avoids conflict with Repo Sync (00:00) and Summarizer (03:00)
cron.schedule("30 */4 * * *", runDiscovery);

console.log("Discovery cron scheduled (every 4 hours at :30)");
