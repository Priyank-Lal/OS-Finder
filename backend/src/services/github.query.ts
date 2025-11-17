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

        # Languages breakdown (for complexity analysis)
        languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
          edges {
            size
            node {
              name
            }
          }
        }

        # Latest commit on default branch with commit count
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

        # Repo topics (up to 10)
        repositoryTopics(first: 10) {
          nodes {
            topic {
              name
            }
          }
        }

        # File tree structure (critical for complexity analysis)
        fileTree: object(expression: "HEAD:") {
          ... on Tree {
            entries {
              name
              type
              object {
                ... on Tree {
                  entries {
                    name
                    type
                  }
                }
              }
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

        # CODE_OF_CONDUCT.md (community health indicator)
        codeOfConduct: object(expression: "HEAD:CODE_OF_CONDUCT.md") {
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

        # Issues with response time data
        issueSamples: issues(
          first: 20
          states: OPEN
          orderBy: { field: CREATED_AT, direction: DESC }
        ) {
          nodes {
            title
            createdAt
            labels(first: 10) {
              nodes {
                name
              }
            }
            comments {
              totalCount
            }
            timelineItems(first: 5, itemTypes: [ISSUE_COMMENT]) {
              nodes {
                __typename
                ... on IssueComment {
                  createdAt
                }
              }
            }
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

        bugIssues: issues(labels: ["bug", "Bug"], states: OPEN) {
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

        # Pull request activity with comment data
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
            comments {
              totalCount
            }
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
    count: 3,
  };

  try {
    return await gh(query, variables);
  } catch (err: any) {
    if (retries <= 0) throw err;
    await new Promise((res) => setTimeout(res, 1000));
    return safeGithubQuery(variables, retries - 1);
  }
}
