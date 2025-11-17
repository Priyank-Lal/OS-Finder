import { callAI } from "../gemini.client";
import { sanitizeInput, tryParseJSON } from "../gemini.utils";

const MAX_TASKS = 6;

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

OUTPUT_SCHEMA:
{
  "beginner_tasks": [
    {"title":"<one-line task>", "why":"<one-line reason>", "approx_effort":"low|medium|high", "example_issue_title":"<optional>"}
  ],
  "intermediate_tasks": [
    {"title":"...", "why":"...", "approx_effort":"low|medium|high", "example_issue_title":""}
  ]
}

RULES:
1. Provide 3–6 beginner tasks (prefer low effort) and 3–6 intermediate tasks (medium effort).
2. Each task must be actionable and justified with 1-line "why".
3. If an existing open issue closely matches a task, populate "example_issue_title".
4. Avoid vague suggestions — be concrete (file/path/feature names if in inputs).
5. If friendliness score is low (<0.3) and level == 'advanced', reduce beginner tasks to 0–2.

INPUTS:
PHASE1:${JSON.stringify(phase1)}
PHASE2:${JSON.stringify(phase2)}
PHASE3:${JSON.stringify(phase3)}
ISSUE_SAMPLES:${JSON.stringify(issueSamples)}
SCORES:${JSON.stringify(scores)}`;

    const cleaned = await callAI(prompt, {
      model: "gemini-2.5-flash-lite",
      maxTokens: 800,
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
