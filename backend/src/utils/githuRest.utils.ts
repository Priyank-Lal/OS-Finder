import { Octokit } from "@octokit/rest";
import { parseRepoIdentifier, queuedRestCall } from "./github.helper.js";
import { _config } from "../config/config.js";
import { cleanMarkdownForAI } from "./markdown.utils.js";

const octokit1 = new Octokit({
  auth: _config.GITHUB_TOKEN,
});

const octokit2 = new Octokit({
  auth: _config.GITHUB_TOKEN_2,
});

const octokit3 = new Octokit({
  auth: _config.GITHUB_TOKEN_3,
});


export async function fetchReadme(
  repoIdentifier: string
): Promise<string | null> {
  const { owner, repo } = parseRepoIdentifier(repoIdentifier);

  const result = await queuedRestCall(
    "README",
    `${owner}/${repo}`,
    async () => {
      const response = await octokit1.repos.getReadme({
        owner,
        repo,
        mediaType: { format: "raw" },
      });

      const rawReadme = response.data as unknown as string;
      // Clean markdown for AI processing
      return cleanMarkdownForAI(rawReadme);
    }
  );

  return result;
}

export async function fetchContributing(
  repoIdentifier: string
): Promise<string | null> {
  const { owner, repo } = parseRepoIdentifier(repoIdentifier);

  const result = await queuedRestCall(
    "CONTRIBUTING.md",
    `${owner}/${repo}`,
    async () => {
      // Try common locations
      const paths = [
        "CONTRIBUTING.md",
        "CONTRIBUTING",
        ".github/CONTRIBUTING.md",
        "docs/CONTRIBUTING.md",
      ];

      for (const path of paths) {
        try {
          const response = await octokit3.repos.getContent({
            owner,
            repo,
            path,
            mediaType: { format: "raw" },
          });

          if (response.data) {
            return response.data as unknown as string;
          }
        } catch (error: any) {
          if (error.status !== 404) throw error;
        }
      }

      return null;
    }
  );

  return result;
}

export async function fetchCodeOfConduct(
  repoIdentifier: string
): Promise<string | null> {
  const { owner, repo } = parseRepoIdentifier(repoIdentifier);

  const result = await queuedRestCall(
    "CODE_OF_CONDUCT",
    `${owner}/${repo}`,
    async () => {
      const paths = [
        "CODE_OF_CONDUCT.md",
        "CODE_OF_CONDUCT",
        ".github/CODE_OF_CONDUCT.md",
        "docs/CODE_OF_CONDUCT.md",
      ];

      for (const path of paths) {
        try {
          const response = await octokit3.repos.getContent({
            owner,
            repo,
            path,
            mediaType: { format: "raw" },
          });

          if (response.data) {
            return response.data as unknown as string;
          }
        } catch (error: any) {
          if (error.status !== 404) throw error;
        }
      }

      return null;
    }
  );

  return result;
}

export async function fetchFileTree(
  repoIdentifier: string,
  maxDepth: number = 3
): Promise<any | null> {
  const { owner, repo } = parseRepoIdentifier(repoIdentifier);

  const result = await queuedRestCall(
    "File Tree",
    `${owner}/${repo}`,
    async () => {
      // Get default branch first
      const repoData = await octokit2.repos.get({ owner, repo });
      const defaultBranch = repoData.data.default_branch;

      // Get tree SHA for default branch
      const branchData = await octokit2.repos.getBranch({
        owner,
        repo,
        branch: defaultBranch,
      });

      const treeSha = branchData.data.commit.sha;

      // Fetch recursive tree (GitHub API supports recursive=1)
      const treeData = await octokit2.git.getTree({
        owner,
        repo,
        tree_sha: treeSha,
        recursive: "1", // This gets the entire tree
      });

      // Filter by depth
      const filteredTree = treeData.data.tree
        .filter((item) => {
          if (!item.path) return false;
          const depth = item.path.split("/").length;
          return depth <= maxDepth;
        })
        .map((item) => ({
          name: item.path?.split("/").pop() || "",
          path: item.path,
          type: item.type === "tree" ? "tree" : "blob",
        }));

      return { entries: filteredTree };
    }
  );

  return result;
}

export async function fetchIssueTemplates(
  repoIdentifier: string
): Promise<boolean> {
  const { owner, repo } = parseRepoIdentifier(repoIdentifier);

  const result = await queuedRestCall(
    "Issue Templates",
    `${owner}/${repo}`,
    async () => {
      const paths = [
        ".github/ISSUE_TEMPLATE",
        ".github/ISSUE_TEMPLATE.md",
        "ISSUE_TEMPLATE",
        "ISSUE_TEMPLATE.md",
      ];

      for (const path of paths) {
        try {
          const response = await octokit2.repos.getContent({
            owner,
            repo,
            path,
          });

          if (response.data) {
            return true;
          }
        } catch (error: any) {
          if (error.status !== 404) throw error;
        }
      }

      return false;
    }
  );

  return result || false;
}
