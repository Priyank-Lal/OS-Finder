import { callAI } from "../gemini.client.js";
import { tryParseJSON } from "../gemini.utils.js";

export interface SuitabilityResult {
  isSuitable: boolean;
  reason: string;
  confidence: number;
}

export const generateSuitabilityEvaluation = async (data: {
  readme: string;
  description: string;
  topics: string[];
  fileTreeSummary?: string;
}): Promise<SuitabilityResult> => {
  const prompt = `
    You are a STRICT filter for an open-source contribution platform.
    Your ONLY job is to separate REAL software projects from non-software repositories.

    GOAL: Accept ALL valid software projects (libraries, tools, apps, frameworks) regardless of complexity, size, or difficulty.
    
    CRITICAL RULES:
    1. **ACCEPT** any repository that contains actual source code for a library, tool, framework, or application.
       - Examples: React, Linux, VS Code, small CLI tools, utility libraries.
       - Complexity does NOT matter. "Too hard for beginners" is NOT a reason to reject.
       - Strict contribution rules (CLA, guidelines) are NOT a reason to reject.

    2. **REJECT** only if it is fundamentally NOT a software project:
       - **Learning/Homework**: "my-first-project", "algorithms-practice", "leetcode-solutions", "course-assignments".
       - **Lists/Collections**: "awesome-xyz", "resources-list", "books-collection".
       - **Docs/Reference**: Style guides, cheat sheets, pure documentation.
       - **Personal/Config**: Dotfiles, resumes, portfolios, blogs, system config.
       - **Data-only**: Datasets, JSON lists, static assets without tools.
       - **Empty/Abandoned**: No code, just a README.

    If a repo is a real software project but very advanced (e.g. PyTorch, Kubernetes), you MUST ACCEPT it.

    Repository Details:
    Description: ${data.description}
    Topics: ${data.topics.join(", ")}
    File Structure: ${data.fileTreeSummary || "Not available"}
    
    README (first 4000 chars):
    ${data.readme.slice(0, 4000)}
    
    Return ONLY valid JSON:
    {
      "isSuitable": boolean,
      "reason": "Brief explanation (max 100 chars)",
      "confidence": number (0-1)
    }
  `;

  const response = await callAI(prompt, {
    model: "gemini-2.0-flash",
    temperature: 0.0, // Make it more deterministic
  });

  if (!response) {
    throw new Error("AI suitability evaluation failed (empty response)");
  }

  const defaultResult: SuitabilityResult = {
    isSuitable: false, // Fail safe: reject if parsing fails
    reason: "AI evaluation parsing failed",
    confidence: 0,
  };
  
  return tryParseJSON<SuitabilityResult>(response, defaultResult);
};
