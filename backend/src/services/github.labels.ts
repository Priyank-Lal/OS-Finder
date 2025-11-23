import { Octokit } from "@octokit/rest";
import { _config } from "../config/config.js";
import { Label } from "../models/project.interface.js";

const octokit = new Octokit({
  auth: _config.GITHUB_LABEL_TOKEN || _config.GITHUB_TOKEN,
});

export async function fetchRepoLabels(repoUrl: string): Promise<Label[]> {
  try {
    const [owner, name] = repoUrl.replace("https://github.com/", "").split("/");

    if (!owner || !name) {
      throw new Error("Invalid repo URL");
    }

    const query = `
      query($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          labels(first: 100, orderBy: {field: NAME, direction: ASC}) {
            nodes {
              name
              issues(states: OPEN) {
                totalCount
              }
            }
          }
        }
      }
    `;

    const response: any = await octokit.graphql(query, {
      owner,
      name,
    });

    return response.repository.labels.nodes.map((label: any) => ({
      name: label.name,
      count: label.issues.totalCount,
    }));
  } catch (error: any) {
    console.error(`Failed to fetch labels for ${repoUrl}:`, error.message);
    return []; // Return empty array on failure to not block summarization
  }
}
