import { _config } from "../config/config";
import { GoogleGenAI } from "@google/genai";

// --- Constants ---
const MAX_README_LENGTH = 5000;
const MAX_FILE_TREE_ITEMS = 50;
const MAX_TOPICS = 20;
const MAX_ISSUE_SAMPLES = 20;
const MAX_CONTRIBUTING_LENGTH = 2000;
const MAX_TECH_STACK = 10;
const MAX_REQUIRED_SKILLS = 10;
const MAX_CONTRIB_AREAS = 6;
const MAX_TASKS = 6;
const MAX_AREA_REASONS = 3;

// --- Key rotation ---
const keys = (_config.GEMINI_KEYS || "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

if (!keys.length) {
  throw new Error(
    "No Gemini keys provided in GEMINI_KEYS environment variable"
  );
}

let keyIndex = 0;

function getNextKey() {
  if (!keys.length) throw new Error("No Gemini keys provided");
  const k = keys[keyIndex];
  keyIndex = (keyIndex + 1) % keys.length;
  return k;
}
// --- Utility helpers ---
function sanitizeJSON(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  // Remove common fences and backticks
  let s = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/`/g, "")
    .trim();

  // Extract JSON object
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");

  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1);
  }

  return s;
}

function safeSlice(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;

  // Ensure we don't break in the middle of a multi-byte character
  let sliced = text.slice(0, maxLength);

  // Check if we might have cut a surrogate pair
  const lastChar = sliced.charCodeAt(sliced.length - 1);
  if (lastChar >= 0xd800 && lastChar <= 0xdbff) {
    // High surrogate - remove it to avoid breaking the pair
    sliced = sliced.slice(0, -1);
  }

  return sliced;
}

async function callAI(
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

// --- Parsing helpers ---
function tryParseJSON<T = any>(raw: string, fallback: T): T {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    // Last attempt: try to extract first JSON object
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as T;
      } catch (e2) {
        console.warn("Failed to parse JSON, using fallback:", e2);
        return fallback;
      }
    }
    return fallback;
  }
}

function ensureStringArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string") return v.trim() ? [v.trim()] : [];
  return [];
}

function sanitizeInput(input: string): string {
  // Remove potentially problematic characters from AI prompts
  return input
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "") // Control characters
    .replace(/[<>]/g, "") // Remove angle brackets to prevent injection
    .trim();
}

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

    const prompt = `SYSTEM: You are an assistant that MUST respond ONLY with raw JSON. No explanation, no markdown, no code fences, no extraneous keys. Follow the schema exactly.

OUTPUT FORMAT:
{
  "summary": "<short 6-7 sentence summary>",
  "level": "beginner|intermediate|advanced",
  "repo_categories": ["cat1","cat2",...]
}

README:
${truncated}

REPO_METADATA:
${metaStr}`;

    const cleaned = await callAI(prompt, {
      model: "gemini-2.5-flash-lite",
      maxTokens: 400,
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

// --- Phase 2: Tech stack & skills ---
export async function generateTechAndSkills(context: {
  readme: string;
  fileTree?: string[];
  topics?: string[];
}): Promise<{ tech_stack: string[]; required_skills: string[] }> {
  try {
    if (!context.readme || !context.readme.trim()) {
      console.warn("Empty README provided to generateTechAndSkills");
      return { tech_stack: [], required_skills: [] };
    }

    const readme = safeSlice(sanitizeInput(context.readme), MAX_README_LENGTH);
    const fileTreeSnippet = ensureStringArray(context.fileTree).slice(
      0,
      MAX_FILE_TREE_ITEMS
    );
    const topics = ensureStringArray(context.topics).slice(0, MAX_TOPICS);

    const prompt = `SYSTEM: Respond ONLY with raw JSON.

OUTPUT SCHEMA:
{
  "tech_stack": ["React","TypeScript"],
  "required_skills": ["React","TypeScript","Unit testing"]
}

INSTRUCTIONS:
1. Identify concrete technologies and tools used in the project (use README and top-level file names).
2. Identify practical skills a contributor needs (3-8 entries).

README_SNIPPET:
${readme}

FILE_TREE_TOPLEVEL:
${JSON.stringify(fileTreeSnippet)}

TOPICS:
${JSON.stringify(topics)}`;

    const cleaned = await callAI(prompt, {
      model: "gemini-2.5-flash-lite",
      maxTokens: 300,
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

// --- Phase 3: Contribution areas ---
export async function generateContributionAreas(context: {
  issue_counts?: any;
  issue_samples?: { title: string; labels: string[] }[];
  topics?: string[];
  phase1?: any;
  phase2?: any;
  contributing_md?: string | null;
}): Promise<{
  main_contrib_areas: { area: string; confidence: number; reasons: string[] }[];
}> {
  try {
    const issueSamples = (context.issue_samples || [])
      .slice(0, MAX_ISSUE_SAMPLES)
      .map((s) => ({
        title: sanitizeInput(String(s.title || "")),
        labels: ensureStringArray(s.labels),
      }))
      .filter((s) => s.title);

    const counts = context.issue_counts || {};
    const phase1 = context.phase1 || {};
    const phase2 = context.phase2 || {};
    const contributing = context.contributing_md
      ? safeSlice(
          sanitizeInput(context.contributing_md),
          MAX_CONTRIBUTING_LENGTH
        )
      : "";

    const prompt = `SYSTEM: Output ONLY raw JSON.

OUTPUT SCHEMA:
{ "main_contrib_areas": [{"area":"name","confidence":0.0,"reasons":["..."]}] }

INPUTS:
ISSUE_COUNTS:${JSON.stringify(counts)}
ISSUE_SAMPLES:${JSON.stringify(issueSamples)}
PHASE1:${JSON.stringify(phase1)}
PHASE2:${JSON.stringify(phase2)}
CONTRIBUTING_MD_SNIPPET:${contributing}`;

    const cleaned = await callAI(prompt, {
      model: "gemini-2.5-flash-lite",
      maxTokens: 300,
      temperature: 0.0,
      retries: 2,
      timeoutMs: 30000,
    });

    if (!cleaned) {
      console.warn("AI returned empty response for contribution areas");
      return { main_contrib_areas: [] };
    }

    const parsed = tryParseJSON(cleaned, { main_contrib_areas: [] });

    const items = Array.isArray(parsed.main_contrib_areas)
      ? parsed.main_contrib_areas
      : [];

    const normalized = items
      .slice(0, MAX_CONTRIB_AREAS)
      .map((it: any) => ({
        area: String(it.area || "")
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9\-]/g, "")
          .slice(0, 50), // Prevent extremely long area names
        confidence: Math.max(0, Math.min(1, Number(it.confidence || 0))),
        reasons: ensureStringArray(it.reasons).slice(0, MAX_AREA_REASONS),
      }))
      .filter((item) => item.area); // Remove empty areas

    return { main_contrib_areas: normalized };
  } catch (err) {
    console.error("generateContributionAreas failed:", err);
    return { main_contrib_areas: [] };
  }
}

// --- Phase 4: Task suggestions ---
export async function generateTaskSuggestions(
  context: any
): Promise<{ beginner_tasks: any[]; intermediate_tasks: any[] }> {
  try {
    const phase1 = context.phase1 || {};
    const phase2 = context.phase2 || {};
    const phase3 = context.phase3 || {};
    const issueSamples = (context.issue_samples || [])
      .slice(0, 10)
      .map((s: any) => ({
        title: sanitizeInput(String(s.title || "")),
      }))
      .filter((s: any) => s.title);

    const scores = context.scores || {};

    const prompt = `SYSTEM: Return ONLY raw JSON.

OUTPUT SCHEMA:
{ 
  "beginner_tasks": [{"title":"..","why":"..","approx_effort":"low","example_issue_title":""}], 
  "intermediate_tasks": [{"title":"..","why":"..","approx_effort":"medium","example_issue_title":""}] 
}

INPUTS:
PHASE1:${JSON.stringify(phase1)}
PHASE2:${JSON.stringify(phase2)}
PHASE3:${JSON.stringify(phase3)}
ISSUE_SAMPLES:${JSON.stringify(issueSamples)}
SCORES:${JSON.stringify(scores)}`;

    const cleaned = await callAI(prompt, {
      model: "gemini-2.5-flash-lite",
      maxTokens: 400,
      temperature: 0.0,
      retries: 2,
      timeoutMs: 30000,
    });

    if (!cleaned) {
      console.warn("AI returned empty response for task suggestions");
      return { beginner_tasks: [], intermediate_tasks: [] };
    }

    const parsed = tryParseJSON(cleaned, {
      beginner_tasks: [],
      intermediate_tasks: [],
    });

    const normalizeTask = (t: any) => ({
      title: String(t.title || "").trim(),
      why: String(t.why || "").trim(),
      approx_effort: String(t.approx_effort || "low").toLowerCase(),
      example_issue_title: t.example_issue_title
        ? String(t.example_issue_title).trim()
        : "",
    });

    return {
      beginner_tasks: Array.isArray(parsed.beginner_tasks)
        ? parsed.beginner_tasks
            .slice(0, MAX_TASKS)
            .map(normalizeTask)
            .filter((t) => t.title && t.why)
        : [],
      intermediate_tasks: Array.isArray(parsed.intermediate_tasks)
        ? parsed.intermediate_tasks
            .slice(0, MAX_TASKS)
            .map(normalizeTask)
            .filter((t) => t.title && t.why)
        : [],
    };
  } catch (err) {
    console.error("generateTaskSuggestions failed:", err);
    return { beginner_tasks: [], intermediate_tasks: [] };
  }
}
