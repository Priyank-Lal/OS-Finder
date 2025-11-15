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
  repo_categories: string[];
}> {
  const truncated = text.slice(0, 5000);

  const prompt = `You MUST respond ONLY with RAW JSON. Absolutely NO markdown, NO backticks, NO code fences, NO explanations.

Output format:
{
  "summary": "a concise summary of the repository's purpose and contribution areas.",
  "level": "beginner" | "intermediate" | "advanced",
  "repo_categories": ["category1", "category2", "category3"]
}

Category rules:
- Provide 1 to 3 categories max.
- Categories should be short, lowercase, and hyphen-separated (e.g., "devtool", "cli", "web-framework", "ml-library", "database-tool").
- Do NOT invent overly specific or obscure categories.
- Prefer: cli, devtool, web-framework, backend, frontend, ml, testing, api-wrapper, utility, database, documentation, security, devops, mobile, cloud-sdk, package-manager.

Classification rules:
- beginner: simple repositories with accessible contribution paths.
- intermediate: moderately complex repos with structured contribution areas.
- advanced: large frameworks, tools, or multi-module systems.

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
      repo_categories: parsed.repo_categories || [],
    };
  } catch (err: any) {
    console.error(`Gemini error (${key.slice(0, 6)}…):`, err.message);
    return { summary: "", level: "intermediate", repo_categories: [] };
  }
}
