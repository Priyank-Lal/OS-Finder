import { FileTreeMetrics, IProject } from "../models/project.interface.js";

export function buildRepoContext(
  repo: IProject,
  context: {
    readme: string;
    contributingMd?: string;
    fileTreeMetrics?: FileTreeMetrics;
  }
): string {
  const metrics = context.fileTreeMetrics;
  const issueData = repo.issue_data || {};
  const activity = (repo as any).activity || {};

  return `
REPOSITORY: ${repo.repo_name}
LANGUAGE: ${repo.language}
STARS: ${repo.stars}
CONTRIBUTORS: ${repo.contributors}
TOPICS: ${(repo.topics || []).join(", ")}

README (first 5000 chars):
${context.readme.slice(0, 5000)}

${
  context.contributingMd
    ? `CONTRIBUTING.md (first 1000 chars):\n${context.contributingMd.slice(
        0,
        1000
      )}\n`
    : ""
}

FILE STRUCTURE:
${
  metrics
    ? `
- Total Files: ${metrics.totalFiles}
- Max Depth: ${metrics.maxDepth}
- Has Tests: ${metrics.hasTests}
- Has CI: ${metrics.hasCI}
- Is Monorepo: ${metrics.hasMonorepo}
- Config Files: ${metrics.configFiles.length}
- Build Complexity: ${metrics.buildComplexity}/10
`
    : "No file tree data available"
}

ISSUES:
- Total Open: ${issueData.total_open || 0}
- Good First Issue: ${issueData.good_first_issue || 0}
- Help Wanted: ${issueData.help_wanted || 0}
- Bug: ${issueData.bug || 0}
- Enhancement: ${issueData.enhancement || 0}

ACTIVITY:
- PR Merge Ratio: ${(activity.pr_merge_ratio || 0).toFixed(2)}
- Avg PR Merge Time: ${
    activity.avg_pr_merge_hours
      ? `${activity.avg_pr_merge_hours.toFixed(1)} hours`
      : "N/A"
  }
- Avg Issue Response: ${
    activity.avg_issue_response_hours
      ? `${activity.avg_issue_response_hours.toFixed(1)} hours`
      : "N/A"
  }
- Maintainer Activity: ${(activity.maintainer_activity_score || 0).toFixed(2)}
`;
}

export function isValidAIResponse(response: any): boolean {
  return (
    typeof response.beginner_friendliness === "number" &&
    typeof response.technical_complexity === "number" &&
    typeof response.contribution_readiness === "number" &&
    typeof response.recommended_level === "string" &&
    typeof response.confidence === "number" &&
    response.reasoning?.beginner &&
    response.reasoning?.complexity &&
    response.reasoning?.contribution
  );
}

export function validateLevel(
  level: string
): "beginner" | "intermediate" | "advanced" {
  if (["beginner", "intermediate", "advanced"].includes(level)) {
    return level as any;
  }
  return "intermediate";
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalize(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

// Sigmoid normalization for better distribution
export function sigmoidNormalize(
  value: number,
  midpoint: number,
  steepness: number = 0.1
): number {
  return 1 / (1 + Math.exp(-steepness * (value - midpoint)));
}

// Logarithmic scale for exponential metrics (stars, contributors)
export function logNormalize(value: number, base: number = 10): number {
  if (value <= 1) return 0;
  const logValue = Math.log(value) / Math.log(base);
  return clamp(logValue / 5, 0, 1); // 10^5 = 100k is max
}
