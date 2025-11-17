import { IProject } from "../models/project.interface";
import { sigmoidNormalize, clamp } from "./scoring.utils";
import { WEIGHTS } from "./scoring.weights";

export function computeContributionReadiness(repo: IProject): {
  score: number;
  breakdown: Record<string, number>;
} {
  // 1. Issue Quality Score (0-100)
  const issueData = repo.issue_data || {};
  const totalIssues = issueData.total_open_issues || 0;
  const labeledIssues =
    (issueData.good_first_issue_count || 0) +
    (issueData.help_wanted_count || 0) +
    (issueData.bug_count || 0) +
    (issueData.enhancement_count || 0) +
    (issueData.documentation_count || 0);

  let issueQualityScore = 0;

  if (totalIssues > 0) {
    // Labeling ratio (well-organized issues)
    const labelRatio = labeledIssues / totalIssues;
    issueQualityScore = labelRatio * 50;

    // Bonus for having diverse issue types
    const issueTypes = [
      issueData.bug_count,
      issueData.enhancement_count,
      issueData.documentation_count,
      issueData.good_first_issue_count,
      issueData.help_wanted_count,
    ].filter((count) => (count || 0) > 0).length;

    issueQualityScore += (issueTypes / 5) * 30;

    // Bonus for having a good number of open issues (not too few, not too many)
    let issueCountScore = 0;
    if (totalIssues >= 5 && totalIssues <= 30) {
      issueCountScore = 20; // Sweet spot
    } else if (totalIssues > 30 && totalIssues <= 100) {
      issueCountScore = 15; // Still good
    } else if (totalIssues > 100) {
      issueCountScore = 10; // Many issues might indicate overwhelmed maintainers
    } else {
      issueCountScore = 5; // Very few issues
    }

    issueQualityScore += issueCountScore;
  }

  issueQualityScore = Math.min(100, issueQualityScore);

  // 2. PR Activity Score (0-100)
  const activity = (repo as any).activity || {};
  const mergeRatio = activity.pr_merge_ratio || 0;
  const mergeHours = activity.avg_pr_merge_hours || 9999;

  // Merge ratio score (0.5-0.9 is healthy)
  const mergeRatioScore = sigmoidNormalize(mergeRatio * 100, 70, 0.08) * 100;

  // Merge time score
  let mergeTimeScore = 0;
  if (mergeHours < 24) mergeTimeScore = 100;
  else if (mergeHours < 48) mergeTimeScore = 85;
  else if (mergeHours < 72) mergeTimeScore = 70;
  else if (mergeHours < 168) mergeTimeScore = 55; // 1 week
  else if (mergeHours < 336) mergeTimeScore = 40; // 2 weeks
  else if (mergeHours < 720) mergeTimeScore = 25; // 1 month
  else mergeTimeScore = 10;

  const prActivityScore = mergeRatioScore * 0.5 + mergeTimeScore * 0.5;

  // 3. Maintainer Response Score (0-100)
  const avgIssueResponseHours = activity.avg_issue_response_hours;
  const maintainerActivity = activity.maintainer_activity_score || 0;

  let maintainerResponseScore = 0;

  // Issue response time component
  if (avgIssueResponseHours !== null && avgIssueResponseHours !== undefined) {
    if (avgIssueResponseHours < 12) maintainerResponseScore += 50;
    else if (avgIssueResponseHours < 24) maintainerResponseScore += 45;
    else if (avgIssueResponseHours < 48) maintainerResponseScore += 35;
    else if (avgIssueResponseHours < 168) maintainerResponseScore += 25;
    else if (avgIssueResponseHours < 336) maintainerResponseScore += 15;
    else maintainerResponseScore += 5;
  } else {
    // No data available, use PR merge time as proxy
    maintainerResponseScore += prActivityScore * 0.3;
  }

  // Maintainer activity component (from mapper)
  maintainerResponseScore += maintainerActivity * 50;

  maintainerResponseScore = Math.min(100, maintainerResponseScore);

  // 4. Test Coverage Score (0-100)
  const fileMetrics = (repo as any).file_tree_metrics;
  let testCoverageScore = 20; // Default low score

  if (fileMetrics) {
    const hasTests = fileMetrics.hasTests || false;
    const testRatio = fileMetrics.testToCodeRatio || 0;

    if (hasTests) {
      testCoverageScore = 50; // Base score for having tests

      // Bonus for good test ratio
      if (testRatio > 0.3) testCoverageScore += 30; // Excellent coverage
      else if (testRatio > 0.2) testCoverageScore += 20; // Good coverage
      else if (testRatio > 0.1) testCoverageScore += 10; // Decent coverage
      else testCoverageScore += 5; // Some tests

      testCoverageScore = Math.min(100, testCoverageScore);
    }
  } else {
    // Fallback to old logic
    const fileTree = (repo as any).file_tree || [];
    const hasTestFiles = fileTree.some(
      (f: string) =>
        f.includes("test") || f.includes("spec") || f.includes("__tests__")
    );

    testCoverageScore = hasTestFiles ? 70 : 20;
  }

  // 5. CI/CD Score (0-100)
  let cicdScore = 30; // Default

  if (fileMetrics) {
    const hasCI = fileMetrics.hasCI || false;
    cicdScore = hasCI ? 85 : 30;
  } else {
    // Fallback
    const fileTree = (repo as any).file_tree || [];
    const hasCICD = fileTree.some((f: string) =>
      [
        ".github/",
        ".gitlab-ci",
        ".travis.yml",
        "Jenkinsfile",
        ".circleci/",
      ].some((ci) => f.includes(ci))
    );
    cicdScore = hasCICD ? 85 : 30;
  }

  // 6. Documentation Quality Score (0-100)
  const communityHealth = (repo as any).community_health || {};
  const hasReadme = communityHealth.has_readme || false;
  const hasContributing = communityHealth.has_contributing || false;
  const hasIssueTemplates = communityHealth.has_issue_templates || false;

  let docQualityScore = 0;
  if (hasReadme) docQualityScore += 40;
  if (hasContributing) docQualityScore += 40;
  if (hasIssueTemplates) docQualityScore += 20;

  // Check for docs folder
  if (fileMetrics?.hasDocs) {
    docQualityScore = Math.min(100, docQualityScore + 10);
  }

  const breakdown = {
    issueQuality: Math.round(issueQualityScore),
    prActivity: Math.round(prActivityScore),
    maintainerResponse: Math.round(maintainerResponseScore),
    testCoverage: Math.round(testCoverageScore),
    cicd: Math.round(cicdScore),
    documentation: Math.round(docQualityScore),
  };

  // Updated weighted average
  const score =
    breakdown.issueQuality * 0.2 +
    breakdown.prActivity * 0.2 +
    breakdown.maintainerResponse * 0.25 +
    breakdown.testCoverage * 0.15 +
    breakdown.cicd * 0.1 +
    breakdown.documentation * 0.1;

  return {
    score: clamp(Math.round(score), 0, 100),
    breakdown,
  };
}
