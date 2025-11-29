import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getKeyForTask, markKeyAsRateLimited, markModelAsRateLimited, getAvailableModel, AITask } from "./gemini.client.js";
import { z } from "zod";

/**
 * Call AI with structured output using LangChain's withStructuredOutput
 * This uses Google's native JSON schema enforcement for reliable outputs
 */
export async function callAIStructured<T extends z.ZodType>(
  prompt: string,
  schema: T,
  opts?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    retries?: number;
    task?: AITask;
  }
): Promise<z.infer<T> | null> {
  let currentModel = opts?.model || "gemini-2.0-flash";
  const maxTokens = opts?.maxTokens ?? 800;
  const temperature = opts?.temperature ?? 0.0;
  const retries = opts?.retries ?? 2;
  const task = opts?.task || "generic";

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Get available model (respects cooldowns)
    currentModel = getAvailableModel(currentModel);
    const key = getKeyForTask(task);

    try {
      const model = new ChatGoogleGenerativeAI({
        apiKey: key,
        model: currentModel,
        maxOutputTokens: maxTokens,
        temperature,
      });

      const structuredModel = model.withStructuredOutput(schema);
      
      const result = await structuredModel.invoke(prompt);

      return result as z.infer<T>;
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      const isRateLimit =
        errorMessage.includes("429") ||
        errorMessage.includes("quota") ||
        errorMessage.includes("RESOURCE_EXHAUSTED");

      console.error(
        `AI structured call failed (task: ${task}, model: ${currentModel}, attempt ${attempt + 1}/${retries + 1}):`,
        errorMessage
      );

      // Mark key and model as rate-limited if we hit 429
      if (isRateLimit) {
        markKeyAsRateLimited(key, 60000);
        markModelAsRateLimited(currentModel, 60000);
        console.log(`🔄 Switching to fallback model...`);
      }

      if (attempt < retries) {
        const baseDelay = isRateLimit ? 5000 : 1000; // Shorter delay for model fallback
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`Retrying in ${Math.round(delay)}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        console.error("Max retries reached, returning null");
        return null;
      }
    }
  }

  return null;
}
