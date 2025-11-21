import { IProject } from "../models/project.interface.js";
import { clamp } from "./scoring.utils.js";

export function calculateDocumentationScore(repo: IProject, context: any): number {
  let score = 0;

  if (context.readme.length > 500) score += 40;
  if (context.contributingMd) score += 30;
  if ((repo.description?.length || 0) > 50) score += 15;
  if ((repo as any).community_health?.has_code_of_conduct) score += 15;

  return Math.min(score, 100);
}

export function calculateIssueLabelsScore(repo: IProject): number {
  const issueData = repo.issue_data || {};
  const gfi = issueData.good_first_issue || 0;
  const helpWanted = issueData.help_wanted || 0;
  const beginner = issueData.beginner || 0;

  let score = 0;
  if (gfi > 0) score += 40;
  if (gfi >= 5) score += 10;
  if (helpWanted > 0) score += 25;
  if (beginner > 0) score += 25;

  return Math.min(score, 100);
}

export function calculateResponseScore(repo: IProject): number {
  const activity = (repo as any).activity || {};
  const responseHours = activity.avg_issue_response_hours;
  const maintainerActivity = activity.maintainer_activity_score || 0;

  let score = 50; // Base score

  if (responseHours !== null && responseHours !== undefined) {
    if (responseHours < 24) score = 90;
    else if (responseHours < 48) score = 75;
    else if (responseHours < 168) score = 60;
    else score = 40;
  }

  score = (score + maintainerActivity * 50) / 2;

  return Math.round(score);
}

export function calculateSimplicityScore(repo: IProject, context: any): number {
  const metrics = context.fileTreeMetrics;

  if (!metrics) {
    return 50; // Default
  }

  const files = metrics.totalFiles || 0;
  const depth = metrics.maxDepth || 0;

  let score = 100;

  // File count penalty
  if (files > 500) score -= 60;
  else if (files > 200) score -= 40;
  else if (files > 100) score -= 20;
  else if (files > 50) score -= 10;

  // Depth penalty
  if (depth > 7) score -= 30;
  else if (depth > 5) score -= 20;
  else if (depth > 3) score -= 10;

  // Monorepo penalty
  if (metrics.hasMonorepo) score -= 20;

  return clamp(score, 0, 100);
}

export function calculateArchitectureScore(repo: IProject, context: any): number {
  const metrics = context.fileTreeMetrics;

  if (!metrics) return 50;

  const files = metrics.totalFiles || 0;
  const depth = metrics.maxDepth || 0;

  let score = 0;

  if (files < 50) score = 20;
  else if (files < 200) score = 40;
  else if (files < 500) score = 60;
  else if (files < 1000) score = 80;
  else score = 95;

  // Depth adds complexity
  score += Math.min(depth * 3, 20);

  if (metrics.hasMonorepo) score += 15;

  return clamp(score, 0, 100);
}

export function calculateDependenciesScore(repo: IProject, context: any): number {
  const metrics = context.fileTreeMetrics;

  if (!metrics) return 40;

  let score = 30;

  if (metrics.lockFiles.length > 0) score += 20;
  if (metrics.lockFiles.length > 1) score += 15;
  if (metrics.configFiles.length > 3) score += 20;
  if (metrics.hasMonorepo) score += 15;

  return clamp(score, 0, 100);
}

export function calculateDomainScore(repo: IProject): number {
  const complexDomains = [
    "compiler",
    "database",
    "blockchain",
    "machine-learning",
    "crypto",
    "kernel",
  ];
  const simpleDomains = ["website", "blog", "tutorial", "template"];

  const topics = (repo.topics || []).map((t) => t.toLowerCase());

  let score = 50;

  if (topics.some((t) => complexDomains.some((d) => t.includes(d)))) {
    score += 30;
  }

  if (topics.some((t) => simpleDomains.some((d) => t.includes(d)))) {
    score -= 20;
  }

  return clamp(score, 0, 100);
}

export function calculateIssueQualityScore(repo: IProject): number {
  const issueData = repo.issue_data || {};
  const total = issueData.total_open || 0;
  const labeled =
    (issueData.good_first_issue || 0) +
    (issueData.help_wanted || 0) +
    (issueData.bug || 0) +
    (issueData.enhancement || 0);

  if (total === 0) return 40; // Increased base score for empty issues

  const labelRatio = labeled / total;
  let score = labelRatio * 60;

  // Sweet spot for issue count
  if (total >= 5 && total <= 30) score += 30;
  else if (total > 30 && total <= 100) score += 20;
  else if (total > 100) score += 10;
  else score += 5;

  return clamp(Math.round(score) + 20, 0, 100); // Boost score
}

export function calculatePRActivityScore(repo: IProject): number {
  const activity = (repo as any).activity || {};
  const mergeRatio = activity.pr_merge_ratio || 0;
  const mergeHours = activity.avg_pr_merge_hours || 9999;

  let score = mergeRatio * 50;

  if (mergeHours < 48) score += 40;
  else if (mergeHours < 168) score += 30;
  else if (mergeHours < 336) score += 20;
  else score += 10;

  return clamp(Math.round(score), 0, 100);
}

export function calculateEngagementScore(repo: IProject): number {
  const activity = (repo as any).activity || {};
  const maintainerActivity = activity.maintainer_activity_score || 0;

  // Boost engagement score since we don't have full data yet
  return Math.min(Math.round(maintainerActivity * 100) + 20, 100);
}
