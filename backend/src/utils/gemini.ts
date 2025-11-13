import { _config } from "../config/config";
import { GoogleGenAI } from "@google/genai";

const keys = _config.GEMINI_KEYS?.split(",") || [];
let index = 0;

function getNextKey() {
  if (keys.length === 0) throw new Error("No Gemini keys provided");
  const key = keys[index];
  index = (index + 1) % keys.length;
  return key;
}

export async function generateReadmeSummary(text: string): Promise<string> {
  const truncated = text.slice(0, 2000);
  const prompt = `Summarize this repository's purpose and contribution scope in 2–3 lines:\n\n${truncated}`;
  const key = getNextKey();

  try {
    const ai = new GoogleGenAI({
      apiKey: key,
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });
    const summary = response?.text?.trim();

    return summary ?? "";
  } catch (err: any) {
    console.error(`Gemini error (${key.slice(0, 6)}…):`, err.message);
    return "";
  }
}
