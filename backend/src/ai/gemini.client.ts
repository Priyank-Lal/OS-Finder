import { GoogleGenAI } from "@google/genai";
import { _config } from "../config/config";
import { sanitizeJSON } from "./gemini.utils";

// --- Key rotation ---
const keys = (_config.GEMINI_KEYS || "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

let keyIndex = 0;

export function getNextKey() {
  if (!keys.length) {
    console.error(
      "No Gemini keys available — using empty key (AI requests will fail gracefully)"
    );
    return "";
  }
  const k = keys[keyIndex];
  keyIndex = (keyIndex + 1) % keys.length;
  return k;
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
  const model = opts?.model || "gemini-2.5-flash-lite";
  const maxTokens = opts?.maxTokens ?? 800;
  const temperature = opts?.temperature ?? 0.0;
  const retries = opts?.retries ?? 1;
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
        errorMessage.includes("429") || errorMessage.includes("quota");
      const isTimeout = errorMessage.includes("timeout");

      console.error(
        `AI call failed (attempt ${attempt + 1}/${retries + 1}):`,
        errorMessage
      );

      if (
        errorMessage.includes("invalid") ||
        errorMessage.includes("authentication")
      ) {
        console.error("Fatal error - not retrying");
        return "";
      }

      if (attempt < retries) {
        const baseDelay = isRateLimit ? 2000 : 500;
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
