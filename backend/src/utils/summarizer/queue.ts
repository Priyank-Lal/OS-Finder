import PQueue from "p-queue";
import { _config } from "../../config/config.js";

const apiKeyCount = (_config.GEMINI_KEYS || "")
  .split(",")
  .filter(Boolean).length;

export const AI_CALLS_PER_REPO = 5;
export const SAFE_RPM_PER_KEY = 12;
export const TOTAL_SAFE_RPM = apiKeyCount * SAFE_RPM_PER_KEY;
export const BATCH_LIMIT = 60;
export const MAX_RETRY_ATTEMPTS = 3;

export const aiQueue = new PQueue({
  concurrency: Math.max(2, Math.floor(apiKeyCount * 2)), // 2 concurrent calls per key
  interval: 60000, // 1 minute window
  intervalCap: TOTAL_SAFE_RPM, // Total calls per minute
});

export const repoQueue = new PQueue({
  concurrency: Math.min(10, apiKeyCount * 2), // More repos can process in parallel
});
