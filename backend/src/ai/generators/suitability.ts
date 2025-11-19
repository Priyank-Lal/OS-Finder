import { callAI } from "../gemini.client";
import { tryParseJSON } from "../gemini.utils";

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
    You are an expert Open Source maintainer evaluating if a GitHub repository is suitable for external contributors.
    
    Analyze the following repository details:
    
    Description: ${data.description}
    Topics: ${data.topics.join(", ")}
    File Structure Summary: ${data.fileTreeSummary || "Not available"}
    
    README Snippet (first 2000 chars):
    ${data.readme.slice(0, 2000)}
    
    Determine if this repository is a REAL software project suitable for open source contribution.
    
    REJECT if:
    - It is a "learning" repo (e.g., "my-first-project", "python-course-assignments").
    - It is a collection of books, resources, or lists (e.g., "awesome-xyz", "books-collection").
    - It is a personal configuration/dotfiles repo.
    - It is a resume or portfolio website.
    - It is clearly abandoned or empty (based on description/readme).
    - It is a tutorial or guide (unless it's a framework/tool *for* tutorials).
    
    ACCEPT if:
    - It is a library, framework, tool, application, or utility.
    - It has potential for code contributions (bug fixes, features).
    
    Return JSON format:
    {
      "isSuitable": boolean,
      "reason": "Short explanation of why it was accepted or rejected",
      "confidence": number (0-1)
    }
  `;

  const response = await callAI(prompt, { temperature: 0.1 });
  
  // Default fallback
  const defaultResult: SuitabilityResult = {
    isSuitable: true,
    reason: "AI evaluation failed, defaulting to suitable",
    confidence: 0,
  };

  return tryParseJSON<SuitabilityResult>(response, defaultResult);
};
