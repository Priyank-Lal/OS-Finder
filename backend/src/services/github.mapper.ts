import { scoreWithRules } from "../scoring/scoring.manual.js";

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
        bug: 0, // Removed to optimize query
        enhancement: 0, // Removed to optimize query
        documentation: 0, // Removed to optimize query
      };

      // ---------- PR MERGE METRICS ----------
      const recentPRs = repo.recentPRs?.nodes || [];
      const mergedPRs = repo.mergedPRs?.nodes || [];



      // Calculate Median Merge Time using ONLY merged PRs (Median is better for outliers)
      const mergeTimes: number[] = mergedPRs
        .map(
          (pr: any) =>
            (new Date(pr.mergedAt).getTime() -
              new Date(pr.createdAt).getTime()) /
            36e5
        )
        .sort((a: any, b: any) => a - b);

      let avgMergeTime: number | null = null;
      if (mergeTimes.length > 0) {
        const mid = Math.floor(mergeTimes.length / 2);
        avgMergeTime =
          mergeTimes.length % 2 !== 0
            ? mergeTimes[mid]
            : (mergeTimes[mid - 1] + mergeTimes[mid]) / 2;
            
        avgMergeTime = Number(avgMergeTime.toFixed(1));
      }

      // Calculate Merge Ratio using recent PRs (Open/Merged/Closed)
      const prMergeRatio =
        recentPRs.length > 0
          ? Number((recentPRs.filter((pr: any) => pr.mergedAt).length / recentPRs.length).toFixed(2))
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
        avatar_url: repo.owner.avatarUrl,
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
      let score = scoreWithRules(projectBase as any, {
        readme: "",
        contributingMd: "",
      });

      // STRICT INACTIVITY FILTER
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      if (projectBase.last_commit && new Date(projectBase.last_commit) < sixMonthsAgo) {
        score.contribution_readiness = 0;
        score.overall_score = Math.round(score.overall_score * 0.5); // Heavy penalty
        score.recommended_level = "advanced"; // Not for beginners
      }

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
