// --- Phase 3: Contribution areas ---

import { callAI } from "../gemini.client";
import {
  ensureStringArray,
  safeSlice,
  sanitizeInput,
  tryParseJSON,
} from "../gemini.utils";

const MAX_ISSUE_SAMPLES = 20;
const MAX_CONTRIBUTING_LENGTH = 2000;
const MAX_CONTRIB_AREAS = 6;
const MAX_AREA_REASONS = 3;

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

    const prompt = `SYSTEM: Output ONLY raw JSON matching the schema. No extra text.

OUTPUT_SCHEMA:
{
  "main_contrib_areas": [
    {
      "area":"<short-hyphenated-or-phrase>",
      "confidence": 0.0-1.0,
      "reasons": ["short evidence strings - 1-3 items"]
    }
  ]
}

RULES:
- Return 3–6 items, ranked by relevance (most relevant first).
- area: short hyphenated or simple phrase (e.g., "documentation", "frontend-components", "ci-workflows", "tests", "bug-fixes").
- confidence: decimal between 0.00 and 1.00 (2 decimal places).
- reasons: 1–3 short reasons referencing evidence from inputs (issue labels/counts, sample issue titles, CONTRIBUTING.md,etc.).
- If no strong evidence, return an empty array.

INPUTS:
ISSUE_COUNTS:${JSON.stringify(counts)}
ISSUE_SAMPLES:${JSON.stringify(issueSamples)}
PHASE1:${JSON.stringify(phase1)}
PHASE2:${JSON.stringify(phase2)}
CONTRIBUTING_MD_SNIPPET:${contributing}`;

    const cleaned = await callAI(prompt, {
      model: "gemini-2.5-flash-lite",
      maxTokens: 600,
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
