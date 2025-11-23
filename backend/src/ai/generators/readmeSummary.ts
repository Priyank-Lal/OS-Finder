import { callAIStructured } from "../structured.client.js";
import { ReadmeSummarySchema } from "../schemas.js";
import { safeSlice, sanitizeInput, ensureStringArray } from "../gemini.utils.js";

const MAX_README_LENGTH = 5000;

// --- Phase 1: README summary ---
export async function generateReadmeSummary(
  readme: string,
  metadata: any
): Promise<{
  summary: string;
  level: "beginner" | "intermediate" | "advanced";
  repo_categories: string[];
}> {
  try {
    if (!readme || !readme.trim()) {
      console.warn("Empty README provided to generateReadmeSummary");
      return { summary: "", level: "intermediate", repo_categories: [] };
    }

    const truncated = safeSlice(sanitizeInput(readme), MAX_README_LENGTH);
    const metaStr = JSON.stringify({
      stars: metadata?.stars ?? 0,
      forks: metadata?.forks ?? 0,
      contributors: metadata?.contributors ?? 0,
      topics: ensureStringArray(metadata?.topics),
      language: metadata?.language ?? null,
      issue_counts: metadata?.issue_counts ?? {},
      activity: metadata?.activity ?? {},
    });

    const prompt = `SYSTEM: You are an assistant that MUST respond ONLY with a single JSON object and nothing else. Do not return any prose, code fences, or commentary. If a value cannot be determined, return an empty string or empty array. Follow Output Schema exactly.

OUTPUT_SCHEMA:
{
  "summary": "<short 6-7 sentence summary describing the project purpose and where contributors are most useful>",
  "repo_categories": ["<category>", "...", ...]
}

ALLOWED CATEGORIES (Choose which suit the repo):
- web-frontend (React, Vue, UI components)
- web-backend (API, server, database tools)
- mobile (iOS, Android, React Native)
- desktop (Electron, Tauri, native apps)
- cli (Command line tools, scripts)
- library (General purpose libraries, SDKs)
- framework (Full frameworks)
- devops (CI/CD, docker, k8s, cloud)
- security (Auth, cryptography, pentesting)
- machine-learning (AI, models, data science)
- blockchain (Web3, crypto, smart contracts)
- game-dev (Engines, mods, tools)
- embedded (IoT, firmware, hardware)
- compiler (Parsers, interpreters, languages)
- utility (Helper tools, productivity)
- education (Tutorials, learning resources - ONLY if it's a tool for learning)
- OR Invent new category if needed

RULES:
- summary: maximum 100-120 words, present tense. Focus on what the project does and 1-2 sentence about likely contribution areas.
- repo_categories: Choose categories from the ALLOWED CATEGORIES list above. Invent new categories unless necessary.
- Use metadata as supporting signals but do not repeat metadata in summary.

README:
${truncated}

REPO_METADATA:
${metaStr}`;

    const result = await callAIStructured(prompt, ReadmeSummarySchema, {
      model: "gemini-2.5-flash-lite",
      maxTokens: 900,
      temperature: 0.0,
      retries: 2,
      task: "readme_summary",
    });

    if (!result) {
      console.warn("AI returned empty response for README summary");
      return { summary: "", level: "intermediate", repo_categories: [] };
    }

    return {
      summary: result.summary.trim(),
      level: "intermediate", // Level is determined by scoring, not AI
      repo_categories: result.repo_categories.slice(0, 5),
    };
  } catch (err) {
    console.error("generateReadmeSummary failed:", err);
    return { summary: "", level: "intermediate", repo_categories: [] };
  }
}