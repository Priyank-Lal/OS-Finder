import { GoogleGenAI } from "@google/genai";
import { _config } from "../config/config.js";
import { sanitizeJSON } from "./gemini.utils.js";

// --- Key rotation with cooldown tracking ---
const keys = (_config.GEMINI_KEYS || "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

let keyIndex = 0;
const keysCooldown = new Map<string, number>(); // Track rate-limited keys

export function getNextKey() {
  if (!keys.length) {
    console.error(
      "No Gemini keys available — using empty key (AI requests will fail gracefully)"
    );
    return "";
  }
  
  const now = Date.now();
  
  // Try to find a key that's not in cooldown
  for (let i = 0; i < keys.length; i++) {
    const k = keys[keyIndex];
    keyIndex = (keyIndex + 1) % keys.length;
    
    const cooldownUntil = keysCooldown.get(k) || 0;
    if (now >= cooldownUntil) {
      return k;
    }
  }
  
  // All keys are in cooldown, return the first one anyway
  console.warn("⚠️ All API keys are in cooldown, using first key anyway");
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
  }
): Promise<string> {
  const model = opts?.model || "gemini-2.0-flash";
  const maxTokens = opts?.maxTokens ?? 800;
  const temperature = opts?.temperature ?? 0.0;
  const retries = opts?.retries ?? 2; // Increased from 1 to 2
  const timeoutMs = opts?.timeoutMs ?? 30000;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const key = getNextKey();

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
      const isTimeout = errorMessage.includes("timeout");

      console.error(
        `AI call failed (attempt ${attempt + 1}/${retries + 1}):`,
        errorMessage
      );

      // Mark key as rate-limited if we hit 429
      if (isRateLimit) {
        markKeyAsRateLimited(key, 60000); // 60s cooldown
      }

      if (
        errorMessage.includes("invalid") ||
        errorMessage.includes("authentication")
      ) {
        console.error("Fatal error - not retrying");
        return "";
      }

      if (attempt < retries) {
        const baseDelay = isRateLimit ? 60000 : 1000; // 60s for 429, 1s for others
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
