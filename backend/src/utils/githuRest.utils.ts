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

      let totalFiles = 0;
      let totalDirectories = 0;
      let totalDepth = 0;
      let testFiles = 0;
      let docFiles = 0;
      let ciFiles = 0;
      let configFiles: string[] = [];
      let lockFiles: string[] = [];
      let isMonorepo = false;

      const rootLevelDirs = new Set<string>();

      for (const item of treeData.data.tree) {
        if (!item.path) continue;

        const pathParts = item.path.split("/");
        const depth = pathParts.length;
        const fileName = pathParts[pathParts.length - 1].toLowerCase();

        if (depth === 1 && item.type === "tree") {
          rootLevelDirs.add(fileName);
        }

        if (item.type === "blob") {
          totalFiles++;
          totalDepth += depth;

          if (
            fileName.includes("test") ||
            fileName.includes("spec") ||
            fileName.endsWith(".test.js") ||
            fileName.endsWith(".spec.js") ||
            fileName.endsWith(".test.ts") ||
            fileName.endsWith(".spec.ts") ||
            fileName.endsWith(".test.jsx") ||
            fileName.endsWith(".spec.jsx") ||
            fileName.endsWith(".test.tsx") ||
            fileName.endsWith(".spec.tsx")
          ) {
            testFiles++;
          } else if (
            item.path.startsWith("docs/") ||
            item.path.startsWith(".github/docs/") ||
            fileName.includes("readme") ||
            fileName.includes("contributing") ||
            fileName.includes("license")
          ) {
            docFiles++;
          } else if (
            item.path.startsWith(".github/workflows/") ||
            fileName.includes("jenkinsfile") ||
            fileName.includes("travis.yml") ||
            fileName.includes("circle.yml") ||
            fileName.includes("azure-pipelines.yml")
          ) {
            ciFiles++;
          } else if (
            fileName.endsWith("package.json") ||
            fileName.endsWith("tsconfig.json") ||
            fileName.endsWith("webpack.config.js") ||
            fileName.endsWith("babel.config.js") ||
            fileName.endsWith("pom.xml") ||
            fileName.endsWith("build.gradle") ||
            fileName.endsWith("Dockerfile") ||
            fileName.endsWith("docker-compose.yml")
          ) {
            configFiles.push(item.path);
          } else if (
            fileName.endsWith("package-lock.json") ||
            fileName.endsWith("yarn.lock") ||
            fileName.endsWith("pnpm-lock.yaml") ||
            fileName.endsWith("Gemfile.lock") ||
            fileName.endsWith("composer.lock")
          ) {
            lockFiles.push(item.path);
          }
        } else if (item.type === "tree") {
          totalDirectories++;
        }
      }

      // Check for monorepo indicators (e.g., multiple package.json files at root level, or common monorepo tools)
      const rootPackageJsons = configFiles.filter(
        (p) => p.split("/").length === 2 && p.endsWith("package.json")
      );
      if (rootPackageJsons.length > 1) {
        isMonorepo = true;
      } else if (
        rootLevelDirs.has("packages") ||
        rootLevelDirs.has("apps") ||
        rootLevelDirs.has("modules")
      ) {
        isMonorepo = true;
      }

      return {
        totalFiles,
        totalDirectories,
        maxDepth, // This maxDepth is the input parameter, not the actual max depth found
        avgDepth: totalFiles > 0 ? totalDepth / totalFiles : 0,
        hasTests: testFiles > 0,
        hasDocs: docFiles > 0,
        hasCI: ciFiles > 0,
        hasMonorepo: isMonorepo,
        buildComplexity: configFiles.length * 0.5 + lockFiles.length * 1.0,
        testToCodeRatio: totalFiles > 0 ? testFiles / totalFiles : 0,
      };
    }
  );

  return result;
}

