import { computeDetailedScores } from "../utils/scoring";

export async function mapGithubRepoToProject(response: any, lang: string) {
  const repos = await Promise.all(
    response.search.nodes.map(async (repo: any) => {
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
        readme_raw: repo.readme?.text || "",
        contributing_raw: repo.contributing?.text || "",
        issue_samples: (repo.issueSamples?.nodes || []).map((n: any) => ({
          title: n.title,
          labels: (n.labels?.nodes || []).map((l: any) => l.name),
        })),
        issue_data: issueData,
        activity: {
          avg_pr_merge_hours: avgMergeTime,
          pr_merge_ratio: prMergeRatio,
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

      // Compute initial scores
      console.log(`Computing initial scores for ${repo.name}...`);
      const scores = await computeDetailedScores(repoForScoring as any, {
        includeAIAnalysis: false,
      });

      console.log(
        `  Scores: Overall=${scores.overall_score}, Level=${scores.recommended_level}`
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
