import cron from "node-cron";
import { fetchRepos } from "../controllers/github.controller.js";
import { SchedulerLock } from "./scheduler.lock.js";

// Tiered language strategy
const TIER_1_LANGUAGES = ["Go"];
const TIER_2_LANGUAGES = ["Rust", "C++", "Ruby", "PHP", "C#"];
const TIER_3_LANGUAGES = ["Swift", "Kotlin", "C"];

const ALL_LANGUAGES = [
  ...TIER_1_LANGUAGES,
  ...TIER_2_LANGUAGES,
  ...TIER_3_LANGUAGES,
];

const TIER_TARGETS = {
  1: 1000, 
  2: 600,  
  3: 200, 
};

let currentLangIndex = 0;

function getTargetForLanguage(lang: string): number {
  if (TIER_1_LANGUAGES.includes(lang)) return TIER_TARGETS[1];
  if (TIER_2_LANGUAGES.includes(lang)) return TIER_TARGETS[2];
  if (TIER_3_LANGUAGES.includes(lang)) return TIER_TARGETS[3];
  return 500; // Default fallback
}

async function runDiscovery() {
  // Try to acquire global lock
  if (!(await SchedulerLock.acquire("Discovery"))) {
    return;
  }

  const lang = ALL_LANGUAGES[currentLangIndex];
  const targetCount = getTargetForLanguage(lang);
  const tier = TIER_1_LANGUAGES.includes(lang) ? 1 : TIER_2_LANGUAGES.includes(lang) ? 2 : 3;
  
  console.log("\n=== Discovery Job Started ===");
  console.log(`Target Language: ${lang} (Tier ${tier})`);
  console.log(`Target Repo Count: ${targetCount}`);
  console.log("Time:", new Date().toISOString());

  try {
    // Fetch repos with tier-specific target
    await fetchRepos(lang, 100, targetCount);
    
    console.log(`✓ Discovery complete for ${lang}`);
    
    // Rotate to next language for next run
    currentLangIndex = (currentLangIndex + 1) % ALL_LANGUAGES.length;
    
  } catch (err: any) {
    console.error(`✗ Discovery failed for ${lang}:`, err.message);
  } finally {
    SchedulerLock.release();
    console.log("=== Discovery Job Finished ===\n");
  }
}

// Run at 7:30 PM IST and every 6 hours (1:30 AM, 7:30 AM, 1:30 PM)
// Cron expression: 30 19,1,7,13 * * *
// cron.schedule("30 19,1,7,13 * * *", runDiscovery);

// console.log("Discovery cron scheduled (every 6 hours)");

console.log(`Configured languages: ${ALL_LANGUAGES.length} (T1: ${TIER_1_LANGUAGES.length}, T2: ${TIER_2_LANGUAGES.length}, T3: ${TIER_3_LANGUAGES.length})`);
