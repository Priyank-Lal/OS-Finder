// --- Utility helpers ---
export function sanitizeJSON(raw: string): string {
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

export function tryParseJSON<T = any>(raw: string, fallback: T): T {
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

export function ensureStringArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string") return v.trim() ? [v.trim()] : [];
  return [];
}

export function safeSlice(text: string, maxLength: number): string {
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

export function sanitizeInput(input: string): string {
  // Remove potentially problematic characters from AI prompts
  return input
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "") // Control characters
    .replace(/[<>]/g, "") // Remove angle brackets to prevent injection
    .trim();
}

// Validate AI results before saving
export function validateAIResults(results: {
  phase1: any;
  phase2: any;
  phase3: any;
  phase4: any;
}): boolean {
  const { phase1, phase2, phase3, phase4 } = results;

  // At minimum, we need a summary or some content
  const hasSummary = phase1?.summary && phase1.summary.length > 10;
  const hasTechStack = phase2?.tech_stack && phase2.tech_stack.length > 0;
  const hasSkills =
    phase2?.required_skills && phase2.required_skills.length > 0;

  if (!hasSummary && !hasTechStack && !hasSkills) {
    console.warn(
      "AI results validation failed: no meaningful content generated"
    );
    return false;
  }

  return true;
}
