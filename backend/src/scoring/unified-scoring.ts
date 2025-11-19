import { _config } from "../config/config";
import { IProject } from "../models/project.interface";
import { FileTreeMetrics } from "../utils/fileTreeAnalyzer";
import { scoreWithAI } from "./scoring.ai";
import { UnifiedScoreResult } from "./scoring.interface";
import { scoreWithRules } from "./scoring.manual";

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
