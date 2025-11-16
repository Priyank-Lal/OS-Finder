import PQueue from "p-queue";
import {
  generateReadmeSummary,
  generateTechAndSkills,
  generateContributionAreas,
  generateTaskSuggestions,
} from "./gemini";
import { Octokit } from "octokit";
import { _config } from "../config/config";
import { Project } from "../models/project.model";
import mongoose from "mongoose";

// Constants
const QUEUE_CONCURRENCY = 5;
const QUEUE_INTERVAL = 2500;
const BATCH_LIMIT = 30;
const NOTABLE_FILES = [
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "Dockerfile",
  "README.md",
  "CONTRIBUTING.md",
  "setup.py",
  "go.mod",
  "pom.xml",
  "build.gradle",
];

// Database connection
export async function connectDB() {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log("Already connected to MongoDB");
      return;
    }

    if (!_config.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in config");
    }

    await mongoose.connect(_config.MONGODB_URI);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

const octokit = new Octokit({ auth: _config.GITHUB_TOKEN });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Fetch file tree with better error handling
async function fetchFileTree(owner: string, name: string): Promise<string[]> {
  try {
    const treeRes = await octokit.request(
      "GET /repos/{owner}/{repo}/git/trees/HEAD?recursive=1",
      { owner, repo: name }
    );

    const tree = treeRes.data?.tree || [];
    const topLevel = new Set<string>();
    const notableFiles = new Set<string>();

    for (const node of tree) {
      const path: string = node.path || "";
      const parts = path.split("/");

      // Add top-level directories/files
      if (parts.length > 1) {
        topLevel.add(parts[0] + "/");
      } else {
        topLevel.add(parts[0]);
      }

      // Add notable files
      const fileName = parts[parts.length - 1];
      if (NOTABLE_FILES.includes(fileName)) {
        notableFiles.add(fileName);
      }

      // Stop early if we have enough info
      if (topLevel.size >= 12 && notableFiles.size >= 5) break;
    }

    return [...topLevel, ...notableFiles];
  } catch (err: any) {
    const status = err?.status || 0;
    const message = err?.message || String(err);

    if (status === 404) {
      console.warn(`Repository tree not found for ${owner}/${name}`);
    } else if (status === 403) {
      console.warn(`Rate limit or access forbidden for ${owner}/${name}`);
    } else if (status === 409) {
      console.warn(`Empty repository ${owner}/${name}`);
    } else {
      console.warn(`Failed to fetch tree for ${owner}/${name}:`, message);
    }

    return [];
  }
}

// Validate AI results before saving
function validateAIResults(results: {
  phase1: any;
  phase2: any;
  phase3: any;
  phase4: any;
}): boolean {
  const { phase1, phase2, phase3, phase4 } = results;

  // At minimum, we need a summary or some content
  const hasSummary = phase1?.summary && phase1.summary.length > 10;
  const hasTechStack = phase2?.tech_stack && phase2.tech_stack.length > 0;
  const hasSkills =
    phase2?.required_skills && phase2.required_skills.length > 0;

  if (!hasSummary && !hasTechStack && !hasSkills) {
    console.warn(
      "AI results validation failed: no meaningful content generated"
    );
    return false;
  }

  return true;
}

