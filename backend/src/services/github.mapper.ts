import { computeDetailedScores } from "../utils/scoring";
import { analyzeFileTree } from "../utils/fileTreeAnalyzer";

/**
 * Calculate average time to first response on issues (in hours)
 */
function calculateAvgIssueResponseTime(issueSamples: any[]): number | null {
  if (!issueSamples || issueSamples.length === 0) return null;

  const responseTimes: number[] = [];

  for (const issue of issueSamples) {
    const createdAt = new Date(issue.createdAt);
    const firstComment = issue.timelineItems?.nodes?.find(
      (item: any) => item.__typename === "IssueComment"
    );

    if (firstComment?.createdAt) {
      const respondedAt = new Date(firstComment.createdAt);
      const hoursDiff =
        (respondedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      responseTimes.push(hoursDiff);
    }
  }

  if (responseTimes.length === 0) return null;

  return Number(
    (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2)
  );
}

/**
 * Calculate issue response rate (percentage of issues with responses)
 */
function calculateIssueResponseRate(issueSamples: any[]): number {
  if (!issueSamples || issueSamples.length === 0) return 0;

  const responded = issueSamples.filter(
    (issue) =>
      issue.comments?.totalCount > 0 || issue.timelineItems?.nodes?.length > 0
  ).length;

  return responded / issueSamples.length;
}

/**
 * Calculate maintainer activity score based on recent PR/issue activity
 */
function calculateMaintainerActivity(
  recentPRs: any[],
  issueSamples: any[]
): number {
  // Check if PRs are being merged
  const mergedPRs = recentPRs.filter((pr) => pr.mergedAt).length;
  const prActivity = recentPRs.length > 0 ? mergedPRs / recentPRs.length : 0;

  // Check if issues are getting responses
  const issueActivity = calculateIssueResponseRate(issueSamples);

  // Combined score (0-1)
  return prActivity * 0.6 + issueActivity * 0.4;
}

export async function mapGithubRepoToProject(response: any, lang: string) {
  const repos = await Promise.all(
    response.search.nodes.map(async (repo: any) => {
      // Analyze file tree
      const fileTreeMetrics = analyzeFileTree(repo.fileTree);
      const fileTreeArray = repo.fileTree?.entries
        ? repo.fileTree.entries.map((e: any) => e.name)
        : [];

      // Clean issue data structure
      const issueData = {
        total_open: repo.issues?.totalCount || 0,
        good_first_issue: repo.goodFirstIssues?.totalCount || 0,
        help_wanted: repo.helpWantedIssues?.totalCount || 0,
        beginner:
          (repo.firstTimers?.totalCount || 0) +
          (repo.beginnerIssues?.totalCount || 0),
        bug: repo.bugIssues?.totalCount || 0,
        enhancement: repo.enhancementIssues?.totalCount || 0,
        documentation: repo.documentationIssues?.totalCount || 0,
      };

      // Calculate PR merge metrics
      const recentPRNodes = repo.recentPRs?.nodes || [];
      const mergeTimes: number[] = recentPRNodes
        .filter((pr: any) => pr.mergedAt)
        .map(
          (pr: any) =>
            (new Date(pr.mergedAt!).getTime() -
              new Date(pr.createdAt).getTime()) /
            36e5
        );

      const avgMergeTime = mergeTimes.length
        ? Number(
            (mergeTimes.reduce((a, b) => a + b, 0) / mergeTimes.length).toFixed(
              2
            )
          )
        : null;

      const prMergeRatio = recentPRNodes.length
        ? recentPRNodes.filter((pr: any) => pr.mergedAt).length /
          recentPRNodes.length
        : 0;

      // Calculate issue response metrics
      const issueSampleNodes = repo.issueSamples?.nodes || [];
      const avgIssueResponseTime =
        calculateAvgIssueResponseTime(issueSampleNodes);
      const issueResponseRate = calculateIssueResponseRate(issueSampleNodes);

      // Calculate maintainer activity
      const maintainerActivity = calculateMaintainerActivity(
        recentPRNodes,
        issueSampleNodes
      );

      // Get languages breakdown
      const languages =
        repo.languages?.edges?.map((edge: any) => ({
          name: edge.node.name,
          size: edge.size,
        })) || [];

      // Check for community health indicators
      const hasConductFile = !!repo.codeOfConduct?.text;
      const hasIssueTemplates =
        issueData.total_open > 0 &&
        issueSampleNodes.some((issue: any) =>
          issue.labels?.nodes?.some((label: any) =>
            /template|bug report|feature request/i.test(label.name)
          )
        );

      // Build clean repo object
      const repoForScoring = {
        repoId: repo.id,
        repo_name: repo.name,
        owner: repo.owner.login,
        repo_url: repo.url,
        description: repo.description || "",
        stars: repo.stargazerCount,
        language: repo.primaryLanguage?.name || lang,
        licenseInfo: repo.licenseInfo,
        contributors: repo.contributors?.totalCount || 0,
        isArchived: repo.isArchived,
        forkCount: repo.forkCount,
        topics: repo.repositoryTopics.nodes.map((t: any) => t.topic.name),

        // Raw data
        readme_raw: repo.readme?.text || "",
        contributing_raw: repo.contributing?.text || "",

        // File tree data
        file_tree: fileTreeArray,
        file_tree_metrics: fileTreeMetrics,

        // Languages
        languages_breakdown: languages,

        // Issue samples with response data
        issue_samples: issueSampleNodes.map((n: any) => ({
          title: n.title,
          labels: (n.labels?.nodes || []).map((l: any) => l.name),
          created_at: n.createdAt,
          has_response:
            n.comments?.totalCount > 0 || n.timelineItems?.nodes?.length > 0,
        })),

        // Issue data
        issue_data: issueData,

        // Enhanced activity metrics
        activity: {
          avg_pr_merge_hours: avgMergeTime,
          pr_merge_ratio: prMergeRatio,
          avg_issue_response_hours: avgIssueResponseTime,
          issue_response_rate: issueResponseRate,
          maintainer_activity_score: maintainerActivity,
          total_commits:
            repo.defaultBranchRef?.target?.history?.totalCount || 0,
        },

        // Community health
        community_health: {
          has_code_of_conduct: hasConductFile,
          has_contributing: !!repo.contributing_raw,
          has_issue_templates: hasIssueTemplates,
          has_readme: !!repo.readme_raw,
        },

        open_prs: repo.openPRs?.totalCount || 0,
        last_commit: repo.defaultBranchRef?.target?.committedDate || null,
        last_updated: repo.updatedAt,

        // Initialize empty arrays for AI fields
        tech_stack: [],
        required_skills: [],
        main_contrib_areas: [],
        beginner_tasks: [],
        intermediate_tasks: [],
        categories: [],
        summary: "",
      };

      // Compute initial scores with file tree data
      console.log(`Computing initial scores for ${repo.name}...`);
      const scores = await computeDetailedScores(repoForScoring as any, {
        includeAIAnalysis: false,
      });

      console.log(
        `  Scores: Overall=${scores.overall_score}, Level=${
          scores.recommended_level
        }, Confidence=${scores.confidence.toFixed(2)}`
      );

      return {
        ...repoForScoring,
        // New scoring system (0-100)
        beginner_friendliness: scores.beginner_friendliness,
        technical_complexity: scores.technical_complexity,
        contribution_readiness: scores.contribution_readiness,
        overall_score: scores.overall_score,
        recommended_level: scores.recommended_level,
        scoring_confidence: scores.confidence,
        score_breakdown: scores.breakdown,
      };
    })
  );

  return repos;
}
