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
