import { computeScores } from "../utils/scoring";

export function mapGithubRepoToProject(response: any, lang: string) {
  const repos = response.search.nodes.map((repo: any) => {
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
          (mergeTimes.reduce((a, b) => a + b, 0) / mergeTimes.length).toFixed(2)
        )
      : null;

    const prMergeRatio = (repo.recentPRs?.nodes || []).length
      ? (repo.recentPRs?.nodes || []).filter((pr: any) => pr.mergedAt).length /
        (repo.recentPRs?.nodes || []).length
      : 0;

    // Use new scoring system
    const scores = computeScores({
      ...repo,
      issue_data: issueData,
      has_contributing: hasContributing,
      contributors: repo.contributors?.totalCount || 0,
      stars: repo.stargazerCount,
      summary_level: "intermediate", // Default, will be updated by AI
      beginner_issue_total: beginnerTotal,
      activity: {
        avg_pr_merge_hours: avgMergeTime,
        pr_merge_ratio: prMergeRatio,
      },
      readme_raw: repo.readme?.text || "",
      contributing_raw: repo.contributing?.text || "",
      language: repo.primaryLanguage?.name || lang,
      topics: repo.repositoryTopics.nodes.map((t: any) => t.topic.name),
    } as any);

    return {
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
      friendliness: scores.friendliness,
      maintenance: scores.maintenance,
      accessibility: scores.accessibility,
      complexity: scores.complexity,
      tech_stack: [],
      required_skills: [],
      main_contrib_areas: [],
      beginner_tasks: [],
      intermediate_tasks: [],
      ai_categories: [],
      open_prs: repo.openPRs?.totalCount || 0,
      last_commit: repo.defaultBranchRef?.target?.committedDate || null,
      last_updated: repo.updatedAt,
    };
  });

  return repos;
}
