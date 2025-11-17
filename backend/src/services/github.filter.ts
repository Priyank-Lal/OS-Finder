export function filterGithubRepos(repos: any) {
  const filtered = repos.filter((repo: any) => {
    // Must have minimum accessibility (contribution readiness)
    if (repo.accessibility < 0.15) {
      console.log(
        `Filtered ${repo.repo_name}: Low accessibility (${repo.accessibility})`
      );
      return false;
    }

    // Must have recent activity
    if (repo.maintenance < 0.15) {
      console.log(
        `Filtered ${repo.repo_name}: Low maintenance (${repo.maintenance})`
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
    if (diffDays > 120) {
      console.log(
        `Filtered ${repo.repo_name}: Last commit ${Math.round(
          diffDays
        )} days ago`
      );
      return false;
    }

    // Must have minimum contributors
    if (repo.contributors < 2) {
      console.log(
        `Filtered ${repo.repo_name}: Only ${repo.contributors} contributors`
      );
      return false;
    }

    // Must have license
    const hasLicense = !!repo.licenseInfo?.key;
    if (!hasLicense) {
      console.log(`Filtered ${repo.repo_name}: No license`);
      return false;
    }

    // Filter out guides, tutorials, awesome lists
    const forbiddenExact = ["guide", "tutorial", "book", "roadmap", "awesome"];
    const repoNameLower = repo.repo_name.toLowerCase();
    const descLower = (repo.description || "").toLowerCase();

    const isForbidden = forbiddenExact.some(
      (term) => repoNameLower.includes(term) || descLower.startsWith(term)
    );

    if (isForbidden) {
      console.log(`Filtered ${repo.repo_name}: Forbidden type`);
      return false;
    }

    if (repo.isArchived) {
      console.log(`Filtered ${repo.repo_name}: Archived`);
      return false;
    }

    return true;
  });

  return filtered;
}
