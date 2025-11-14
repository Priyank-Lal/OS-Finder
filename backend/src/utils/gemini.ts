function sanitizeJSON(raw: string) {
  return raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/`/g, "")
    .trim();
}
import { _config } from "../config/config";
import { GoogleGenAI } from "@google/genai";

const keys = _config.GEMINI_KEYS?.split(",") || [];
let index = 0;

function getNextKey() {
  if (keys.length === 0) throw new Error("No Gemini keys provided");
  const key = keys[index];
  index = (index + 1) % keys.length;
  if (!key) throw new Error("Gemini key rotation error");
  return key;
}

export async function generateReadmeSummary(text: string): Promise<{
  summary: string;
  level: "beginner" | "intermediate" | "advanced";
}> {
  const truncated = text.slice(0, 5000);

  const prompt = `You MUST respond ONLY with RAW JSON. Absolutely NO markdown, NO backticks, NO code fences, NO explanations.

Output format:
{
  "summary": "a good summary of the repository's purpose and typical contribution areas.",
  "level": "beginner" | "intermediate" | "advanced"
}

Classification rules:
- beginner: small/simple repo, easy contributions.
- intermediate: moderate complexity.
- advanced: large or framework-level.

README CONTENT (truncate if needed):
${truncated}`;

  const key = getNextKey();

  try {
    const ai = new GoogleGenAI({ apiKey: key });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });

    const raw = response?.text || "";
    const cleaned = sanitizeJSON(raw);
    const parsed = JSON.parse(cleaned);

    return {
      summary: parsed.summary || "",
      level: parsed.level || "intermediate",
    };
  } catch (err: any) {
    console.error(`Gemini error (${key.slice(0, 6)}…):`, err.message);
    return { summary: "", level: "intermediate" };
  }
}

