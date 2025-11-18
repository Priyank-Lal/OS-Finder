const MAX_DAYS_SINCE_COMMIT = 120;
export function filterGithubRepos(repos: any[]) {
  const filtered = repos.filter((repo: any) => {
    // Must have minimum contribution readiness (30/100)
    if ((repo.contribution_readiness || 0) < 30) {
      console.log(
        `Filtered ${repo.repo_name}: Low contribution readiness (${repo.contribution_readiness})`
      );
      return false;
    }

    // Must have minimum overall score (25/100)
    if ((repo.overall_score || 0) < 25) {
      console.log(
        `Filtered ${repo.repo_name}: Low overall score (${repo.overall_score})`
      );
      return false;
    }

    // Last commit recency check (reject older than 120 days)
    const lastCommit = repo.last_commit ? new Date(repo.last_commit) : null;
    if (!lastCommit) {
      console.log(`Filtered ${repo.repo_name}: No last commit`);
      return false;
    }

    const diffDays =
      (Date.now() - lastCommit.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > MAX_DAYS_SINCE_COMMIT) {
      console.log(
        `Filtered ${repo.repo_name}: Last commit ${Math.round(
          diffDays
        )} days ago`
      );
      return false;
    }

    // Must have minimum contributors
    if ((repo.contributors || 0) < 2) {
      console.log(
        `Filtered ${repo.repo_name}: Only ${repo.contributors} contributors`
      );
      return false;
    }

    // Must have license
    if (!repo.licenseInfo?.key) {
      console.log(`Filtered ${repo.repo_name}: No license`);
      return false;
    }

    // Filter out guides, tutorials, awesome lists
    const forbiddenTerms = ["guide", "tutorial", "book", "roadmap", "awesome"];
    const repoNameLower = repo.repo_name.toLowerCase();
    const descLower = (repo.description || "").toLowerCase();

    const isForbidden = forbiddenTerms.some(
      (term) => repoNameLower.includes(term) || descLower.startsWith(term)
    );

    if (isForbidden) {
      console.log(`Filtered ${repo.repo_name}: Forbidden type`);
      return false;
    }

    // Filter archived repos
    if (repo.isArchived) {
      console.log(`Filtered ${repo.repo_name}: Archived`);
      return false;
    }

    return true;
  });

  console.log(
    `Filtered ${repos.length - filtered.length} repos, kept ${filtered.length}`
  );
  return filtered;
}
