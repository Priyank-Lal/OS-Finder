import cron from "node-cron";
import { fetchRepos } from "../controllers/github.controller.js";
import { SchedulerLock } from "./scheduler.lock.js";

// Tiered language strategy
const TIER_1_LANGUAGES = ["TypeScript", "Java", "Go"];
const TIER_2_LANGUAGES = ["Rust", "C++", "Ruby", "PHP", "C#"];
const TIER_3_LANGUAGES = ["Swift", "Kotlin"];

const ALL_LANGUAGES = [
  ...TIER_1_LANGUAGES,
  ...TIER_2_LANGUAGES,
  ...TIER_3_LANGUAGES,
];

// Target repo counts per tier
const TIER_TARGETS = {
  1: 750,  // Tier 1: 700-750 repos
  2: 400,  // Tier 2: 300-400 repos
  3: 200,  // Tier 3: 100-200 repos
};

let currentLangIndex = 0;

function getTargetForLanguage(lang: string): number {
  if (TIER_1_LANGUAGES.includes(lang)) return TIER_TARGETS[1];
  if (TIER_2_LANGUAGES.includes(lang)) return TIER_TARGETS[2];
  if (TIER_3_LANGUAGES.includes(lang)) return TIER_TARGETS[3];
  return 400; // Default fallback
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

cron.schedule("45 12 * * *", runDiscovery);

console.log("Discovery cron scheduled (daily at 12:45 PM IST / 07:15 UTC)");
console.log(`Configured languages: ${ALL_LANGUAGES.length} (T1: ${TIER_1_LANGUAGES.length}, T2: ${TIER_2_LANGUAGES.length}, T3: ${TIER_3_LANGUAGES.length})`);
