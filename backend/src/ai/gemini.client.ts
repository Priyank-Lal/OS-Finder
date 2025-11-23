import { GoogleGenAI } from "@google/genai";
import { _config } from "../config/config.js";
import { sanitizeJSON } from "./gemini.utils.js";

// --- Key Management Types ---
export type AITask =
  | "label_analysis"
  | "readme_summary"
  | "suitability"
  | "tech_skills"
  | "contribution_areas"
  | "task_suggestion"
  | "scoring"
  | "generic";

// --- Key rotation with cooldown tracking ---
const keys = (_config.GEMINI_KEYS || "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

// Dedicated keys from config (mapped to tasks)
const dedicatedKeys: Record<AITask, string | undefined> = {
  label_analysis: undefined, // Uses pool by default
  readme_summary: undefined,
  suitability: _config.SUITABILITY_AI_GEMINI_KEY || undefined,
  tech_skills: undefined,
  contribution_areas: undefined,
  task_suggestion: undefined,
  scoring: _config.SCORING_AI_GEMINI_KEY || undefined,
  generic: undefined,
};

// Fallback pool index
let poolIndex = 0;
const keysCooldown = new Map<string, number>(); // Track rate-limited keys

/**
 * Get a key for a specific task.
 * Strategy:
 * 1. Try dedicated key for the task (if configured and not rate-limited).
 * 2. If dedicated key fails or isn't set, try to find an available key from the shared pool.
 * 3. If all keys are rate-limited, return the primary/first key (will likely fail/wait).
 */
export function getKeyForTask(task: AITask = "generic"): string {
  const now = Date.now();

  // 1. Check Dedicated Key
  const dedicatedKey = dedicatedKeys[task];
  if (dedicatedKey) {
    const cooldown = keysCooldown.get(dedicatedKey) || 0;
    if (now >= cooldown) {
      return dedicatedKey;
    }
    console.warn(`⚠️ Dedicated key for ${task} is rate-limited. Switching to fallback pool.`);
  }

  // 2. Check Shared Pool
  if (!keys.length) {
    console.error("No Gemini keys available in pool!");
    return dedicatedKey || "";
  }

  // Try to find a key in the pool that is NOT in cooldown
  // We start from current poolIndex to distribute load
  for (let i = 0; i < keys.length; i++) {
    const k = keys[poolIndex];
    poolIndex = (poolIndex + 1) % keys.length; // Round-robin

    // Skip if this key is the same as the rate-limited dedicated key (unlikely but possible if config overlaps)
    if (k === dedicatedKey) continue;

    const cooldownUntil = keysCooldown.get(k) || 0;
    if (now >= cooldownUntil) {
      return k;
    }
  }

  // 3. All keys exhausted
  console.warn(`⚠️ All keys (dedicated & pool) are rate-limited for ${task}. Using dedicated or first pool key.`);
  return dedicatedKey || keys[0];
}

export function markKeyAsRateLimited(key: string, cooldownMs: number = 60000) {
  keysCooldown.set(key, Date.now() + cooldownMs);
  console.log(`🔒 Key marked as rate-limited for ${cooldownMs / 1000}s`);
}

export async function callAI(
  prompt: string,
  opts?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    retries?: number;
    timeoutMs?: number;
    task?: AITask; // Added task parameter
  }
): Promise<string> {
  const model = opts?.model || "gemini-2.0-flash";
  const maxTokens = opts?.maxTokens ?? 800;
  const temperature = opts?.temperature ?? 0.0;
  const retries = opts?.retries ?? 2;
  const timeoutMs = opts?.timeoutMs ?? 30000;
  const task = opts?.task || "generic";

  for (let attempt = 0; attempt <= retries; attempt++) {
    const key = getKeyForTask(task);

    try {
      const client = new GoogleGenAI({ apiKey: key });

      const aiPromise = client.models.generateContent({
        model,
        contents: prompt,
        maxOutputTokens: maxTokens,
        temperature,
      } as any);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI call timeout")), timeoutMs)
      );

      const response = await Promise.race([aiPromise, timeoutPromise]);

      const raw = response && (response.text || "");
      const cleaned = sanitizeJSON(raw);

      if (!cleaned) {
        throw new Error("Empty response from AI");
      }

      return cleaned;
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      const isRateLimit =
        errorMessage.includes("429") ||
        errorMessage.includes("quota") ||
        errorMessage.includes("RESOURCE_EXHAUSTED");

      console.error(
        `AI call failed (task: ${task}, attempt ${attempt + 1}/${retries + 1}):`,
        errorMessage
      );

      // Mark key as rate-limited if we hit 429
      if (isRateLimit) {
        markKeyAsRateLimited(key, 60000);
      }

      if (
        errorMessage.includes("invalid") ||
        errorMessage.includes("authentication")
      ) {
        console.error("Fatal error - not retrying");
        return "";
      }

      if (attempt < retries) {
        const baseDelay = isRateLimit ? 60000 : 1000;
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`Retrying in ${Math.round(delay)}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        console.error("Max retries reached, returning empty result");
        return "";
      }
    }
  }

  return "";
}
