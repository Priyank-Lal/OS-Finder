import { IProject } from "../models/project.interface";
import { CodebaseComplexityAnalysis } from "./scoring.ai";
import { WEIGHTS } from "./scoring.weights";
import { clamp } from "./scoring.utils";

export function computeBeginnerFriendliness(
  repo: IProject,
  aiAnalysis?: CodebaseComplexityAnalysis
): { score: number; breakdown: Record<string, number> } {
  // 1. Documentation Score (0-100)
  const hasReadme = (repo.readme_raw?.length || 0) > 500;
  const hasContributing = !!(repo as any).contributing_raw;
  const hasClearDescription = (repo.description?.length || 0) > 50;
  const communityHealth = (repo as any).community_health || {};
  const hasCodeOfConduct = communityHealth.has_code_of_conduct || false;

  let documentationScore = 0;

  if (hasReadme) documentationScore += 40;
  if (hasContributing) documentationScore += 30;
  if (hasClearDescription) documentationScore += 15;
  if (hasCodeOfConduct) documentationScore += 15; // New: Code of conduct is welcoming

  // 2. Issue Labels Score (0-100)
  const issueData = repo.issue_data || {};
  const gfi = issueData.good_first_issue || 0;
  const helpWanted = issueData.help_wanted || 0;
  const beginner = issueData.beginner || 0;
  const doc = issueData.documentation || 0;

  // More nuanced scoring based on issue availability
  let issueLabelsScore = 0;

  // Good first issues are the most valuable
  if (gfi > 0) issueLabelsScore += 40;
  else if (gfi >= 5) issueLabelsScore += 50;
  else if (gfi >= 10) issueLabelsScore += 60;

  // Help wanted and beginner issues
  if (helpWanted > 0) issueLabelsScore += 20;
  if (beginner > 0) issueLabelsScore += 20;

  // Documentation issues are beginner-friendly
  if (doc > 0) issueLabelsScore += 10;

  // Cap at 100
  issueLabelsScore = Math.min(100, issueLabelsScore);

  // 3. Community Responsiveness Score (0-100)
  const activity = (repo as any).activity || {};
  const avgIssueResponseHours = activity.avg_issue_response_hours;
  const issueResponseRate = activity.issue_response_rate || 0;
  const maintainerActivity = activity.maintainer_activity_score || 0;

  let responsivenessScore = 0;

  // Score based on average response time
  if (avgIssueResponseHours !== null && avgIssueResponseHours !== undefined) {
    if (avgIssueResponseHours < 24) {
      responsivenessScore += 40; // Excellent: < 1 day
    } else if (avgIssueResponseHours < 48) {
      responsivenessScore += 30; // Good: < 2 days
    } else if (avgIssueResponseHours < 168) {
      responsivenessScore += 20; // Acceptable: < 1 week
    } else {
      responsivenessScore += 10; // Slow but something
    }
  }

  // Response rate (percentage of issues that get responses)
  responsivenessScore += issueResponseRate * 30;

  // Maintainer activity
  responsivenessScore += maintainerActivity * 30;

  // 4. Community Size Score (0-100)
  // Sweet spot: 5-100 contributors
  const contributors = repo.contributors || 0;
  const stars = repo.stars || 0;

  let communityScore = 0;

  if (contributors < 2) {
    // Too few contributors = likely inactive
    communityScore = 10;
  } else if (contributors >= 2 && contributors <= 10) {
    // Very small team: good for beginners (personal attention)
    communityScore = 40 + (contributors - 2) * 5;
  } else if (contributors > 10 && contributors <= 50) {
    // Sweet spot for beginners
    communityScore = 90 + (contributors - 10) * 0.25;
  } else if (contributors > 50 && contributors <= 200) {
    // Still good but less personal
    communityScore = Math.max(60, 100 - (contributors - 50) * 0.2);
  } else {
    // Very large projects can be intimidating
    communityScore = Math.max(40, 70 - (contributors - 200) * 0.05);
  }

  // Adjust for popularity (extremely popular repos can be intimidating)
  if (stars > 50000) {
    communityScore *= 0.75;
  } else if (stars > 10000) {
    communityScore *= 0.9;
  }

  // 5. Codebase Simplicity Score (0-100)
  let codebaseSimplicityScore = 50; // Default

  const fileMetrics = (repo as any).file_tree_metrics;

  if (fileMetrics) {
    // Use actual file tree metrics
    const totalFiles = fileMetrics.totalFiles || 0;
    const maxDepth = fileMetrics.maxDepth || 0;
    const hasTests = fileMetrics.hasTests || false;
    const hasMonorepo = fileMetrics.hasMonorepo || false;

    // Files count (fewer is simpler)
    let filesScore = 100;
    if (totalFiles <= 20) filesScore = 90;
    else if (totalFiles <= 50) filesScore = 80;
    else if (totalFiles <= 100) filesScore = 60;
    else if (totalFiles <= 200) filesScore = 40;
    else if (totalFiles <= 500) filesScore = 25;
    else filesScore = 10;

    // Directory depth (shallower is simpler)
    let depthScore = 100;
    if (maxDepth <= 2) depthScore = 100;
    else if (maxDepth <= 3) depthScore = 80;
    else if (maxDepth <= 4) depthScore = 60;
    else if (maxDepth <= 6) depthScore = 40;
    else depthScore = 20;

    // Tests are good but add complexity for beginners
    const testPenalty = hasTests ? -5 : 0;

    // Monorepo is significantly more complex
    const monorepoPenalty = hasMonorepo ? -20 : 0;

    codebaseSimplicityScore = clamp(
      filesScore * 0.5 + depthScore * 0.5 + testPenalty + monorepoPenalty,
      0,
      100
    );
  } else if (aiAnalysis) {
    // Fall back to AI analysis
    const avgComplexity =
      (aiAnalysis.architecture_score +
        aiAnalysis.abstraction_level +
        aiAnalysis.domain_difficulty) /
      3;

    codebaseSimplicityScore = 100 - avgComplexity * 10;
  }

  // 6. Setup Ease Score (0-100)
  let setupEaseScore = 50; // Default

  if (fileMetrics) {
    const buildComplexity = fileMetrics.buildComplexity || 0;
    const hasCI = fileMetrics.hasCI || false;
    const configFilesCount = (fileMetrics.configFiles || []).length;

    // Invert build complexity (higher build complexity = lower setup ease)
    setupEaseScore = 100 - buildComplexity * 10;

    // Multiple config files make setup harder
    setupEaseScore -= Math.min(30, configFilesCount * 3);

    // CI can help but also indicates more complex setup
    if (hasCI) setupEaseScore -= 5;

    setupEaseScore = clamp(setupEaseScore, 0, 100);
  } else if (aiAnalysis) {
    setupEaseScore = 100 - aiAnalysis.setup_complexity * 10;
  }

  // Bonus for beginner-friendly languages
  const beginnerLangs = [
    "javascript",
    "python",
    "html",
    "css",
    "markdown",
    "ruby",
  ];
  if (beginnerLangs.includes(repo.language?.toLowerCase() || "")) {
    setupEaseScore = Math.min(100, setupEaseScore + 15);
  }

  const breakdown = {
    documentation: Math.round(documentationScore),
    issueLabels: Math.round(issueLabelsScore),
    responsiveness: Math.round(responsivenessScore),
    communitySize: Math.round(communityScore),
    codebaseSimplicity: Math.round(codebaseSimplicityScore),
    setupEase: Math.round(setupEaseScore),
  };

  // Updated weighted average
  const score =
    breakdown.documentation * 0.2 +
    breakdown.issueLabels * 0.2 +
    breakdown.responsiveness * 0.2 +
    breakdown.communitySize * 0.15 +
    breakdown.codebaseSimplicity * 0.15 +
    breakdown.setupEase * 0.1;

  return {
    score: clamp(Math.round(score), 0, 100),
    breakdown,
  };
}
