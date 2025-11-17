import { IProject } from "../models/project.interface";
import { sigmoidNormalize } from "./scoring.utils";
import { WEIGHTS } from "./scoring.weights";

export function computeContributionReadiness(repo: IProject): {
  score: number;
  breakdown: Record<string, number>;
} {
  // 1. Issue Quality Score (0-100)
  const totalIssues = repo.issue_data?.total_open_issues || 0;
  const labeledIssues =
    (repo.issue_data?.good_first_issue_count || 0) +
    (repo.issue_data?.help_wanted_count || 0) +
    (repo.issue_data?.bug_count || 0) +
    (repo.issue_data?.enhancement_count || 0);

  let issueQualityScore = 0;
  if (totalIssues > 0) {
    const labelRatio = labeledIssues / totalIssues;
    issueQualityScore = labelRatio * 60; // 60% for labeling

    // Bonus for having diverse issue types
    const issueTypes = [
      repo.issue_data?.bug_count,
      repo.issue_data?.enhancement_count,
      repo.issue_data?.documentation_count,
    ].filter((count) => (count || 0) > 0).length;

    issueQualityScore += (issueTypes / 3) * 40; // 40% for diversity
  }

  // 2. PR Activity Score (0-100)
  const mergeRatio = repo.activity?.pr_merge_ratio || 0;
  const mergeHours = repo.activity?.avg_pr_merge_hours || 9999;

  // Good merge ratio: 0.6-0.9
  // mergeRatio in 0..1 -> map midpoint at 0.7 (70%) but use steeper curve
  const mergeRatioScore = sigmoidNormalize(mergeRatio * 100, 70, 0.12) * 100;

  // Good merge time: < 48 hours
  let mergeTimeScore = 0;
  if (mergeHours < 24) mergeTimeScore = 100;
  else if (mergeHours < 48) mergeTimeScore = 80;
  else if (mergeHours < 168) mergeTimeScore = 60; // 1 week
  else if (mergeHours < 720) mergeTimeScore = 40; // 1 month
  else mergeTimeScore = 20;

  const prActivityScore = mergeRatioScore * 0.6 + mergeTimeScore * 0.4;

  // 3. Maintainer Response Score (0-100)
  // Based on PR merge speed and ratio
  const maintainerResponseScore = prActivityScore; // Reuse PR activity as proxy

  // 4. Test Coverage Score (0-100)
  // Estimate from file tree
  const fileTree = repo.file_tree || [];
  const hasTestFiles = fileTree.some(
    (f) => f.includes("test") || f.includes("spec") || f.includes("__tests__")
  );

  const testCoverageScore = hasTestFiles ? 80 : 20;

  // 5. CI/CD Score (0-100)
  const hasCICD = fileTree.some((f) =>
    [".github/", ".gitlab-ci", ".travis.yml", "Jenkinsfile", ".circleci/"].some(
      (ci) => f.includes(ci)
    )
  );

  const cicdScore = hasCICD ? 90 : 30;

  const breakdown = {
    issueQuality: issueQualityScore,
    prActivity: prActivityScore,
    maintainerResponse: maintainerResponseScore,
    testCoverage: testCoverageScore,
    cicd: cicdScore,
  };

  const score =
    breakdown.issueQuality * WEIGHTS.contribution.issueQuality +
    breakdown.prActivity * WEIGHTS.contribution.prActivity +
    breakdown.maintainerResponse * WEIGHTS.contribution.maintainerResponse +
    breakdown.testCoverage * WEIGHTS.contribution.testCoverage +
    breakdown.cicd * WEIGHTS.contribution.cicd;

  return { score: Math.round(score), breakdown };
}