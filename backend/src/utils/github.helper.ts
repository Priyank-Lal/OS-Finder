import { REST_QUEUE } from "../services/github.rest";

export function parseRepoIdentifier(identifier: string): {
  owner: string;
  repo: string;
} {
  if (identifier.startsWith("http")) {
    const match = identifier.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) throw new Error(`Invalid GitHub URL: ${identifier}`);
    return { owner: match[1], repo: match[2] };
  }

  const parts = identifier.split("/");
  if (parts.length !== 2) {
    throw new Error(`Invalid repo identifier: ${identifier}`);
  }

  return { owner: parts[0], repo: parts[1] };
}

export async function queuedRestCall<T>(
  callName: string,
  repoName: string,
  apiCall: () => Promise<T>
): Promise<T | null> {
  return REST_QUEUE.add(async () => {
    try {
      const result = await apiCall();
      console.log(`  ✓ REST: ${callName} fetched for ${repoName}`);
      return result;
    } catch (error: any) {
      // 404 is expected for missing files
      if (error.status === 404) {
        console.log(`  ℹ REST: ${callName} not found for ${repoName}`);
        return null;
      }

      console.error(
        `  ✗ REST: ${callName} failed for ${repoName}:`,
        error.message
      );
      return null;
    }
  }) as Promise<T | null>;
}