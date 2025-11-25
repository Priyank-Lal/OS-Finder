import PQueue from "p-queue";
import { _config } from "../../config/config.js";

const apiKeyCount = [
  _config.CONTRIBUTION_AREAS_API_KEYS,
  _config.FALLBACK_API_KEYS,
  _config.LABEL_ANALYSIS_API_KEYS,
  _config.README_SUMMARY_API_KEYS,
  _config.SUITABILITY_AI_API_KEYS,
  _config.TECH_AND_SKILLS_API_KEYS,
  _config.TASK_SUGGESTION_API_KEYS,
  _config.SCORING_AI_API_KEYS,
]
  .filter(Boolean)
  .flatMap((keys) => keys.split(","))
  .filter(Boolean).length;

export const AI_CALLS_PER_REPO = 7; // Updated to reflect actual calls
export const SAFE_RPM_PER_KEY = 10; // Reduced from 12 for safety
export const TOTAL_SAFE_RPM = (apiKeyCount || 16) * SAFE_RPM_PER_KEY;
export const BATCH_LIMIT = 150; // Increased to 100
export const MAX_RETRY_ATTEMPTS = 3;

export const aiQueue = new PQueue({
  concurrency: Math.max(2, Math.floor(apiKeyCount * 1.5)), // Reduced concurrency
  interval: 60000 * 2, // 2 minute window (very safe)
  intervalCap: TOTAL_SAFE_RPM,
});

export const repoQueue = new PQueue({
  concurrency: 3, // Very conservative repo concurrency
  interval: 5000, // 5s gap between repo starts
  intervalCap: 1,
});