// Summarizes single repo (DB-first; only fetch file-tree via REST)
async function summarizeRepo(repo: any) {
  const repoName = repo.repo_name;

  try {
    const [owner, name] = repo.repo_url
      .replace("https://github.com/", "")
      .split("/");

    if (!owner || !name) {
      console.error(`Invalid repo URL format: ${repo.repo_url}`);
      return;
    }

    // Use DB-provided README / contributing / issue samples when available
    const readme = (repo.readme_raw && String(repo.readme_raw).trim()) || null;
    const contributingMd =
      (repo.contributing_raw && String(repo.contributing_raw).trim()) || null;
    const issueSamplesFromDb: { title: string; labels: string[] }[] =
      repo.issue_samples || repo.issueSamples || [];

    if (!readme) {
      console.warn(`Skipping ${repoName}: no README in DB`);
      // Mark as needs_review so it can be checked manually
      await Project.updateOne(
        { _id: repo._id },
        { $set: { needs_review: true } }
      ).catch((err) =>
        console.error(`Failed to update needs_review for ${repoName}:`, err)
      );
      return;
    }

    // Build metadata from DB record
    const metadata = {
      stars: repo.stars ?? repo.stargazerCount ?? 0,
      forks: repo.forkCount ?? 0,
      contributors: repo.contributors ?? 0,
      topics: repo.topics ?? repo.repositoryTopics ?? [],
      language: repo.language ?? repo.primaryLanguage?.name ?? null,
      issue_counts: repo.issue_data ?? {},
      activity: repo.activity ?? {},
      last_commit:
        repo.last_commit ??
        repo.defaultBranchRef?.target?.committedDate ??
        null,
      last_updated: repo.last_updated ?? repo.updatedAt ?? null,
    };

    // Fetch file tree (best-effort)
    console.log(`Fetching file tree for ${repoName}...`);
    const fileTree = await fetchFileTree(owner, name);

    if (fileTree.length === 0) {
      console.warn(`No file tree data for ${repoName}, continuing without it`);
    }

    // Phase 1: summary + level + categories (use readme + metadata)
    console.log(`Phase 1: Generating summary for ${repoName}...`);
    const phase1 = await generateReadmeSummary(readme, metadata);

    if (!phase1.summary) {
      console.warn(`Phase 1 failed for ${repoName}: no summary generated`);
    }

    // Phase 2: tech stack + required skills (readme + file tree + topics)
    console.log(`Phase 2: Analyzing tech stack for ${repoName}...`);
    const phase2 = await generateTechAndSkills({
      readme,
      fileTree,
      topics: metadata.topics,
    });

    // Phase 3: main contribution areas (use issue samples from DB + counts + contributing.md + phase outputs)
    console.log(`Phase 3: Identifying contribution areas for ${repoName}...`);
    const phase3 = await generateContributionAreas({
      issue_counts: metadata.issue_counts,
      issue_samples: issueSamplesFromDb,
      topics: metadata.topics,
      phase1,
      phase2,
      contributing_md: contributingMd,
    });

    // Phase 4: beginner / intermediate task suggestions
    console.log(`Phase 4: Generating task suggestions for ${repoName}...`);
    const phase4 = await generateTaskSuggestions({
      phase1,
      phase2,
      phase3,
      issue_samples: issueSamplesFromDb,
      scores: {
        friendliness: repo.friendliness ?? 0,
        complexity: repo.complexity ?? 0,
        maintenance: repo.maintenance ?? 0,
      },
      metadata,
    });

    // Validate results before saving
    if (!validateAIResults({ phase1, phase2, phase3, phase4 })) {
      console.warn(`Validation failed for ${repoName}, marking for review`);
      await Project.updateOne(
        { _id: repo._id },
        { $set: { needs_review: true } }
      ).catch((err) =>
        console.error(`Failed to update needs_review for ${repoName}:`, err)
      );
      return;
    }

    // Persist all new fields to DB (do a safe $set)
    await Project.updateOne(
      { _id: repo._id },
      {
        $set: {
          summary: phase1.summary || "",
          summary_level: phase1.level || "intermediate",
          ai_categories: phase1.repo_categories || [],
          tech_stack: phase2.tech_stack || [],
          required_skills: phase2.required_skills || [],
          main_contrib_areas: phase3.main_contrib_areas || [],
          beginner_tasks: phase4.beginner_tasks || [],
          intermediate_tasks: phase4.intermediate_tasks || [],
          needs_review: false,
          summarizedAt: new Date(),
        },
      }
    );

    console.log(`✓ Successfully summarized ${repoName}`);
  } catch (err: any) {
    console.error(`Error summarizing ${repoName}:`, err.message);

    // Mark repo as needing review on error
    try {
      await Project.updateOne(
        { _id: repo._id },
        { $set: { needs_review: true } }
      );
    } catch (updateErr) {
      console.error(`Failed to mark ${repoName} for review:`, updateErr);
    }

    throw err;
  }
}

// Statistics tracking
interface ProcessStats {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
}

export async function processSummaries() {
  const stats: ProcessStats = {
    total: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
  };

  try {
    // Ensure DB connection
    await connectDB();

    const queue = new PQueue({
      concurrency: QUEUE_CONCURRENCY,
      interval: QUEUE_INTERVAL,
      intervalCap: QUEUE_CONCURRENCY,
    });

    // Find repos that need summarization
    const repos = await Project.find({
      $or: [
        { summary: { $exists: false } },
        { summary: "" },
        { summary: null },
      ],
    })
      .select(
        "_id repo_url repo_name summary stars forkCount contributors topics language issue_data activity last_commit last_updated friendliness complexity maintenance readme_raw contributing_raw issue_samples"
      )
      .limit(BATCH_LIMIT)
      .lean(); // Use lean for better performance

    if (!repos.length) {
      console.log("✓ No repos pending summarization.");
      return;
    }

    stats.total = repos.length;
    console.log(`\n📊 Starting summarization of ${repos.length} repos...\n`);

    // Track progress
    let completed = 0;

    for (const repo of repos) {
      queue.add(async () => {
        try {
          await summarizeRepo(repo);
          stats.successful++;
        } catch (err: any) {
          console.error(`Error processing ${repo.repo_name}:`, err.message);
          stats.failed++;
        } finally {
          completed++;
          console.log(
            `Progress: ${completed}/${stats.total} (${Math.round(
              (completed / stats.total) * 100
            )}%)`
          );
        }
      });
    }

    await queue.onIdle();

  } catch (error) {
    console.error("❌ Fatal error during summarization:", error);
    throw error;
  }
}
