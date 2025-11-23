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

    const response = await octokit.rest.issues.listLabelsForRepo({
      owner,
      repo: name,
      per_page: 100, // Fetch up to 100 labels
    });

    return response.data.map((label: any) => ({
      name: label.name,
      color: label.color,
      description: label.description || "",
    }));
  } catch (error: any) {
    console.error(`Failed to fetch labels for ${repoUrl}:`, error.message);
    return []; // Return empty array on failure to not block summarization
  }
}
