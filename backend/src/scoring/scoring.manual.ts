import { FileTreeMetrics, IProject } from "../models/project.interface";
import {
  calculateArchitectureScore,
  calculateDependenciesScore,
  calculateDocumentationScore,
  calculateDomainScore,
  calculateEngagementScore,
  calculateIssueLabelsScore,
  calculateIssueQualityScore,
  calculatePRActivityScore,
  calculateResponseScore,
  calculateSimplicityScore,
} from "./manual-scoring.helper";
import { UnifiedScoreResult } from "./scoring.interface";

export function scoreWithRules(
  repo: IProject,
  context: {
    readme: string;
    contributingMd?: string;
    fileTreeMetrics?: FileTreeMetrics;
  }
): UnifiedScoreResult {
  // Beginner Friendliness Components
  const docScore = calculateDocumentationScore(repo, context);
  const issueLabelsScore = calculateIssueLabelsScore(repo);
  const responseScore = calculateResponseScore(repo);
  const simplicityScore = calculateSimplicityScore(repo, context);

  const beginnerFriendliness = Math.round(
    docScore * 0.3 +
      issueLabelsScore * 0.25 +
      responseScore * 0.25 +
      simplicityScore * 0.2
  );

  // Technical Complexity Components
  const archScore = calculateArchitectureScore(repo, context);
  const depScore = calculateDependenciesScore(repo, context);
  const domainScore = calculateDomainScore(repo);

  const technicalComplexity = Math.round(
    archScore * 0.4 + depScore * 0.3 + domainScore * 0.3
  );

  // Contribution Readiness Components
  const issueQualityScore = calculateIssueQualityScore(repo);
  const prActivityScore = calculatePRActivityScore(repo);
  const engagementScore = calculateEngagementScore(repo);

  const contributionReadiness = Math.round(
    issueQualityScore * 0.35 + prActivityScore * 0.35 + engagementScore * 0.3
  );

  // Overall score
  const overall = Math.round(
    beginnerFriendliness * 0.35 +
      (100 - technicalComplexity) * 0.25 +
      contributionReadiness * 0.4
  );

  // Determine level
  let level: "beginner" | "intermediate" | "advanced";
  if (beginnerFriendliness >= 70 && technicalComplexity <= 40) {
    level = "beginner";
  } else if (technicalComplexity >= 70 || beginnerFriendliness <= 30) {
    level = "advanced";
  } else {
    level = "intermediate";
  }

  // Calculate confidence based on data availability
  let confidence = 0.3; // Base confidence for rule-based
  if (context.readme.length > 1000) confidence += 0.15;
  if (context.contributingMd) confidence += 0.15;
  if (context.fileTreeMetrics) confidence += 0.15;
  if ((repo.issue_data?.total_open || 0) > 5) confidence += 0.1;
  if (repo.activity?.pr_merge_ratio) confidence += 0.15;

  return {
    beginner_friendliness: beginnerFriendliness,
    technical_complexity: technicalComplexity,
    contribution_readiness: contributionReadiness,
    overall_score: overall,
    recommended_level: level,
    confidence: Math.min(confidence, 1),
    score_breakdown: {
      beginner: {
        documentation: docScore,
        issue_labels: issueLabelsScore,
        community_response: responseScore,
        codebase_simplicity: simplicityScore,
      },
      complexity: {
        architecture: archScore,
        dependencies: depScore,
        domain_difficulty: domainScore,
      },
      contribution: {
        issue_quality: issueQualityScore,
        pr_activity: prActivityScore,
        maintainer_engagement: engagementScore,
      },
    },
    scoring_method: "fallback",
  };
}
