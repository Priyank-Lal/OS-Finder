import PQueue from "p-queue";
import { generateReadmeSummary } from "./gemini";
import { Octokit } from "octokit";
import { _config } from "../config/config";
import { Project } from "../models/project.model";

const octokit = new Octokit({ auth: _config.GITHUB_TOKEN });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchReadme(owner: string, repo: string) {
  try {
    const { data } = await octokit.request("GET /repos/{owner}/{repo}/readme", {
      owner,
      repo,
    });
    return Buffer.from(data.content, "base64").toString("utf-8");
  } catch (err: any) {
    console.error(`README fetch failed for ${owner}/${repo}:`, err.message);
    return null;
  }
}

// Summarizes single repo
async function summarizeRepo(repo: any) {
  const [owner, name] = repo.repo_url
    .replace("https://github.com/", "")
    .split("/");

  const readme = await fetchReadme(owner, name);
  if (!readme) return;

  const result = await generateReadmeSummary(readme);
  if (!result) return;

  await Project.updateOne(
    { _id: repo._id },
    { $set: { summary: result.summary, summary_level: result.level } }
  );

  console.log(`Summarized Repo: ${repo.repo_name}`);
}

export async function processSummaries() {
  const queue = new PQueue({ concurrency: 5, interval: 2500 });
  const repos = await Project.find({
    $or: [{ summary: { $exists: false } }, { summary: "" }],
  })
    .select("repo_url repo_name summary")
    .limit(30);

  if (!repos.length) {
    console.log("No repos pending summarization.");
    return;
  }

  console.log(`Summarizing ${repos.length} repos...`);

  for (const repo of repos) {
    queue.add(async () => {
      try {
        await summarizeRepo(repo);
        // await sleep(2500);
      } catch (err: any) {
        console.error(`Error - ${repo.repo_name}:`, err.message);
      }
    });
  }

  await queue.onIdle();
  console.log("All summaries processed.");
}
