const MAX_DAYS_SINCE_COMMIT = 120;
export function filterGithubRepos(repos: any[]) {
  const filtered = repos.filter((repo: any) => {
    // 1. Must not be archived
    if (repo.isArchived) {
      console.log(`Filtered ${repo.repo_name}: Archived`);
      return false;
    }

    // 2. Must have a license
    if (!repo.licenseInfo?.key) {
      console.log(`Filtered ${repo.repo_name}: No license`);
      return false;
    }

    // 3. Must have at least 5 contributor
    if ((repo.contributors || 0) < 5) {
      console.log(
        `Filtered ${repo.repo_name}: Only ${repo.contributors} contributors`
      );
      return false;
    }

    // 4. Must have at least 5 open issue (to ensure there's work to do)
    if ((repo.issue_data?.total_open || 0) < 5) {
      console.log(`Filtered ${repo.repo_name}: No open issues`);
      return false;
    }

    // 5. Last commit recency check (reject older than 180 days - relaxed)
    const lastCommit = repo.last_commit ? new Date(repo.last_commit) : null;
    if (!lastCommit) {
      console.log(`Filtered ${repo.repo_name}: No last commit`);
      return false;
    }

    const diffDays =
      (Date.now() - lastCommit.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 180) {
      console.log(
        `Filtered ${repo.repo_name}: Last commit ${Math.round(
          diffDays
        )} days ago`
      );
      return false;
    }

    // 6. Filter out guides, tutorials, awesome lists (Forbidden types)
    const forbiddenTerms = ["guide", "tutorial", "book", "roadmap", "awesome", "course", "interview"];
    const repoNameLower = repo.repo_name.toLowerCase();
    const descLower = (repo.description || "").toLowerCase();

    const isForbidden = forbiddenTerms.some(
      (term) => repoNameLower.includes(term) || descLower.startsWith(term)
    );

    if (isForbidden) {
      console.log(`Filtered ${repo.repo_name}: Forbidden type`);
      return false;
    }

    return true;
  });

  console.log(
    `Filtered ${repos.length - filtered.length} repos, kept ${filtered.length}`
  );
  return filtered;
}
