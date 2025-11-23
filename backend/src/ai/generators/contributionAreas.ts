// --- Phase 3: Contribution areas ---

import { callAIStructured } from "../structured.client.js";
import { ContributionAreasSchema } from "../schemas.js";
import {
  ensureStringArray,
  safeSlice,
  sanitizeInput,
} from "../gemini.utils.js";

const MAX_ISSUE_SAMPLES = 20;
const MAX_CONTRIBUTING_LENGTH = 2000;

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

    const result = await callAIStructured(prompt, ContributionAreasSchema, {
      model: "gemini-2.5-flash-lite",
      maxTokens: 600,
      temperature: 0.0,
      retries: 2,
    });

    if (!result) {
      console.warn("AI returned empty response for contribution areas");
      return { main_contrib_areas: [] };
    }

    return result;
  } catch (err) {
    console.error("generateContributionAreas failed:", err);
    return { main_contrib_areas: [] };
  }
}
