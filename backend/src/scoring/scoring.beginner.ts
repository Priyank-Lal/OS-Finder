import { IProject } from "../models/project.interface";
import { CodebaseComplexityAnalysis } from "./scoring.ai";
import { WEIGHTS } from "./scoring.weights";

export interface DetailedScores {
  beginner_friendliness: number; // 0-100: How beginner-friendly
  technical_complexity: number; // 0-100: How technically complex
  contribution_readiness: number; // 0-100: How ready for contributions
  overall_score: number; // 0-100: Weighted overall
  recommended_level: string; // "beginner" | "intermediate" | "advanced"
  confidence: number; // 0-1: How confident are we
  breakdown: {
    beginner: Record<string, number>;
    complexity: Record<string, number>;
    contribution: Record<string, number>;
  };
}

export function computeBeginnerFriendliness(
  repo: IProject,
  aiAnalysis?: CodebaseComplexityAnalysis
): { score: number; breakdown: Record<string, number> } {
  // 1. Documentation Score (0-100)
  const hasReadme = (repo.readme_raw?.length || 0) > 500;
  const hasContributing = repo.has_contributing;
  const hasClearDescription = (repo.description?.length || 0) > 50;

  const documentationScore =
    (hasReadme ? 50 : 0) +
    (hasContributing ? 30 : 0) +
    (hasClearDescription ? 20 : 0);

  // 2. Issue Labels Score (0-100)
  const gfi = repo.issue_data?.good_first_issue_count || 0;
  const helpWanted = repo.issue_data?.help_wanted_count || 0;
  const beginner = repo.issue_data?.beginner_count || 0;
  const doc = repo.issue_data?.documentation_count || 0;

  const totalBeginnerIssues = gfi + helpWanted + beginner + doc;
  const issueLabelsScore = Math.min(
    100,
    gfi * 15 + helpWanted * 10 + beginner * 10 + doc * 5
  );

  // 3. Community Size Score (0-100)
  // Sweet spot: 10-100 contributors (too few = inactive, too many = intimidating)
  const contributors = repo.contributors || 0;
  const stars = repo.stars || 0;

  let communityScore = 0;
  if (contributors >= 5 && contributors <= 50) {
    communityScore = 100; // Sweet spot for beginners
  } else if (contributors < 5) {
    communityScore = contributors * 20; // 0-4 contributors
  } else {
    // Diminishing returns after 50
    communityScore = Math.max(40, 100 - (contributors - 50) * 0.5);
  }

  // Adjust for stars (too popular can be intimidating)
  if (stars > 50000) communityScore *= 0.7;

  // 4. Codebase Simplicity Score (0-100)
  let codebaseSimplicityScore = 50; // Default

  if (aiAnalysis) {
    // Invert AI complexity scores (high complexity = low simplicity)
    const avgComplexity =
      (aiAnalysis.architecture_score +
        aiAnalysis.abstraction_level +
        aiAnalysis.domain_difficulty) /
      3;

    codebaseSimplicityScore = 100 - avgComplexity * 10;
  }

  // 5. Setup Ease Score (0-100)
  let setupEaseScore = 50; // Default

  if (aiAnalysis) {
    setupEaseScore = 100 - aiAnalysis.setup_complexity * 10;
  }

  // Bonus for common beginner languages
  const beginnerLangs = ["javascript", "python", "html", "css", "markdown"];
  if (beginnerLangs.includes(repo.language?.toLowerCase() || "")) {
    setupEaseScore = Math.min(100, setupEaseScore + 10);
  }

  const breakdown = {
    documentation: documentationScore,
    issueLabels: issueLabelsScore,
    communitySize: communityScore,
    codebaseSimplicity: codebaseSimplicityScore,
    setupEase: setupEaseScore,
  };

  // Weighted average
  const score =
    breakdown.documentation * WEIGHTS.beginner.documentation +
    breakdown.issueLabels * WEIGHTS.beginner.issueLabels +
    breakdown.communitySize * WEIGHTS.beginner.communitySize +
    breakdown.codebaseSimplicity * WEIGHTS.beginner.codebaseSimplicity +
    breakdown.setupEase * WEIGHTS.beginner.setupEase;

  return { score: Math.round(score), breakdown };
}
