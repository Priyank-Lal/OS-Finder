// backend/src/services/github.rest.ts
import { Octokit } from "@octokit/rest";
import { _config } from "../config/config.js";
import PQueue from "p-queue";
import { parseRepoIdentifier } from "../utils/github.helper.js";
import {
  fetchReadme,
  fetchCodeOfConduct,
  fetchFileTree,
  fetchContributing,
} from "../utils/githuRest.utils.js";



// REST API rate limit: 5000 requests/hour = ~83 requests/minute
// Using 80% safety margin = ~66 requests/minute
export const REST_QUEUE = new PQueue({
  concurrency: 3,
  interval: 60000, // 1 minute
  intervalCap: 66, // 66 requests per minute
});


export async function fetchAllCommunityFiles(repoIdentifier: string): Promise<{
  readme: string | null;
  contributing: string | null;
  codeOfConduct: string | null;
  fileTree: any | null;
}> {
  const { owner, repo } = parseRepoIdentifier(repoIdentifier);
  const repoName = `${owner}/${repo}`;

  console.log(`\n📥 Fetching community files for ${repoName}...`);

  // Fetch all in parallel (queue handles rate limiting)
  const [readme, contributing, codeOfConduct, fileTree] =
    await Promise.all([
      fetchReadme(repoIdentifier),
      fetchContributing(repoIdentifier),
      fetchCodeOfConduct(repoIdentifier),
      fetchFileTree(repoIdentifier),
    ]);

  console.log(`✅ Community files fetched for ${repoName}`);
  console.log(`   - README: ${readme ? "✓" : "✗"}`);
  console.log(`   - CONTRIBUTING: ${contributing ? "✓" : "✗"}`);
  console.log(`   - CODE_OF_CONDUCT: ${codeOfConduct ? "✓" : "✗"}`);
  console.log(`   - File Tree: ${fileTree ? "✓" : "✗"}`);


  return {
    readme,
    contributing,
    codeOfConduct,
    fileTree,
  };
}

export function getRestQueueStatus() {
  return {
    size: REST_QUEUE.size,
    pending: REST_QUEUE.pending,
    isPaused: REST_QUEUE.isPaused,
  };
}

export interface PRMetrics {
  avg_pr_merge_hours: number | null;
  pr_merge_ratio: number;
  total_prs_checked: number;
}

/**
 * Fetch PR metrics using REST API (avoids GraphQL complexity limits)
 * @param owner - Repository owner
 * @param repo - Repository name
 */
export async function fetchPRMetrics(
  owner: string,
  repo: string
): Promise<PRMetrics> {
  try {
    const octokit = new Octokit({ auth: _config.GITHUB_PR_TOKEN });

    // Fetch recent PRs (last 30)
    const { data: prs } = await octokit.pulls.list({
      owner,
      repo,
      state: "all", // Get open, closed, and merged
      sort: "updated",
      direction: "desc",
      per_page: 30,
    });

    if (prs.length === 0) {
      return {
        avg_pr_merge_hours: null,
        pr_merge_ratio: 0,
        total_prs_checked: 0,
      };
    }

    // Calculate metrics
    const mergedPRs = prs.filter((pr) => pr.merged_at);
    const mergeTimes: number[] = [];

    for (const pr of mergedPRs) {
      if (pr.created_at && pr.merged_at) {
        const created = new Date(pr.created_at).getTime();
        const merged = new Date(pr.merged_at).getTime();
        const hoursToMerge = (merged - created) / (1000 * 60 * 60);
        mergeTimes.push(hoursToMerge);
      }
    }

    const avg_pr_merge_hours =
      mergeTimes.length > 0
        ? mergeTimes.reduce((a, b) => a + b, 0) / mergeTimes.length
        : null;

    const pr_merge_ratio = prs.length > 0 ? mergedPRs.length / prs.length : 0;

    console.log(`📊 PR metrics for ${owner}/${repo}: ${Math.round(avg_pr_merge_hours || 0)}h avg, ${Math.round(pr_merge_ratio * 100)}% merged`);

    return {
      avg_pr_merge_hours: avg_pr_merge_hours ? Math.round(avg_pr_merge_hours) : null,
      pr_merge_ratio: Math.round(pr_merge_ratio * 100) / 100,
      total_prs_checked: prs.length,
    };
  } catch (error: any) {
    console.error(`Failed to fetch PR metrics for ${owner}/${repo}:`, error.message);
    return {
      avg_pr_merge_hours: null,
      pr_merge_ratio: 0,
      total_prs_checked: 0,
    };
  }
}

export interface IssueSample {
  title: string;
  labels: string[];
  created_at: string;
  has_response: boolean;
}

/**
 * Fetch recent open issues for AI context
 */
export async function fetchIssueSamples(
  owner: string,
  repo: string
): Promise<IssueSample[]> {
  try {
    // Use dedicated token if available, otherwise fallback
    const token =  _config.GITHUB_ISSUE_TOKEN;
    const octokit = new Octokit({ auth: token });

    const { data: issues } = await octokit.issues.listForRepo({
      owner,
      repo,
      state: "open",
      sort: "created",
      direction: "desc",
      per_page: 10,
    });

    return issues
      .filter((i: any) => !i.pull_request)
      .map((i: any) => ({
        title: i.title,
        labels: i.labels.map((l: any) => (typeof l === "string" ? l : l.name)),
        created_at: i.created_at,
        has_response: i.comments > 0,
      }));
  } catch (error: any) {
    console.warn(`Failed to fetch issue samples for ${owner}/${repo}:`, error.message);
    return [];
  }
}
