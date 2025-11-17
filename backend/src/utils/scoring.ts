import { IProject } from "../models/project.interface";
import { analyzeCodebaseComplexity, CodebaseComplexityAnalysis } from "../scoring";
import { computeBeginnerFriendliness,  } from "../scoring/scoring.beginner";
import { computeTechnicalComplexity } from "../scoring/scoring.complexity";
import { computeContributionReadiness } from "../scoring/scoring.contribution";

export async function computeDetailedScores(
  repo: IProject,
  options?: {
    aiAnalysis?: CodebaseComplexityAnalysis;
    includeAIAnalysis?: boolean;
  }
): Promise<DetailedScores> {
  let aiAnalysis = options?.aiAnalysis;

  // Optionally run AI analysis
  if (options?.includeAIAnalysis && !aiAnalysis) {
    const fileTree = repo.tech_stack || [];
    aiAnalysis = await analyzeCodebaseComplexity(
      repo.readme_raw || "",
      fileTree,
      repo.language || "unknown",
      repo.topics || [],
      repo.contributing_raw
    );
  }

  // Compute three main scores
  const beginnerResult = computeBeginnerFriendliness(repo, aiAnalysis);
  const complexityResult = computeTechnicalComplexity(repo, aiAnalysis);
  const contributionResult = computeContributionReadiness(repo);

  // Coupling normalization
  const F = beginnerResult.score / 100;
  const C = complexityResult.score / 100;

  const adjustedFriendliness = Math.round(F * (1 - C) * 100);
  const adjustedComplexity = Math.round(C * (1 - F) * 100);

  // Overall score: weighted combination
  // For overall, we want repos that are either:
  // - High beginner-friendly + low complexity, OR
  // - High contribution-ready
  const overall =
    adjustedFriendliness * 0.35 +
    (100 - adjustedComplexity) * 0.25 + // Inverse complexity
    contributionResult.score * 0.4;

  // Determine recommended level
  let recommendedLevel: string;

  if (aiAnalysis?.recommended_experience) {
    recommendedLevel = aiAnalysis.recommended_experience;
  } else {
    // Fallback logic
    if (adjustedFriendliness >= 70 && adjustedComplexity <= 40) {
      recommendedLevel = "beginner";
    } else if (adjustedComplexity >= 70 || adjustedFriendliness <= 30) {
      recommendedLevel = "advanced";
    } else {
      recommendedLevel = "intermediate";
    }
  }

  // Confidence based on data completeness
  let confidence = 0.5; // Base confidence

  if (repo.readme_raw && repo.readme_raw.length > 500) confidence += 0.1;
  if (repo.has_contributing) confidence += 0.1;
  if ((repo.issue_data?.total_open_issues || 0) > 5) confidence += 0.1;
  if (repo.activity?.pr_merge_ratio) confidence += 0.1;
  if (aiAnalysis) confidence += 0.2;

  confidence = Math.min(1, confidence);

  return {
    beginner_friendliness: adjustedFriendliness,
    technical_complexity: adjustedComplexity,
    contribution_readiness: contributionResult.score,
    overall_score: Math.round(overall),
    recommended_level: recommendedLevel,
    confidence,
    breakdown: {
      beginner: beginnerResult.breakdown,
      complexity: complexityResult.breakdown,
      contribution: contributionResult.breakdown,
    },
  };
}

