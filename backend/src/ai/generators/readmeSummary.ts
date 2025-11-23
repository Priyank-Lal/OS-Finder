import { callAI } from "../gemini.client.js";
import { ensureStringArray, safeSlice, sanitizeInput, tryParseJSON } from "../gemini.utils.js";

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
  "level": "beginner" | "intermediate" | "advanced",
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
- level: choose the *single* best label using README + metadata.
- repo_categories: Choose categories from the ALLOWED CATEGORIES list above. Invent new categories unless necessary.
- Use metadata as supporting signals but do not repeat metadata in summary.

README:
${truncated}

REPO_METADATA:
${metaStr}`;

    const cleaned = await callAI(prompt, {
      model: "gemini-2.5-flash-lite",
      maxTokens: 900,
      temperature: 0.0,
      retries: 2,
      timeoutMs: 30000,
    });

    if (!cleaned) {
      console.warn("AI returned empty response for README summary");
      return { summary: "", level: "intermediate", repo_categories: [] };
    }

    const parsed = tryParseJSON(cleaned, {
      summary: "",
      level: "intermediate",
      repo_categories: [] as string[],
    });

    const summary =
      typeof parsed.summary === "string" ? parsed.summary.trim() : "";

    const level =
      parsed.level === "beginner" || parsed.level === "advanced"
        ? parsed.level
        : "intermediate";

    const repo_categories = ensureStringArray(parsed.repo_categories).slice(
      0,
      5
    );

    return { summary, level, repo_categories };
  } catch (err) {
    console.error("generateReadmeSummary failed:", err);
    return { summary: "", level: "intermediate", repo_categories: [] };
  }
}