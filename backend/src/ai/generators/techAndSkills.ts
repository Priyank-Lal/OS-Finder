import { callAI } from "../gemini.client.js";
import { ensureStringArray, safeSlice, sanitizeInput, tryParseJSON } from "../gemini.utils.js";

// --- Phase 2: Tech stack & skills ---
const MAX_README_LENGTH = 5000;
const MAX_TOPICS = 20;
const MAX_TECH_STACK = 10;
const MAX_REQUIRED_SKILLS = 10;


export async function generateTechAndSkills(context: {
  readme: string;
  languages: string[]
  topics?: string[];
}): Promise<{ tech_stack: string[]; required_skills: string[] }> {
  try {
    if (!context.readme || !context.readme.trim()) {
      console.warn("Empty README provided to generateTechAndSkills");
      return { tech_stack: [], required_skills: [] };
    }

    const readme = safeSlice(sanitizeInput(context.readme), MAX_README_LENGTH);
    const topics = ensureStringArray(context.topics).slice(0, MAX_TOPICS);

    const prompt = `SYSTEM: Respond ONLY with raw JSON and nothing else.

OUTPUT_SCHEMA:
{
  "tech_stack": ["<TechName>", "..."],        // e.g., "React", "Node.js", "Postgres", etc.
  "required_skills": ["<Skill>", "..."]      // e.g., "TypeScript", "Unit testing with Jest", etc.
}

INSTRUCTIONS:
1. Identify the project's concrete technologies from README, languages and topics. Prefer common canonical names (e.g., "Node.js", "TypeScript", "React", "Next.js", "Docker", "Postgres", "Redis", "GitHub Actions", "Jest",etc.).
2. For required_skills, list practical, contributor-focused skills (3-8 entries). Prefer actionable phrases like "React + JSX", "TypeScript", "unit testing (Jest)", "writing GitHub Actions".
3. Return arrays only. If uncertain, return empty arrays.


README_SNIPPET:
${readme}

TOPICS:
${JSON.stringify(topics)}`;

    const cleaned = await callAI(prompt, {
      model: "gemini-2.5-flash-lite",
      maxTokens: 600,
      temperature: 0.0,
      retries: 2,
      timeoutMs: 30000,
    });

    if (!cleaned) {
      console.warn("AI returned empty response for tech and skills");
      return { tech_stack: [], required_skills: [] };
    }

    const parsed = tryParseJSON(cleaned, {
      tech_stack: [],
      required_skills: [],
    });

    return {
      tech_stack: ensureStringArray(parsed.tech_stack).slice(0, MAX_TECH_STACK),
      required_skills: ensureStringArray(parsed.required_skills).slice(
        0,
        MAX_REQUIRED_SKILLS
      ),
    };
  } catch (err) {
    console.error("generateTechAndSkills failed:", err);
    return { tech_stack: [], required_skills: [] };
  }
}
