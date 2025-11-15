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
  issues: { totalCount: number };
  openPRs?: { totalCount: number };
  recentPRs?: {
    totalCount: number;
    nodes: { createdAt: string; mergedAt?: string }[];
  };
  pullRequests?: { totalCount: number };
  goodFirstIssues?: { totalCount: number };
  helpWantedIssues?: { totalCount: number };
  firstTimers?: { totalCount: number };
  beginnerIssues?: { totalCount: number };
  bugIssues?: { totalCount: number };
  enhancementIssues?: { totalCount: number };
  documentationIssues?: { totalCount: number };
  refactorIssues?: { totalCount: number };
  highPriorityIssues?: { totalCount: number };
  updatedAt: string;
  defaultBranchRef?: { target?: { committedDate: string } };
  repositoryTopics: { nodes: { topic: { name: string } }[] };
  contributing?: { text?: string } | null;
  contributors?: { totalCount: number };
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
  const query = `query ($search: String!, $count: Int!) {
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
        repositoryTopics(first: 10) {
          nodes { topic { name } }
        }
        contributing: object(expression: "HEAD:CONTRIBUTING.md") {
          ... on Blob {
            text
          }
        }
        contributors: mentionableUsers(first: 1) {
          totalCount
        }
        issues(states: OPEN) {
          totalCount
        }
     openPRs: pullRequests(states: OPEN) {
  totalCount
}

recentPRs: pullRequests(
  states: [OPEN, MERGED, CLOSED]
  first: 20
  orderBy: { field: CREATED_AT, direction: DESC }
) {
  nodes {
    createdAt
    mergedAt
  }
  totalCount
}
        goodFirstIssues: issues(
          labels: ["good first issue", "good-first-issue"]
          states: OPEN
        ) {
          totalCount
        }

        helpWantedIssues: issues(
          labels: ["help wanted", "help-wanted"]
          states: OPEN
        ) {
          totalCount
        }

        firstTimers: issues(
          labels: ["first-timers-only", "first timers only"]
          states: OPEN
        ) {
          totalCount
        }

        beginnerIssues: issues(
          labels: ["beginner", "easy"]
          states: OPEN
        ) {
          totalCount
        }
        bugIssues: issues(labels: ["bug"], states: OPEN) {
          totalCount
        }

        enhancementIssues: issues(labels: ["enhancement"], states: OPEN) {
          totalCount
        }

        documentationIssues: issues(labels: ["documentation"], states: OPEN) {
          totalCount
        }

        refactorIssues: issues(labels: ["refactor"], states: OPEN) {
          totalCount
        }

        highPriorityIssues: issues(labels: ["high priority"], states: OPEN) {
          totalCount
        }
      }
    }
  }
}`;

  try {
    const response = await gh<GitHubResponse>(query, {
      search: searchQuery,
      count: 5,
    });

    console.log(response.search.nodes[0]);

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

      const beginnerScore = beginnerTotal * 2;

      const accessibilityBase = beginnerScore + (hasContributing ? 10 : 0);

      const rawScore =
        (repo.stargazerCount || 0) * 0.3 +
        (repo.goodFirstIssues?.totalCount || 0) * 2 +
        (repo.helpWantedIssues?.totalCount || 0) * 1.5 +
        (repo.beginnerIssues?.totalCount || 0) * 1.5 +
        (repo.firstTimers?.totalCount || 0) * 2 +
        (repo.recentPRs?.totalCount || 0) * 0.5 +
        (repo.issues?.totalCount || 0) * 0.2;

      const score = Number(rawScore.toFixed(2));

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

      return {
        repoId: repo.id,
        repo_name: repo.name,
        owner: repo.owner.login,
        repo_url: repo.url,
        description: repo.description || "No description provided.",
        stars: repo.stargazerCount,
        score: score,
        language: repo.primaryLanguage?.name || lang,
        licenseInfo: repo.licenseInfo,
        has_contributing: hasContributing,
        contributors: repo.contributors?.totalCount || 0,
        isArchived: repo.isArchived,
        forkCount: repo.forkCount,
        topics: repo.repositoryTopics.nodes.map((t: any) => t.topic.name),
        issue_data: issueData,
        beginner_issue_total: beginnerTotal,
        beginner_issue_score: beginnerScore,
        accessibility_score_base: accessibilityBase,
        activity: {
          avg_pr_merge_hours: avgMergeTime,
          pr_merge_ratio: prMergeRatio,
        },
        open_prs: repo.openPRs?.totalCount || 0,
        last_commit: repo.defaultBranchRef?.target?.committedDate || null,
        last_updated: repo.updatedAt,
      };
    });

    const filtered = repos.filter((repo) => {
      // Remove extremely low-accessibility repos
      if (repo.accessibility_score_base < 5) return false;

      // Last commit recency check (reject older than 120 days)
      const lastCommit = repo.last_commit ? new Date(repo.last_commit) : null;
      if (!lastCommit) return false;
      const diffDays = (Date.now() - lastCommit.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 120) return false;

      // Reject repos with extremely low contributor count
      if (repo.contributors < 2) return false;

      const hasLicense = !!repo.licenseInfo?.key;
      const forbiddenExact = ["guide", "tutorial", "book", "roadmap"];
      const isExactBad =
        forbiddenExact.includes(repo.repo_name.toLowerCase()) ||
        forbiddenExact.includes((repo.description || "").toLowerCase());

      const isAwesomeList =
        repo.repo_name.toLowerCase().startsWith("awesome-") ||
        (repo.description || "").toLowerCase().startsWith("awesome-");

      const isBadType = isExactBad || isAwesomeList;

      let allowedStars = 20;

      if (repo.has_contributing) {
        allowedStars = 10;
      }

      return (
        hasLicense &&
        !repo.isArchived &&
        !isBadType &&
        repo.forkCount > 2 &&
        repo.stars > allowedStars &&
        repo.issue_data.total_open_issues &&
        repo.issue_data.total_open_issues > 5
      );
    });

    filtered.map((repo) => {
      console.log(repo);
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
  const {
    lang,
    sortBy = "stars",
    order = "desc",
    limit = 20,
    page = 1,
    topic,
  } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const filter: any = {};
  if (lang) filter.language = { $regex: new RegExp(`^${lang}$`, "i") };
  if (topic) {
    filter.topics = { $regex: new RegExp(topic as string, "i") };
  }
  try {
    const repos = await Project.find(filter)
      .sort({ [sortBy as string]: order === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(Number(limit))
      .exec();

    return res.json({
      count: repos.length,
      page: Number(page),
      limit: Number(limit),
      data: repos,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch repos", error });
  }
};

export const getRepoById = async (req: Request, res: Response) => {
  try {
    const repo = await Project.findOne({ repoId: req.params.id });

    if (!repo) return res.status(404).json({ message: "Repo not found" });

    return res.json(repo);
  } catch (err) {
    return res.status(500).json({ message: "Failed", err });
  }
};
