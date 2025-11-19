import { scoreWithRules } from "../scoring/scoring.manual";

/**
 * Transform GitHub GraphQL repo node → DB-ready project object
 */
export async function mapGithubRepoToProject(response: any, lang: string) {
  const repos = await Promise.all(
    response.search.nodes.map(async (repo: any) => {
      // ---------- ISSUE DATA ----------
      const issueSamples = repo.issueSamples?.nodes || [];

      const issueData = {
        total_open: repo.issues?.totalCount || 0,
        good_first_issue: repo.goodFirstIssues?.totalCount || 0,
        help_wanted: repo.helpWantedIssues?.totalCount || 0,
        beginner: 0, // Removed specific beginner labels to optimize query
        bug: repo.bugIssues?.totalCount || 0,
        enhancement: repo.enhancementIssues?.totalCount || 0,
        documentation: repo.documentationIssues?.totalCount || 0,
      };

      // ---------- PR MERGE METRICS ----------
      const prNodes = repo.recentPRs?.nodes || [];

      const mergeTimes: number[] = prNodes
        .filter((pr: any) => pr.mergedAt)
        .map(
          (pr: any) =>
            (new Date(pr.mergedAt!).getTime() -
              new Date(pr.createdAt).getTime()) /
            36e5
        );

      const avgMergeTime =
        mergeTimes.length > 0
          ? Number(
              (
                mergeTimes.reduce((a, b) => a + b, 0) / mergeTimes.length
              ).toFixed(2)
            )
          : null;

      const prMergeRatio =
        prNodes.length > 0
          ? Number((prNodes.filter((pr: any) => pr.mergedAt).length / prNodes.length).toFixed(2))
          : 0;

      // ---------- ISSUE SAMPLE METRICS ----------
      const issuesWithResponse = issueSamples.filter(
        (i: any) => i.comments?.totalCount > 0
      );

      const issueResponseRate =
        issueSamples.length > 0
          ? Number((issuesWithResponse.length / issueSamples.length).toFixed(2))
          : 0;

      const avgIssueResponseHours = null; // removed heavy timeline usage

      // ---------- MAINTAINER ACTIVITY ----------
      const maintainerActivity = Number((prMergeRatio * 0.6 + issueResponseRate * 0.4).toFixed(2));

      // ---------- LANGUAGES ----------
      const languages =
        repo.languages?.edges?.map((edge: any) => ({
          name: edge.node.name,
          size: edge.size,
        })) || [];

      // ---------- ISSUE SAMPLES (LIGHT) ----------
      const cleanedIssueSamples = issueSamples.map((n: any) => ({
        title: n.title,
        created_at: n.createdAt,
        labels: (n.labels?.nodes || []).map((l: any) => l.name),
        has_response: false, // no comments/timeline in query now
      }));

      // ---------- COMMUNITY HEALTH ----------
      const communityHealth = {
        has_code_of_conduct: false, // removed from query
        has_contributing: false, // loaded later in summarizer
        has_issue_templates: false, // too expensive to detect
        has_readme: false, // loaded later in summarizer
      };

      // ---------- BASE PROJECT SHAPE ----------
      const projectBase = {
        repoId: repo.id,
        repo_name: repo.name,
        owner: repo.owner.login,
        repo_url: repo.url,
        description: repo.description || "",
        language: repo.primaryLanguage?.name || lang,
        licenseInfo: repo.licenseInfo || {},

        stars: repo.stargazerCount,
        forkCount: repo.forkCount,
        contributors: repo.contributors?.totalCount || 0,
        isArchived: repo.isArchived,

        topics: repo.repositoryTopics.nodes.map((t: any) => t.topic.name),

        languages_breakdown: languages,
        file_tree_metrics: null, // summarizer fills later

        issue_samples: cleanedIssueSamples,
        issue_data: issueData,

        activity: {
          avg_pr_merge_hours: avgMergeTime,
          pr_merge_ratio: prMergeRatio,
          avg_issue_response_hours: avgIssueResponseHours,
          issue_response_rate: issueResponseRate,
          maintainer_activity_score: maintainerActivity,
          total_commits:
            repo.defaultBranchRef?.target?.history?.totalCount || 0,
        },

        community_health: communityHealth,

        open_prs: repo.openPRs?.totalCount || 0,
        last_commit: repo.defaultBranchRef?.target?.committedDate || null,
        last_updated: repo.updatedAt,

        summary: "",
        tech_stack: [],
        required_skills: [],
        main_contrib_areas: [],
        categories: [],
        beginner_tasks: [],
        intermediate_tasks: [],
        recommended_level: "intermediate",
        score_breakdown: {},
      };

      // ---------- INITIAL SCORING (NO AI) ----------
      const score = scoreWithRules(projectBase as any, {
        readme: "",
        contributingMd: "",
      });

      return {
        ...projectBase,
        beginner_friendliness: score.beginner_friendliness,
        technical_complexity: score.technical_complexity,
        contribution_readiness: score.contribution_readiness,
        overall_score: score.overall_score,
        recommended_level: score.recommended_level,
        scoring_confidence: score.confidence,
        score_breakdown: score.score_breakdown,
      };
    })
  );

  return repos;
}
