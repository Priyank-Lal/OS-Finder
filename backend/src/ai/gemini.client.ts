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

// --- Model Fallback Strategy ---
const MODEL_FALLBACK_CHAIN = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
];

// Track which models are rate-limited
const modelCooldown = new Map<string, number>();

// --- TPM Tracking ---
const MAX_TPM = 250000; // 250k TPM limit
const tpmHistory: { timestamp: number; tokens: number }[] = [];

function checkAndTrackTPM(estimatedTokens: number): number {
  const now = Date.now();
  // Remove entries older than 1 minute
  while (tpmHistory.length > 0 && tpmHistory[0].timestamp < now - 60000) {
    tpmHistory.shift();
  }

  const currentTPM = tpmHistory.reduce((acc, entry) => acc + entry.tokens, 0);

  if (currentTPM + estimatedTokens > MAX_TPM) {
    const oldestEntry = tpmHistory[0];
    if (oldestEntry) {
      // Return ms to wait until the oldest entry expires
      return (oldestEntry.timestamp + 60000) - now;
    }
    return 1000; // Default wait if history is empty but somehow full (shouldn't happen)
  }

  // Track this call
  tpmHistory.push({ timestamp: now, tokens: estimatedTokens });
  return 0;
}

// --- Key Configuration per Task ---
const taskKeyConfig: Record<AITask, string> = {
  label_analysis: _config.LABEL_ANALYSIS_API_KEYS || "",
  readme_summary: _config.README_SUMMARY_API_KEYS || "",
  suitability: _config.SUITABILITY_AI_API_KEYS || "",
  tech_skills: _config.TECH_AND_SKILLS_API_KEYS || "",
  contribution_areas: _config.CONTRIBUTION_AREAS_API_KEYS || "",
  task_suggestion: _config.TASK_SUGGESTION_API_KEYS || "",
  scoring: _config.SCORING_AI_API_KEYS || "",
  generic: _config.FALLBACK_API_KEYS || "",
};

// Fallback pool index
let poolIndex = 0;
const keysCooldown = new Map<string, number>(); // Track rate-limited keys

/**
 * Get available model (respects cooldowns)
 */
export function getAvailableModel(preferredModel?: string): string {
  const now = Date.now();
  
  // If preferred model is specified and not in cooldown, use it
  if (preferredModel) {
    const cooldown = modelCooldown.get(preferredModel) || 0;
    if (now >= cooldown) {
      return preferredModel;
    }
  }

  // Try fallback chain
  for (const model of MODEL_FALLBACK_CHAIN) {
    const cooldown = modelCooldown.get(model) || 0;
    if (now >= cooldown) {
      return model;
    }
  }

  // All models in cooldown, return first one anyway
  console.warn("⚠️ All models are rate-limited, using first fallback");
  return MODEL_FALLBACK_CHAIN[0];
}

/**
 * Mark a model as rate-limited
 */
export function markModelAsRateLimited(model: string, cooldownMs: number = 60000) {
  modelCooldown.set(model, Date.now() + cooldownMs);
  console.log(`🔒 Model ${model} marked as rate-limited for ${cooldownMs / 1000}s`);
}

/**
 * Get a key for a specific task.
 * Strategy:
 * 1. Get keys for the task from config
 * 2. Try to find an available key (not in cooldown)
 * 3. If all keys are rate-limited, return first key (will likely fail/wait)
 */
export function getKeyForTask(task: AITask = "generic"): string {
  const now = Date.now();

  // Get keys for this task
  const keysString = taskKeyConfig[task];
  const keys = keysString.split(",").map((k) => k.trim()).filter(Boolean);

  if (!keys.length) {
    console.warn(`⚠️ No keys configured for task: ${task}, using fallback`);
    const fallbackKeys = _config.FALLBACK_API_KEYS?.split(",").filter(Boolean) || [];
    if (!fallbackKeys.length) {
      console.error("No fallback keys available!");
      return "";
    }
    return fallbackKeys[0];
  }


  // Try to find a key that's not in cooldown
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const cooldownUntil = keysCooldown.get(k) || 0;
    if (now >= cooldownUntil) {
      return k;
    }
  }

  // All keys exhausted, return first one
  console.warn(`⚠️ All keys for ${task} are rate-limited. Using first key.`);
  return keys[0];
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
    task?: AITask;
  }
): Promise<string> {
  let currentModel = opts?.model || "gemini-2.0-flash";
  const maxTokens = opts?.maxTokens ?? 800;
  const temperature = opts?.temperature ?? 0.0;
  const retries = opts?.retries ?? 2;
  const timeoutMs = opts?.timeoutMs ?? 30000;
  const task = opts?.task || "generic";

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Get available model (respects cooldowns)
    currentModel = getAvailableModel(currentModel);
    const key = getKeyForTask(task);

    try {
      // Check TPM limit
      // Estimate input tokens (rough approx: 4 chars per token)
      const estimatedInputTokens = prompt.length / 4;
      const estimatedTotalTokens = estimatedInputTokens + maxTokens;
      
      let waitTime = checkAndTrackTPM(estimatedTotalTokens);
      while (waitTime > 0) {
        console.log(`⏳ TPM limit reached (${Math.round(estimatedTotalTokens)} tokens). Waiting ${Math.round(waitTime)}ms...`);
        await new Promise((r) => setTimeout(r, waitTime + 100)); // Wait + buffer
        waitTime = checkAndTrackTPM(estimatedTotalTokens); // Re-check
      }

      const client = new GoogleGenAI({ apiKey: key });

      const aiPromise = client.models.generateContent({
        model: currentModel,
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
        `AI call failed (task: ${task}, model: ${currentModel}, attempt ${attempt + 1}/${retries + 1}):`,
        errorMessage
      );

      // Mark key and model as rate-limited if we hit 429
      if (isRateLimit) {
        markKeyAsRateLimited(key, 60000);
        markModelAsRateLimited(currentModel, 60000);
        console.log(`🔄 Switching to fallback model...`);
      }

      if (
        errorMessage.includes("invalid") ||
        errorMessage.includes("authentication")
      ) {
        console.error("Fatal error - not retrying");
        return "";
      }

      if (attempt < retries) {
        const baseDelay = isRateLimit ? 5000 : 1000; // Shorter delay for model fallback
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
