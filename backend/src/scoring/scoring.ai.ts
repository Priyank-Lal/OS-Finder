import { GoogleGenAI } from "@google/genai";
import { FileTreeMetrics, IProject } from "../models/project.interface.js";

import { _config } from "../config/config.js";
import {
  buildRepoContext,
  clamp,
  isValidAIResponse,
  validateLevel,
} from "./scoring.utils.js";
import { AIScoreResponse, UnifiedScoreResult } from "./scoring.interface.js";

export async function scoreWithAI(
  repo: IProject,
  context: {
    readme: string;
    contributingMd?: string;
    fileTreeMetrics?: FileTreeMetrics;
  }
): Promise<UnifiedScoreResult | null> {
  const client = new GoogleGenAI({
    apiKey: _config.SCORING_AI_GEMINI_KEY,
  });

  const repoContext = buildRepoContext(repo, context);

  const prompt = `You are an expert at evaluating open-source repositories for contributor friendliness.

Analyze this repository and provide detailed scoring across three dimensions:

1. **Beginner Friendliness (0-100)**: How welcoming is this repo for new contributors?
   - Documentation quality (README, CONTRIBUTING.md, issue templates)
   - Availability of labeled issues (good-first-issue, help-wanted)
   - Community responsiveness (how fast maintainers respond)
   - Codebase simplicity (easy to understand and navigate)

2. **Technical Complexity (0-100)**: How technically challenging is this project?
   - Architecture complexity (file structure, nesting, patterns)
   - Dependency management (number and complexity of dependencies)
   - Domain difficulty (how specialized is the problem domain)

3. **Contribution Readiness (0-100)**: How ready is this repo to accept contributions?
   - Issue quality (well-defined, labeled, organized)
   - PR activity (merge rate, response time)
   - Maintainer engagement (active, responsive, helpful)

REPOSITORY DATA:
${repoContext}

OUTPUT SCHEMA (return ONLY valid JSON):
{
  "beginner_friendliness": <0-100>,
  "technical_complexity": <0-100>,
  "contribution_readiness": <0-100>,
  "recommended_level": "beginner" | "intermediate" | "advanced",
  "confidence": <0.0-1.0>,
  "reasoning": {
    "beginner": {
      "documentation_score": <0-100>,
      "issue_labels_score": <0-100>,
      "community_response_score": <0-100>,
      "codebase_simplicity_score": <0-100>,
      "explanation": "<2-3 sentence explanation>"
    },
    "complexity": {
      "architecture_score": <0-100>,
      "dependencies_score": <0-100>,
      "domain_difficulty_score": <0-100>,
      "explanation": "<2-3 sentence explanation>"
    },
    "contribution": {
      "issue_quality_score": <0-100>,
      "pr_activity_score": <0-100>,
      "maintainer_engagement_score": <0-100>,
      "explanation": "<2-3 sentence explanation>"
    }
  }
}

SCORING GUIDELINES:
- Use the actual metrics provided (file counts, issue counts, response times)
- Be realistic: most repos are 40-70, not 90+
- Confidence should reflect data completeness (more data = higher confidence)
- Recommended level: 
  * beginner: BF > 70 AND TC < 40
  * advanced: TC > 70 OR BF < 30
  * intermediate: everything else`;

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: prompt,
    maxOutputTokens: 1200,
    temperature: 0.1,
  } as any);

  const text = response?.text || "";
  const cleaned =
    text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim()
      .match(/\{[\s\S]*\}/)?.[0] || "{}";

  let parsed: AIScoreResponse;
  try {
    parsed = JSON.parse(cleaned);
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    return null;
  }

  // Validate response
  if (!isValidAIResponse(parsed)) {
    console.error("Invalid AI response structure");
    return null;
  }

  // Calculate overall score
  const overall =
    parsed.beginner_friendliness * 0.35 +
    (100 - parsed.technical_complexity) * 0.25 +
    parsed.contribution_readiness * 0.4;

  return {
    beginner_friendliness: clamp(
      Math.round(parsed.beginner_friendliness),
      0,
      100
    ),
    technical_complexity: clamp(
      Math.round(parsed.technical_complexity),
      0,
      100
    ),
    contribution_readiness: clamp(
      Math.round(parsed.contribution_readiness),
      0,
      100
    ),
    overall_score: clamp(Math.round(overall), 0, 100),
    recommended_level: (() => {
      const bf = clamp(Math.round(parsed.beginner_friendliness), 0, 100);
      const tc = clamp(Math.round(parsed.technical_complexity), 0, 100);
      const cr = clamp(Math.round(parsed.contribution_readiness), 0, 100);
      
      // Beginner: Simple, friendly, AND active/ready
      if (bf >= 70 && tc <= 40 && cr >= 50) return "beginner";
      
      // Advanced: Complex OR unfriendly OR very hard to contribute to
      if (tc >= 70 || bf <= 30) return "advanced";
      
      return "intermediate";
    })(),
    confidence: clamp(parsed.confidence, 0, 1),
    score_breakdown: {
      beginner: {
        documentation: Math.round(
          parsed.reasoning.beginner.documentation_score
        ),
        issue_labels: Math.round(parsed.reasoning.beginner.issue_labels_score),
        community_response: Math.round(
          parsed.reasoning.beginner.community_response_score
        ),
        codebase_simplicity: Math.round(
          parsed.reasoning.beginner.codebase_simplicity_score
        ),
      },
      complexity: {
        architecture: Math.round(
          parsed.reasoning.complexity.architecture_score
        ),
        dependencies: Math.round(
          parsed.reasoning.complexity.dependencies_score
        ),
        domain_difficulty: Math.round(
          parsed.reasoning.complexity.domain_difficulty_score
        ),
      },
      contribution: {
        issue_quality: Math.round(
          parsed.reasoning.contribution.issue_quality_score
        ),
        pr_activity: Math.round(
          parsed.reasoning.contribution.pr_activity_score
        ),
        maintainer_engagement: Math.round(
          parsed.reasoning.contribution.maintainer_engagement_score
        ),
      },
    },
    scoring_method: "ai",
  };
}