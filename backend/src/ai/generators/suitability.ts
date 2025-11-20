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
    You are a STRICT filter for an open-source contribution platform. Your job is to REJECT repositories that are NOT suitable for meaningful code contributions.
    
    Repository Details:
    Description: ${data.description}
    Topics: ${data.topics.join(", ")}
    File Structure: ${data.fileTreeSummary || "Not available"}
    
    README (first 4000 chars):
    ${data.readme.slice(0, 4000)}
    
    CRITICAL: You must REJECT the following types of repositories:
    
    1. **Learning/Educational Projects**:
       - Algorithm implementations (e.g., "javascript-algorithms", "python-algorithms", "data-structures")
       - Coding challenge solutions (leetcode, hackerrank, codewars, etc.)
       - Tutorial collections or course materials
       - "Learn X" or "X for beginners" projects
       - Practice/exercise repositories
       - University/homework assignments
    
    2. **Reference/Documentation Only**:
       - Style guides (e.g., "airbnb-javascript", "google-style-guide")
       - Awesome lists or curated collections
       - Books, papers, or reading lists
       - Cheat sheets or quick references
       - Resource compilations
    
    3. **Personal/Non-Collaborative**:
       - Personal dotfiles or configurations
       - Resumes, portfolios, or personal websites
       - Blog repositories
       - Personal notes or documentation
    
    4. **Inactive/Empty**:
       - Clearly abandoned projects
       - Empty or template repositories
       - Archived projects
    
    ONLY ACCEPT if the repository is:
    - A production library, framework, or tool used by others (e.g. React, Vue, Angular, etc.)
    - An application with ongoing development
    - A utility or service that solves a real problem
    - Has clear evidence of active maintenance and real-world usage
    
    IMPORTANT CLARIFICATION:
    - DO NOT reject a project just because it is large, complex, or has strict contribution rules (like React, Linux, VS Code). These ARE suitable.
    - DO NOT reject a project just because it is "hard" for beginners.
    - ONLY reject if it is fundamentally NOT a software project (e.g. a list, a book, a tutorial) or is purely for personal learning.
    
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
