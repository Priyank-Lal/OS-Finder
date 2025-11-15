import PQueue from "p-queue";
import { generateReadmeSummary } from "./gemini";
import { Octokit } from "octokit";
import { _config } from "../config/config";
import { Project } from "../models/project.model";
import mongoose from "mongoose";

// export async function connectDB() {
//   try {
//     await mongoose.connect(_config.MONGODB_URI || "");
//     console.log("Connected to MongoDB");
//   } catch (error) {
//     console.error("Error connecting to MongoDB:", error);
//   }
// }

// connectDB()


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
  if (!readme) {
    console.log("Readme found");

    return;
  }

  const result = await generateReadmeSummary(readme);
  if (!result) return;

  await Project.updateOne(
    { _id: repo._id },
    {
      $set: {
        summary: result.summary,
        summary_level: result.level,
        ai_categories: result.repo_categories,
      },
    }
  );

  console.log(`Summarized Repo: ${repo.repo_name}`);
}

export async function processSummaries() {
  try {
    const queue = new PQueue({ concurrency: 5, interval: 2500 });
    const repos = await Project.find({
      $or: [
        { summary: { $exists: false } },
        { summary: "" },
        { summary: null },
      ],
    })
      .select("_id repo_url repo_name summary")
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
  } catch (error) {
    console.log("Error occured while Summarizing Repos: ", error);
  }
}

// processSummaries();
