import { graphql } from "@octokit/graphql";
import { _config } from "../config/config";

export interface GitHubRepoNode {
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
  codeOfConduct?: { text?: string } | null;
  contributors?: { totalCount: number };

  // File tree structure
  fileTree?: {
    entries: {
      name: string;
      type: string;
      object?: {
        entries?: {
          name: string;
          type: string;
        }[];
      };
    }[];
  };

  // Languages breakdown
  languages?: {
    edges: {
      size: number;
      node: {
        name: string;
      };
    }[];
  };

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
      createdAt: string;
      comments: { totalCount: number };
      timelineItems: {
        nodes: {
          __typename: string;
          createdAt?: string;
        }[];
      };
    }[];
  };

  openPRs?: { totalCount: number };
  recentPRs?: {
    totalCount: number;
    nodes: {
      createdAt: string;
      mergedAt?: string;
      comments: { totalCount: number };
    }[];
  };

  repositoryTopics: { nodes: { topic: { name: string } }[] };
  defaultBranchRef?: {
    target?: {
      committedDate: string;
      history: {
        totalCount: number;
      };
    };
  };
}

export interface GitHubResponse {
  search: {
    nodes: GitHubRepoNode[];
  };
}

const query = `query ($search: String!, $count: Int!, $cursor: String) {
  search(query: $search, type: REPOSITORY, first: $count, after: $cursor) {
    pageInfo {
      endCursor
      hasNextPage
    }
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

        licenseInfo {
          key
          name
        }

        owner {
          login
        }

        primaryLanguage {
          name
        }

        # Languages breakdown (keep - cheap)
        languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
          edges {
            size
            node {
              name
            }
          }
        }

        # Default branch last commit + commit history (cheap)
        defaultBranchRef {
          target {
            ... on Commit {
              committedDate
              history {
                totalCount
              }
            }
          }
        }

        # Repo topics (cheap)
        repositoryTopics(first: 10) {
          nodes {
            topic {
              name
            }
          }
        }

        # KEEP issueSample basics (needed for scoring) — lightweight
        issueSamples: issues(
          first: 3
          states: OPEN
          orderBy: { field: CREATED_AT, direction: DESC }
        ) {
          nodes {
            title
            createdAt
            labels(first: 5) {
              nodes {
                name
              }
            }
          }
        }

        # KEEP standard issue categories (cheap)
        issues(states: OPEN) { totalCount }

        goodFirstIssues: issues(
          labels: ["good first issue", "good-first-issue"]
          states: OPEN
        ) { totalCount }

        helpWantedIssues: issues(
          labels: ["help wanted", "help-wanted"]
          states: OPEN
        ) { totalCount }

        # Removed expensive specific issue counts to prevent 502s
        # firstTimers, beginnerIssues, refactorIssues, highPriorityIssues removed

        bugIssues: issues(labels: ["bug", "Bug"], states: OPEN) { totalCount }

        enhancementIssues: issues(labels: ["enhancement"], states: OPEN) { totalCount }

        documentationIssues: issues(labels: ["documentation"], states: OPEN) { totalCount }

        # Pull request activity — REMOVE comments (heavy)
        openPRs: pullRequests(states: OPEN) {
          totalCount
        }

        recentPRs: pullRequests(
          states: [OPEN, MERGED, CLOSED]
          first: 3
          orderBy: { field: CREATED_AT, direction: DESC }
        ) {
          nodes {
            createdAt
            mergedAt
          }
          totalCount
        }

        # Contributors count (cheap)
        contributors: mentionableUsers(first: 1) {
          totalCount
        }
      }
    }
  }
}`;

const tokens = [
  _config.GITHUB_TOKEN,
  _config.GITHUB_TOKEN_3,
].filter(Boolean);

let tokenIndex = 0;

function getClient() {
  if (tokens.length === 0) {
    throw new Error("No GitHub tokens available");
  }
  const token = tokens[tokenIndex];
  tokenIndex = (tokenIndex + 1) % tokens.length;
  return graphql.defaults({
    headers: { authorization: `token ${token}` },
  });
}

const dateLimit = new Date();
dateLimit.setDate(dateLimit.getDate() - 60);
const dateString = dateLimit.toISOString().split("T")[0];

export async function safeGithubQuery(
  metadata: any,
  retries = 2
): Promise<any> {
  const searchQuery = `language:${metadata?.lang} stars:>${metadata?.minStars} fork:false archived:false pushed:>=${dateString}`;
  const variables = {
    search: searchQuery,
    count: 10,
    cursor: metadata?.cursor || null,
  };

  try {
    const client = getClient();
    const response = await client(query, variables) as any;
    
    if (!response || !response.search) {
      throw new Error("Invalid response from GitHub API");
    }
    return response;
  } catch (err: any) {
    if (retries <= 0) throw err;
    console.warn(`GitHub query failed, retrying (${retries} left):`, err.message);
    await new Promise((res) => setTimeout(res, 2000)); 
    return safeGithubQuery(metadata, retries - 1);
  }
}
