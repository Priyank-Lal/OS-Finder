import { IProject, Project } from "../models/project.model";

const WEIGHTS = {
  friendliness: 0.4, // Beginner friendliness
  maintenance: 0.4, // Maintainer responsiveness/activity
  accessibility: 0.2, // CONTRIBUTING + beginner signals + summary level
};

function normalize(value: number, min: number, max: number) {
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

export function computeFinalScore(repo: IProject): number {
  const beginnerRaw = repo.beginner_issue_total || 0;
  const beginnerNorm = normalize(beginnerRaw, 0, 15); // 15 beginner issues = max
  const friendlinessScore = beginnerNorm;

  const mergeRatio = repo.activity.pr_merge_ratio || 0;
  const mergeTime = repo.activity.avg_pr_merge_hours || 9999;

  const mergeTimeNorm = 1 - normalize(mergeTime, 0, 720); // 720h = 30 days
  const mergeRatioNorm = normalize(mergeRatio, 0.2, 1); // <20% is weak

  const maintenanceScore = mergeTimeNorm * 0.5 + mergeRatioNorm * 0.5;

  let summaryLevelBoost = 0;
  if (repo.summary_level === "beginner") summaryLevelBoost = 1;
  else if (repo.summary_level === "intermediate") summaryLevelBoost = 0.5;
  else summaryLevelBoost = 0;

  const contributingBoost = repo.has_contributing ? 1 : 0;
  const beginnerScoreNorm = normalize(repo.beginner_issue_score || 0, 0, 30);

  const accessibilityScore =
    beginnerScoreNorm * 0.5 + contributingBoost * 0.3 + summaryLevelBoost * 0.2;

  const finalScore =
    friendlinessScore * WEIGHTS.friendliness +
    maintenanceScore * WEIGHTS.maintenance +
    accessibilityScore * WEIGHTS.accessibility;

  return Number(finalScore.toFixed(4));
}
