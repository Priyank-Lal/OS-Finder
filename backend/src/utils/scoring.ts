import { IProject } from "../models/project.model";

function normalize(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

export function computeScores(repo: IProject) {

  const gf = repo.issue_data?.good_first_issue_count || 0;
  const ft = repo.issue_data?.first_timers_count || 0;
  const beg = repo.issue_data?.beginner_count || 0;
  const doc = repo.issue_data?.documentation_count || 0;
  const help = repo.issue_data?.help_wanted_count || 0;

  const friendlinessRaw =
    gf * 1.0 +
    ft * 1.0 +
    beg * 0.8 +
    doc * 0.4 +
    help * 0.2;

  const friendliness = normalize(Math.min(friendlinessRaw, 20), 0, 20);

  const mergeRatio = repo.activity?.pr_merge_ratio || 0; // 0–1
  const mergeTime = repo.activity?.avg_pr_merge_hours || 9999; // hours

  const mergeTimeNorm = 1 - normalize(mergeTime, 0, 720); // 720h = 30 days
  const mergeRatioNorm = normalize(mergeRatio, 0.2, 1);

  const maintenance = (mergeTimeNorm * 0.5) + (mergeRatioNorm * 0.5);

  const contributingBoost = repo.has_contributing ? 1 : 0;

  let summaryLevelBoost = 0;

  const stars = repo.stars || 0;
  const contributors = repo.contributors || 0;

  let effectiveSummaryLevel = repo.summary_level;
  if (stars > 50000 || contributors > 500) {
    effectiveSummaryLevel = "advanced";
  }

  if (effectiveSummaryLevel === "beginner") summaryLevelBoost = 1;
  else if (effectiveSummaryLevel === "intermediate") summaryLevelBoost = 0.5;
  else summaryLevelBoost = 0;

  const beginnerScoreNorm = normalize(repo.beginner_issue_total || 0, 0, 20);

  const accessibility =
    (beginnerScoreNorm * 0.3) +
    (contributingBoost * 0.4) +
    (summaryLevelBoost * 0.3);

  const starComplex = normalize(stars, 2000, 200000);
  const contributorComplex = normalize(contributors, 10, 4000);

  let summaryComplexBoost = 0;
  if (effectiveSummaryLevel === "advanced") summaryComplexBoost = 1;
  else if (effectiveSummaryLevel === "intermediate") summaryComplexBoost = 0.5;
  else summaryComplexBoost = 0;

  const complexity =
    (starComplex * 0.4) +
    (contributorComplex * 0.4) +
    (summaryComplexBoost * 0.2);

  return {
    friendliness: Number(friendliness.toFixed(4)),
    maintenance: Number(maintenance.toFixed(4)),
    accessibility: Number(accessibility.toFixed(4)),
    complexity: Number(complexity.toFixed(4)),
  };
}
