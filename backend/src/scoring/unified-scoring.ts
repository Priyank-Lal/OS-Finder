import { _config } from "../config/config.js";
import { IProject } from "../models/project.interface.js";
import { FileTreeMetrics } from "../utils/fileTreeAnalyzer.js";
import { scoreWithAI } from "./scoring.ai.js";
import { UnifiedScoreResult } from "./scoring.interface.js";
import { scoreWithRules } from "./scoring.manual.js";

export async function computeUnifiedScore(
  repo: IProject,
  context: {
    readme: string;
    contributingMd?: string;
    fileTreeMetrics?: FileTreeMetrics;
  }
): Promise<UnifiedScoreResult> {
  try {
    // Try AI-first approach
    const aiScore = await scoreWithAI(repo, context);

    if (aiScore && aiScore.confidence >= 0.6) {
      console.log(
        `✓ AI scoring successful for ${repo.repo_name} (confidence: ${aiScore.confidence})`
      );
      return {
        ...aiScore,
        scoring_method: "ai",
      };
    }

    console.warn(
      `⚠ AI scoring failed or low confidence for ${repo.repo_name}, using fallback`
    );
  } catch (error) {
    console.error(`✗ AI scoring error for ${repo.repo_name}:`, error);
  }

  // Fallback to rule-based scoring
  const fallbackScore = scoreWithRules(repo, context);
  return {
    ...fallbackScore,
    scoring_method: "fallback",
  };
}
