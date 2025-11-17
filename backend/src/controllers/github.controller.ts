import { Project, IProject } from "../models/project.model";
import { _config } from "../config/config";
import { graphql } from "@octokit/graphql";
import { Request, Response } from "express";
import { computeScores } from "../utils/scoring";

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

        # License
        licenseInfo {
          key
          name
        }

        # Owner
        owner {
          login
        }

        # Primary language
        primaryLanguage {
          name
        }

        # Latest commit on default branch
        defaultBranchRef {
          target {
            ... on Commit {
              committedDate
            }
          }
        }

        # Repo topics (up to 10)
        repositoryTopics(first: 10) {
          nodes {
            topic {
              name
            }
          }
        }

        # README.md content
        readme: object(expression: "HEAD:README.md") {
          ... on Blob {
            text
          }
        }

        # CONTRIBUTING.md (optional)
        contributing: object(expression: "HEAD:CONTRIBUTING.md") {
          ... on Blob {
            text
          }
        }

        # Contributor count
        contributors: mentionableUsers(first: 1) {
          totalCount
        }

        # Total open issues
        issues(states: OPEN) {
          totalCount
        }

        # Issues (titles + labels) for summarizer
        issueSamples: issues(
          first: 20
          states: OPEN
          orderBy: { field: CREATED_AT, direction: DESC }
        ) {
          nodes {
            title
            labels(first: 10) {
              nodes {
                name
              }
            }
            __typename
          }
        }

        # Standard issue categories
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

        # Pull request activity
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
      }
    }
  }
}`;

const gh = graphql.defaults({
  headers: { authorization: `token ${_config.GITHUB_TOKEN}` },
});

async function safeGithubQuery(
  query: string,
  variables: any,
  retries = 2
): Promise<any> {
  try {
    return await gh(query, variables);
  } catch (err: any) {
    if (retries <= 0) throw err;
    await new Promise((res) => setTimeout(res, 1000));
    return safeGithubQuery(query, variables, retries - 1);
  }
}

interface GitHubRepoNode {
  id: string;
  name: string;
  url: string;
  description: string;
  stargazerCount: number;
  forkCount: number;
  isArchived: boolean;
  updatedAt: string;

  licenseInfo: { key?: string; name?: string } | null;
  owner: { login: string };
  primaryLanguage?: { name: string };

  readme?: { text?: string } | null;
  contributing?: { text?: string } | null;
  contributors?: { totalCount: number };

  issues: { totalCount: number };
  goodFirstIssues?: { totalCount: number };
  helpWantedIssues?: { totalCount: number };
  firstTimers?: { totalCount: number };
  beginnerIssues?: { totalCount: number };
  bugIssues?: { totalCount: number };
  enhancementIssues?: { totalCount: number };
  documentationIssues?: { totalCount: number };
  refactorIssues?: { totalCount: number };
  highPriorityIssues?: { totalCount: number };

  issueSamples?: {
    nodes: {
      title: string;
      labels: { nodes: { name: string }[] };
      __typename: string;
    }[];
  };

  openPRs?: { totalCount: number };
  recentPRs?: {
    totalCount: number;
    nodes: { createdAt: string; mergedAt?: string }[];
  };

  repositoryTopics: { nodes: { topic: { name: string } }[] };
  defaultBranchRef?: { target?: { committedDate: string } };
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

  try {
    const response = await safeGithubQuery(query, {
      search: searchQuery,
      count: 3,
    });

    console.log("Fetched", response.search.nodes.length, "repos");

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
            (mergeTimes.reduce((a, b) => a + b, 0) / mergeTimes.length).toFixed(
              2
            )
          )
        : null;

      const prMergeRatio = (repo.recentPRs?.nodes || []).length
        ? (repo.recentPRs?.nodes || []).filter((pr: any) => pr.mergedAt)
            .length / (repo.recentPRs?.nodes || []).length
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

    // Improved filtering logic
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
      const forbiddenExact = [
        "guide",
        "tutorial",
        "book",
        "roadmap",
        "awesome",
      ];
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

    console.log(`${filtered.length}/${repos.length} repos passed filtering`);

    // Save to database
    if (filtered.length > 0) {
      await Project.bulkWrite(
        filtered.map((repo: any) => ({
          updateOne: {
            filter: { repoId: repo.repoId },
            update: {
              $set: repo,
            },
            upsert: true,
          },
        }))
      );

      console.log(`Saved ${filtered.length} repos to database`);
    }

    return filtered;
  } catch (error: any) {
    console.error("GitHub GraphQL fetch failed:", error);
    throw error;
  }
};

export const getReposFromDb = async (req: Request, res: Response) => {
  try {
    const { lang, limit = 20, page = 1, topic, level, category } = req.query;

    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 50));
    const safePage = Math.max(1, Number(page) || 1);

    const allowedLevels = ["beginner", "intermediate", "advanced"];
    const selectedLevelRaw =
      typeof level === "string" ? level.toLowerCase() : null;
    const selectedLevel =
      selectedLevelRaw && allowedLevels.includes(selectedLevelRaw)
        ? selectedLevelRaw
        : null;

    // Build filter
    const filter: any = {};

    if (lang) {
      filter.language = { $regex: new RegExp(`^${lang}$`, "i") };
    }

    if (topic) {
      filter.topics = { $regex: new RegExp(topic as string, "i") };
    }

    if (category) {
      filter.$or = [
        { ai_categories: { $regex: new RegExp(category as string, "i") } },
        { topics: { $regex: new RegExp(category as string, "i") } },
      ];
    }

    const skip = (safePage - 1) * safeLimit;

    // Fetch repos
    const repos = await Project.find(filter)
      .skip(skip)
      .limit(safeLimit)
      .lean()
      .exec();

    if (!repos || repos.length === 0) {
      return res.json({
        count: 0,
        page: safePage,
        limit: safeLimit,
        data: [],
      });
    }

    // Compute level-specific scores
    const scored = repos.map((repo: any) => {
      let levelScore = 0;

      if (!selectedLevel) {
        // No level filter: use overall quality
        levelScore =
          repo.accessibility * 0.4 +
          repo.maintenance * 0.3 +
          repo.friendliness * 0.3;
      } else if (selectedLevel === "beginner") {
        // Beginner: High friendliness + Low complexity + Good accessibility
        levelScore =
          repo.friendliness * 0.5 +
          (1 - repo.complexity) * 0.3 +
          repo.accessibility * 0.2;
      } else if (selectedLevel === "intermediate") {
        // Intermediate: Balanced
        levelScore =
          repo.maintenance * 0.4 +
          repo.accessibility * 0.3 +
          repo.friendliness * 0.15 +
          repo.complexity * 0.15;
      } else if (selectedLevel === "advanced") {
        // Advanced: High complexity + Good maintenance
        levelScore =
          repo.complexity * 0.5 +
          repo.maintenance * 0.4 +
          repo.accessibility * 0.1;
      }

      // Determine display level
      let displayLevel = "intermediate";
      if (repo.friendliness >= 0.65 && repo.complexity <= 0.35) {
        displayLevel = "beginner";
      } else if (repo.complexity >= 0.65 || repo.friendliness <= 0.3) {
        displayLevel = "advanced";
      }

      return {
        ...repo,
        level_score: levelScore,
        difficulty_level: displayLevel,
      };
    });

    // Sort by level_score descending
    scored.sort((a, b) => b.level_score - a.level_score);

    return res.json({
      count: scored.length,
      page: safePage,
      limit: safeLimit,
      data: scored,
    });
  } catch (error) {
    console.error("Error fetching repos from DB:", error);
    return res.status(500).json({
      message: "Failed to fetch repos",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getRepoById = async (req: Request, res: Response) => {
  try {
    const repo = await Project.findOne({ repoId: req.params.id }).lean();

    if (!repo) {
      return res.status(404).json({ message: "Repo not found" });
    }

    // Add difficulty level to response
    let displayLevel = "intermediate";
    if (repo.friendliness >= 0.65 && repo.complexity <= 0.35) {
      displayLevel = "beginner";
    } else if (repo.complexity >= 0.65 || repo.friendliness <= 0.3) {
      displayLevel = "advanced";
    }

    return res.json({
      ...repo,
      difficulty_level: displayLevel,
    });
  } catch (err) {
    console.error("Error fetching repo by ID:", err);
    return res.status(500).json({
      message: "Failed to fetch repo",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
