import { Project, IProject } from "../models/project.model";
import { _config } from "../config/config";
import { graphql } from "@octokit/graphql";
import { Request, Response } from "express";

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

export const getReposFromDb = async (req: Request, res: Response) => {
  const { lang, sortBy = "stars", order = "desc", limit = 20 } = req.query;
  const filter: any = {};
  if (lang) filter.language = lang;

  try {
    const repos = await Project.find(filter)
      .sort({ [sortBy as string]: order === "asc" ? 1 : -1 })
      .limit(Number(limit))
      .exec();

    return res.json({
      count: repos.length,
      data: repos,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch repos", error });
  }
};
