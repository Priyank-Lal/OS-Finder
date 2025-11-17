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

        bugIssues: issues(labels: ["bug", "Bug",], states: OPEN) {
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

