import { Project, IProject } from "../models/project.model";
import { _config } from "../config/config";
import { graphql } from "@octokit/graphql";

const gh = graphql.defaults({
  headers: { authorization: `token ${_config.GITHUB_TOKEN}` },
});

interface GitHubRepoNode {
  id: number;
  name: string;
  url: string;
  description: string;
  stargazerCount: number;
  forkCount: number;
  isArchived: boolean;
  licenseInfo: { key?: string; name?: string } | null;
  owner: { login: string };
  primaryLanguage?: { name: string };
  openIssues: { totalCount: number };
  openPRs: { totalCount: number };
  updatedAt: string;
  defaultBranchRef?: { target?: { committedDate: string } };
  repositoryTopics: { nodes: { topic: { name: string } }[] };
}

interface GitHubResponse {
  search: {
    nodes: GitHubRepoNode[];
  };
}

// const calculateFastMetrics = (repo: any): IProject["health_metrics"] => {
//   const lastPushedDate = new Date(repo.pushed_at);
//   const today = new Date();
//   const diffTime = Math.abs(today.getTime() - lastPushedDate.getTime());

//   const lastActivityDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

//   const issuesCount = repo.open_issues_count > 0 ? repo.open_issues_count : 1;
//   const starsPerIssueRatio = repo.stargazers_count / issuesCount;

//   const createdAt = new Date(repo.created_at);
//   const projectAgeDays = Math.ceil(
//     Math.abs(today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
//   );

//   return {
//     last_calculated: new Date(),
//     responsiveness_score: lastActivityDays, // Value: Lower is better (fewer days since last push)
//     activity_score: parseFloat(starsPerIssueRatio.toFixed(2)), // Value: Higher is better
//     stale_issue_ratio: 0,
//   };
// };

// export const fetchAndProcessRepos = async (
//   language: string,
//   minStars: number = 100
// ): Promise<(IProject & Document)[]> => {
//   const excludeKeywords = [
//     "-algorithm",
//     "-tutorial",
//     "-example",
//     "-notes",
//     "-book",
//   ].join(" ");

//   console.log(excludeKeywords);

//   const activeLabel = 'label:"help wanted"';

//   const searchQuery = `${excludeKeywords} ${activeLabel} language:${language} stars:>${minStars} fork:false`;
//   let githubRepos: any[] = [];

//   console.log("Fetching and processing repos");

//   try {
//     const response = await octokit.search.repos({
//       q: searchQuery,
//       sort: "updated",
//       order: "desc",
//       per_page: 10,
//     });
//     console.log(response.data.items);

//     githubRepos = response.data.items;
//   } catch (error) {
//     console.log(error);

//     throw new Error(
//       "GitHub search failed. Check GITHUB_TOKEN and API rate limits."
//     );
//   }

//   const processedProjects: (IProject & Document)[] = [];

//   console.log("processing repos");

//   for (const repo of githubRepos) {
//     try {
//       // const health_metrics = calculateFastMetrics(repo);

//       const projectData = {
//         repoId: repo.id,
//         owner: repo.owner.login,
//         repo_name: repo.name,
//         description: repo.description || "No description provided.",
//         language: repo.language,
//         topics: repo.topics || [],

//         // health_metrics: health_metrics,

//         issue_data: {
//           total_open_issues: repo.open_issues_count,
//           beginner_issues_count: 0,
//         },
//       };
//       console.log("Updating Repos in DB");

//       const updatedProject = await Project.findOneAndUpdate(
//         { repoId: repo.id },
//         { $set: projectData },
//         { upsert: true, new: true, runValidators: true }
//       );
//       processedProjects.push(updatedProject as IProject & Document);
//     } catch (error) {
//       console.error(`Error processing repo ${repo.name}:`, error);
//     }
//   }
//   console.log("Process completed");
//   console.log(processedProjects);

//   return processedProjects;
// };

export const fetchRepos = async (lang: string, minStars: number = 100) => {
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - 60);
  const dateString = dateLimit.toISOString().split("T")[0];
  const searchQuery = `language:${lang} stars:>${minStars} fork:false archived:false pushed:>=${dateString}`;
  const query = `
  query ($search: String!, $count: Int!) {
    search(query: $search, type: REPOSITORY, first: $count) {
      nodes {
        ... on Repository {
          id
          name
          url
          description
          stargazerCount
          forkCount
          isArchived
          updatedAt
          licenseInfo { key name }
          owner { login }
          primaryLanguage { name }
          defaultBranchRef {
            target {
              ... on Commit { committedDate }
            }
          }
          repositoryTopics(first: 5) {
            nodes { topic { name } }
          }
          issues(states: OPEN) { totalCount }
          pullRequests(states: OPEN) { totalCount }
        }
      }
    }
  }
`;

  try {
    const response = await gh<GitHubResponse>(query, {
      search: searchQuery,
      count: 50,
    });

    console.log(response.search.nodes[0]);

    const repos = response.search.nodes.map((repo: any) => ({
      repoId: repo.id,
      repo_name: repo.name,
      owner: repo.owner.login,
      repo_url: repo.url,
      description: repo.description || "No description provided.",
      stars: repo.stargazerCount,
      language: repo.primaryLanguage?.name || lang,
      licenseInfo: repo.licenseInfo,
      isArchived: repo.isArchived,
      forkCount: repo.forkCount,
      topics: repo.repositoryTopics.nodes.map((t: any) => t.topic.name),
      issue_data: {
        total_open_issues: repo.issues?.totalCount,
        beginner_issues_count: 0,
      },
      open_prs: repo.pullRequests.totalCount,
      last_commit: repo.defaultBranchRef?.target?.committedDate || null,
      last_updated: repo.updatedAt,
    }));


    const filtered = repos.filter((repo) => {
      const hasLicense = !!repo.licenseInfo?.key;
      const badNames = [
        "guide",
        "tutorial",
        "book",
        "list",
        "interview",
        "awesome",
      ];
      const isBadType = badNames.some(
        (n) =>
          repo.repo_name.toLowerCase().includes(n) ||
          repo.description?.toLowerCase().includes(n)
      );

      return (
        hasLicense &&
        !repo.isArchived &&
        !isBadType &&
        repo.forkCount > 5 &&
        repo.stars > 100 &&
        repo.issue_data.total_open_issues &&
        repo.issue_data.total_open_issues > 10 
      );
    });

    await Project.bulkWrite(
      filtered.map((repo) => ({
        updateOne: {
          filter: { repoId: repo.repoId },
          update: { $set: repo },
          upsert: true,
        },
      }))
    );

    return filtered;
  } catch (error: any) {
    console.error("GitHub GraphQL fetch failed:", error);
    throw error;
  }
};
