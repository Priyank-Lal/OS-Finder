import { computeDetailedScores } from "../utils/scoring";

export async function mapGithubRepoToProject(response: any, lang: string) {
  const repos = await Promise.all(
    response.search.nodes.map(async (repo: any) => {
      const issueData = {
        total_open_issues: repo.issues?.totalCount || 0,
        good_first_issue_count: repo.goodFirstIssues?.totalCount || 0,
        help_wanted_count: repo.helpWantedIssues?.totalCount || 0,
        first_timers_count: repo.firstTimers?.totalCount || 0,
        beginner_count: repo.beginnerIssues?.totalCount || 0,
        bug_count: repo.bugIssues?.totalCount || 0,
        enhancement_count: repo.enhancementIssues?.totalCount || 0,
        documentation_count: repo.documentationIssues?.totalCount || 0,
        refactor_count: repo.refactorIssues?.totalCount || 0,
        high_priority_count: repo.highPriorityIssues?.totalCount || 0,
      };

      const hasContributing = !!repo.contributing?.text;

      const beginnerTotal =
        (repo.goodFirstIssues?.totalCount || 0) +
        (repo.helpWantedIssues?.totalCount || 0) +
        (repo.firstTimers?.totalCount || 0) +
        (repo.beginnerIssues?.totalCount || 0) +
        (repo.documentationIssues?.totalCount || 0);

      const mergeTimes: number[] = (repo.recentPRs?.nodes || [])
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

      const prMergeRatio = (repo.recentPRs?.nodes || []).length
        ? (repo.recentPRs?.nodes || []).filter((pr: any) => pr.mergedAt)
            .length / (repo.recentPRs?.nodes || []).length
        : 0;

      // Build repo object for scoring
      const repoForScoring = {
        repoId: repo.id,
        repo_name: repo.name,
        owner: repo.owner.login,
        repo_url: repo.url,
        description: repo.description || "No description provided.",
        stars: repo.stargazerCount,
        language: repo.primaryLanguage?.name || lang,
        licenseInfo: repo.licenseInfo,
        has_contributing: hasContributing,
        contributors: repo.contributors?.totalCount || 0,
        isArchived: repo.isArchived,
        forkCount: repo.forkCount,
        topics: repo.repositoryTopics.nodes.map((t: any) => t.topic.name),
        readme_raw: repo.readme?.text || "",
        contributing_raw: repo.contributing?.text || "",
        issue_samples: (repo.issueSamples?.nodes || []).map((n: any) => ({
          title: n.title,
          labels: (n.labels?.nodes || []).map((l: any) => l.name),
        })),
        issue_data: issueData,
        beginner_issue_total: beginnerTotal,
        activity: {
          avg_pr_merge_hours: avgMergeTime,
          pr_merge_ratio: prMergeRatio,
        },
        open_prs: repo.openPRs?.totalCount || 0,
        last_commit: repo.defaultBranchRef?.target?.committedDate || null,
        last_updated: repo.updatedAt,
        // Add empty arrays for fields that will be filled during summarization
        tech_stack: [],
        required_skills: [],
        main_contrib_areas: [],
        beginner_tasks: [],
        intermediate_tasks: [],
        ai_categories: [],
        file_tree: [],
        summary: "",
        summary_level: "intermediate" as const,
      };

      // Compute initial scores (without AI analysis for speed)
      // These will be refined during the summarization process
      console.log(`Computing initial scores for ${repo.name}...`);
      const scores = await computeDetailedScores(
        repoForScoring as any,
        { includeAIAnalysis: false } // Skip AI analysis during initial fetch for speed
      );

      console.log(
        `  Initial scores: Overall=${scores.overall_score}, Level=${scores.recommended_level}`
      );

      // Convert to legacy 0-1 scores for backward compatibility
      const legacyScores = {
        friendliness: scores.beginner_friendliness / 100,
        complexity: scores.technical_complexity / 100,
        accessibility: scores.contribution_readiness / 100,
        maintenance: scores.contribution_readiness / 100,
        score: scores.overall_score / 100,
        final_score: scores.overall_score,
      };

      return {
        ...repoForScoring,
        // New 0-100 scoring system
        beginner_friendliness: scores.beginner_friendliness,
        technical_complexity: scores.technical_complexity,
        contribution_readiness: scores.contribution_readiness,
        overall_score: scores.overall_score,
        recommended_level: scores.recommended_level,
        scoring_confidence: scores.confidence,
        score_breakdown: scores.breakdown,
        // Legacy 0-1 scores for backward compatibility
        friendliness: legacyScores.friendliness,
        complexity: legacyScores.complexity,
        accessibility: legacyScores.accessibility,
        maintenance: legacyScores.maintenance,
        final_score: legacyScores.final_score,
      };
    })
  );

  return repos;
}
