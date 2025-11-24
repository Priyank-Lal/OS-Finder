import { _config } from "../../config/config.js";
import { Project } from "../../models/project.model.js";
import mongoose from "mongoose";
import { summarizeRepo } from "./utils.js";
import {
  AI_CALLS_PER_REPO,
  aiQueue,
  BATCH_LIMIT,
  repoQueue,
  TOTAL_SAFE_RPM,
} from "./queue.js";

const MAX_RETRY_ATTEMPTS = 3;

export async function processSummaries(): Promise<void> {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(_config.MONGODB_URI);
      console.log("✓ Connected to MongoDB");
    }

    console.log("\n" + "=".repeat(70));

    // Fetch repos needing summarization
    const repos = await Project.find({
      $and: [
        {
          $or: [
            { summary: { $exists: false } },
            { summary: "" },
            { summary: null },
            { file_tree_metrics: { $exists: false } },
          ],
        },
        { status: { $ne: "rejected" } },
        {
          $or: [
            { summarization_attempts: { $exists: false } },
            { summarization_attempts: { $lt: MAX_RETRY_ATTEMPTS } },
          ],
        },
      ],
    })
      .select(
        "_id repo_url repo_name stars forkCount contributors topics language " +
          "issue_data activity last_commit last_updated beginner_friendliness " +
          "languages_breakdown summarization_attempts last_summarization_error"
      )
      .sort({ summarization_attempts: 1, stars: -1 }) // Prioritize: new repos, then popular
      .limit(BATCH_LIMIT)
      .lean();

    if (!repos.length) {
      console.log("No repos pending summarization.");
      return;
    }

    console.log(`Found ${repos.length} repos to process`);

    // Show retry info
    const retryCounts = repos.reduce((acc: any, repo: any) => {
      const attempts = repo.summarization_attempts || 0;
      acc[attempts] = (acc[attempts] || 0) + 1;
      return acc;
    }, {});

    console.log("Retry distribution:");
    Object.entries(retryCounts)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([attempts, count]) => {
        console.log(
          `   - ${
            attempts === "0" ? "New" : `Retry #${attempts}`
          }: ${count} repos`
        );
      });
    console.log("");

    // Process repos summarization
    let completed = 0;
    let successful = 0;
    let failed = 0;

    let scheduledCount = 0;

    for (const repo of repos) {
      scheduledCount++;
      repoQueue.add(async () => {
        try {
          await summarizeRepo(repo);
          successful++;
        } catch (err: any) {
          console.error(`Failed: ${repo.repo_name}`);
          failed++;
        } finally {
          completed++;
        }
      });
      
      // Add delay to prevent overloading the queue
      // Use exponential backoff for repos that have failed before
      const attempts = repo.summarization_attempts || 0;
      const baseDelay = 5000;
      const retryDelay = attempts > 0 ? baseDelay * Math.pow(2, attempts) : baseDelay;
      await new Promise((resolve) => setTimeout(resolve, retryDelay));

      // Batch pause logic: Pause for 60s every 5 repos to respect API limits
      if (scheduledCount % 5 === 0) {
        console.log(`\n--- Pausing for 90s to cool down API (Processed batch of 5) ---\n`);
        await new Promise((resolve) => setTimeout(resolve, 90000));
      }
    }

    // Wait for completion
    await repoQueue.onIdle();
    await aiQueue.onIdle();

    // Final summary
    console.log("\n" + "=".repeat(70));
    console.log("SUMMARIZATION COMPLETE");
    console.log("=".repeat(70));
    console.log(`Results:`);
    console.log(`   - Total repos: ${repos.length}`);
    console.log(
      `   - Successful: ${successful} (${Math.round(
        (successful / repos.length) * 100
      )}%)`
    );
    console.log(
      `   - Failed: ${failed} (${Math.round((failed / repos.length) * 100)}%)`
    );
    console.log(`Queue Statistics:`);
    console.log(
      `   - AI Queue: ${aiQueue.size} pending, ${aiQueue.pending} running`
    );
    console.log(
      `   - Repo Queue: ${repoQueue.size} pending, ${repoQueue.pending} running`
    );
    console.log("=".repeat(70) + "\n");
  } catch (error) {
    console.error("FATAL ERROR during summarization:", error);
    throw error;
  }
}

processSummaries()