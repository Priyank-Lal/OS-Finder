// backend/src/utils/summarizer.ts
import PQueue from "p-queue";
import {
  generateReadmeSummary,
  generateTechAndSkills,
  generateContributionAreas,
  generateTaskSuggestions,
} from "../ai";
import { _config } from "../config/config";
import { Project } from "../models/project.model";
import mongoose from "mongoose";
import { validateAIResults } from "../ai/gemini.utils";
import { computeDetailedScores } from "./scoring";
import { analyzeCodebaseComplexity } from "../scoring/scoring.ai";

// ============================================================================
// CONFIGURATION - Rate limiting based on API key count
// ============================================================================

const apiKeyCount = (_config.GEMINI_KEYS || "")
  .split(",")
  .filter(Boolean).length;

const AI_CALLS_PER_REPO = 5;

// Gemini Flash Lite: ~15 RPM per key
// Using 80% of limit for safety margin
const SAFE_RPM_PER_KEY = 12;
const TOTAL_SAFE_RPM = apiKeyCount * SAFE_RPM_PER_KEY;

const BATCH_LIMIT = 30;
const MAX_RETRY_ATTEMPTS = 3;

// ============================================================================
// QUEUE SETUP - Two-tier queue system
// ============================================================================

// Global AI call queue - Rate limits all AI calls across all repos
const aiQueue = new PQueue({
  concurrency: Math.max(2, Math.floor(apiKeyCount * 2)), // 2 concurrent calls per key
  interval: 60000, // 1 minute window
  intervalCap: TOTAL_SAFE_RPM, // Total calls per minute
});

// Repo processing queue - Allows multiple repos to process in parallel
// Each repo will queue its AI calls through aiQueue
const repoQueue = new PQueue({
  concurrency: Math.min(10, apiKeyCount * 2), // More repos can process in parallel
});

// ============================================================================
// AI CALL WRAPPER - Routes all AI calls through rate-limited queue
// ============================================================================

async function queuedAICall<T>(
  aiFunction: () => Promise<T>,
  callName: string,
  repoName: string
): Promise<T> {
  return aiQueue.add(async () => {
    const startTime = Date.now();
    try {
      const result = await aiFunction();
      const duration = Date.now() - startTime;
      console.log(`  ✓ ${callName} completed for ${repoName} (${duration}ms)`);
      return result;
    } catch (error: any) {
      console.error(`  ✗ ${callName} failed for ${repoName}:`, error.message);
      throw error;
    }
  }) as Promise<T>;
}

// ============================================================================
// REPO SUMMARIZATION - Main processing function
// ============================================================================

async function summarizeRepo(repo: any): Promise<void> {
  const repoName = repo.repo_name;

  try {
    // ========== VALIDATION ==========
    const [owner, name] = repo.repo_url
      .replace("https://github.com/", "")
      .split("/");

    if (!owner || !name) {
      console.error(`Invalid repo URL format: ${repo.repo_url}`);
      throw new Error("Invalid repo URL format");
    }

    const readme = (repo.readme_raw && String(repo.readme_raw).trim()) || null;
    const contributingMd =
      (repo.contributing_raw && String(repo.contributing_raw).trim()) || null;
    const issueSamples = repo.issue_samples || [];
    const fileTreeMetrics = repo.file_tree_metrics || null;

    if (!readme) {
      console.warn(`Skipping ${repoName}: no README`);
      throw new Error("No README available");
    }

    // ========== BUILD METADATA ==========
    const metadata = {
      stars: repo.stars || 0,
      forks: repo.forkCount || 0,
      contributors: repo.contributors || 0,
      topics: repo.topics || [],
      language: repo.language || null,
      issue_counts: repo.issue_data || {},
      activity: repo.activity || {},
      last_commit: repo.last_commit || null,
      last_updated: repo.last_updated || null,
    };

    console.log(`\n📦 Processing ${repoName}...`);
    console.log(
      `   Queue status: ${aiQueue.size} pending, ${aiQueue.pending} running`
    );

    // ========== PHASE 1: README SUMMARY ==========
    console.log(`   Phase 1/5: Generating summary...`);
    const phase1 = await queuedAICall(
      () => generateReadmeSummary(readme, metadata),
      "README Summary",
      repoName
    );

    // ========== PHASE 2: TECH STACK ==========
    console.log(`   Phase 2/5: Analyzing tech stack...`);
    const phase2 = await queuedAICall(
      () =>
        generateTechAndSkills({
          readme,
          languages: [metadata.language || "javascript"],
          topics: metadata.topics,
        }),
      "Tech Stack Analysis",
      repoName
    );

    // ========== PHASE 3: CONTRIBUTION AREAS ==========
    console.log(`   Phase 3/5: Identifying contribution areas...`);
    const phase3 = await queuedAICall(
      () =>
        generateContributionAreas({
          issue_counts: metadata.issue_counts,
          issue_samples: issueSamples,
          topics: metadata.topics,
          phase1,
          phase2,
          contributing_md: contributingMd,
        }),
      "Contribution Areas",
      repoName
    );

    // ========== VALIDATION ==========
    if (!validateAIResults({ phase1, phase2, phase3, phase4: {} })) {
      console.warn(`⚠️  Validation failed for ${repoName} (phases 1-3)`);
      throw new Error("AI validation failed");
    }

    // ========== PHASE 4: COMPLEXITY ANALYSIS & SCORING ==========
    console.log(`   Phase 4/5: Computing detailed scores...`);

    const enrichedRepo = {
      ...repo,
      readme_raw: readme,
      contributing_raw: contributingMd,
      tech_stack: phase2.tech_stack || [],
      required_skills: phase2.required_skills || [],
      categories: phase1.repo_categories || [],
      issue_samples: issueSamples,
      issue_data: repo.issue_data || {},
      activity: repo.activity || {},
      file_tree_metrics: fileTreeMetrics,
      community_health: repo.community_health || {},
    };

    // Run AI complexity analysis (queued)
    let aiAnalysis;
    if (_config.ENABLE_AI_ANALYSIS !== false) {
      try {
        aiAnalysis = await queuedAICall(
          () =>
            analyzeCodebaseComplexity(
              readme,
              fileTreeMetrics,
              metadata.language || "unknown",
              metadata.topics,
              contributingMd || undefined
            ),
          "Complexity Analysis",
          repoName
        );

        console.log(
          `   AI Analysis: arch=${aiAnalysis.architecture_score.toFixed(1)}, ` +
            `setup=${aiAnalysis.setup_complexity.toFixed(1)}, ` +
            `level=${aiAnalysis.recommended_experience}`
        );
      } catch (err) {
        console.warn(`   ⚠️  AI analysis failed, using fallback scores`);
        aiAnalysis = undefined;
      }
    }

    // Compute scores (this is NOT an AI call, just calculation)
    const scores = await computeDetailedScores(enrichedRepo as any, {
      aiAnalysis,
      includeAIAnalysis: false,
    });

    console.log(
      `   Scores: BF=${scores.beginner_friendliness}, ` +
        `TC=${scores.technical_complexity}, ` +
        `CR=${scores.contribution_readiness}, ` +
        `Overall=${scores.overall_score} (${scores.recommended_level})`
    );

    // ========== PHASE 5: TASK SUGGESTIONS ==========
    console.log(`   Phase 5/5: Generating task suggestions...`);
    const phase4 = await queuedAICall(
      () =>
        generateTaskSuggestions({
          phase1,
          phase2,
          phase3,
          issue_samples: issueSamples,
          scores: {
            beginner_friendliness: scores.beginner_friendliness,
            technical_complexity: scores.technical_complexity,
            contribution_readiness: scores.contribution_readiness,
          },
          metadata,
        }),
      "Task Suggestions",
      repoName
    );

    // ========== DATABASE UPDATE ==========
    await Project.updateOne(
      { _id: repo._id },
      {
        $set: {
          // AI Analysis
          summary: phase1.summary || "",
          categories: phase1.repo_categories || [],
          tech_stack: phase2.tech_stack || [],
          required_skills: phase2.required_skills || [],
          main_contrib_areas: phase3.main_contrib_areas || [],
          beginner_tasks: phase4.beginner_tasks || [],
          intermediate_tasks: phase4.intermediate_tasks || [],

          // Scoring (0-100)
          beginner_friendliness: scores.beginner_friendliness,
          technical_complexity: scores.technical_complexity,
          contribution_readiness: scores.contribution_readiness,
          overall_score: scores.overall_score,
          recommended_level: scores.recommended_level,
          scoring_confidence: scores.confidence,
          score_breakdown: scores.breakdown,

          // Reset retry counter on success
          summarization_attempts: 0,
          last_summarization_error: null,

          // Timestamp
          summarizedAt: new Date(),
        },
      }
    );

    console.log(`✅ Successfully summarized ${repoName}`);
  } catch (err: any) {
    console.error(`❌ Error summarizing ${repoName}:`, err.message);

    // Update retry counter
    await Project.updateOne(
      { _id: repo._id },
      {
        $inc: { summarization_attempts: 1 },
        $set: {
          last_summarization_error: err.message,
          last_summarization_attempt: new Date(),
        },
      }
    ).catch((updateErr) => {
      console.error(`Failed to update error state:`, updateErr);
    });

    throw err;
  }
}

// ============================================================================
// MAIN PROCESSING FUNCTION
// ============================================================================

export async function processSummaries(): Promise<void> {
  try {
    // ========== DATABASE CONNECTION ==========
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(_config.MONGODB_URI);
      console.log("✓ Connected to MongoDB");
    }

    // ========== SYSTEM INFO ==========
    console.log("\n" + "=".repeat(70));
    console.log("🚀 REPOSITORY SUMMARIZATION BATCH");
    console.log("=".repeat(70));
    console.log(`📊 Configuration:`);
    console.log(`   - API Keys: ${apiKeyCount}`);
    console.log(`   - Safe AI calls per minute: ${TOTAL_SAFE_RPM}`);
    console.log(`   - AI calls per repo: ${AI_CALLS_PER_REPO}`);
    console.log(`   - Max concurrent repos: ${repoQueue.concurrency}`);
    console.log(`   - Max concurrent AI calls: ${aiQueue.concurrency}`);
    console.log(`   - Batch limit: ${BATCH_LIMIT}`);
    console.log(`   - Max retry attempts: ${MAX_RETRY_ATTEMPTS}`);

    // Calculate estimated time
    const estimatedMinutes = Math.ceil(
      (BATCH_LIMIT * AI_CALLS_PER_REPO) / TOTAL_SAFE_RPM
    );
    console.log(
      `⏱️  Estimated time for ${BATCH_LIMIT} repos: ~${estimatedMinutes} minutes`
    );
    console.log("=".repeat(70) + "\n");

    // ========== FETCH REPOS NEEDING SUMMARIZATION ==========
    const repos = await Project.find({
      $or: [
        { summary: { $exists: false } },
        { summary: "" },
        { summary: null },
        { file_tree_metrics: { $exists: false } },
      ],
    })
      .select(
        "_id repo_url repo_name stars forkCount contributors topics language " +
          "issue_data activity last_commit last_updated beginner_friendliness " +
          "technical_complexity contribution_readiness readme_raw contributing_raw " +
          "issue_samples file_tree file_tree_metrics community_health " +
          "languages_breakdown summarization_attempts last_summarization_error"
      )
      .sort({ summarization_attempts: 1, stars: -1 }) // Prioritize: new repos, then popular
      .limit(BATCH_LIMIT)
      .lean();

    if (!repos.length) {
      console.log("✓ No repos pending summarization.");
      return;
    }

    console.log(`📦 Found ${repos.length} repos to process\n`);

    // Show retry info
    const retryCounts = repos.reduce((acc: any, repo: any) => {
      const attempts = repo.summarization_attempts || 0;
      acc[attempts] = (acc[attempts] || 0) + 1;
      return acc;
    }, {});

    console.log("📋 Retry distribution:");
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

    // ========== PROCESS REPOS ==========
    let completed = 0;
    let successful = 0;
    let failed = 0;
    const startTime = Date.now();

    for (const repo of repos) {
      repoQueue.add(async () => {
        try {
          await summarizeRepo(repo);
          successful++;
        } catch (err: any) {
          console.error(`❌ Failed: ${repo.repo_name}`);
          failed++;
        } finally {
          completed++;
          const progress = Math.round((completed / repos.length) * 100);
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          const rate = completed / (elapsed / 60); // repos per minute
          const remaining = Math.round((repos.length - completed) / rate);

          console.log(
            `\n📊 Progress: ${completed}/${repos.length} (${progress}%) | ` +
              `✅ ${successful} | ❌ ${failed} | ` +
              `⏱️  ${elapsed}s elapsed, ~${remaining}m remaining\n`
          );
        }
      });
    }

    // ========== WAIT FOR COMPLETION ==========
    await repoQueue.onIdle();
    await aiQueue.onIdle();

    const totalTime = Math.round((Date.now() - startTime) / 1000);

    // ========== SUMMARY ==========
    console.log("\n" + "=".repeat(70));
    console.log("✅ SUMMARIZATION COMPLETE");
    console.log("=".repeat(70));
    console.log(`📊 Results:`);
    console.log(`   - Total repos: ${repos.length}`);
    console.log(
      `   - Successful: ${successful} (${Math.round(
        (successful / repos.length) * 100
      )}%)`
    );
    console.log(
      `   - Failed: ${failed} (${Math.round((failed / repos.length) * 100)}%)`
    );
    console.log(
      `   - Total time: ${Math.floor(totalTime / 60)}m ${totalTime % 60}s`
    );
    console.log(
      `   - Average: ${(totalTime / completed).toFixed(1)}s per repo`
    );
    console.log(`\n📈 Queue Statistics:`);
    console.log(
      `   - AI Queue: ${aiQueue.size} pending, ${aiQueue.pending} running`
    );
    console.log(
      `   - Repo Queue: ${repoQueue.size} pending, ${repoQueue.pending} running`
    );
    console.log("=".repeat(70) + "\n");

    // ========== FAILED REPOS REPORT ==========
    if (failed > 0) {
      console.log("⚠️  Failed repositories:");
      const failedRepos = await Project.find({
        summarization_attempts: { $gte: 1 },
        summarizedAt: { $exists: false },
      })
        .select("repo_name summarization_attempts last_summarization_error")
        .limit(10)
        .lean();

      failedRepos.forEach((repo: any) => {
        console.log(
          `   - ${repo.repo_name}: ${repo.summarization_attempts} attempts, ` +
            `error: ${repo.last_summarization_error}`
        );
      });

      if (failedRepos.length >= 10) {
        console.log(`   ... and ${failed - 10} more`);
      }
      console.log("");
    }
  } catch (error) {
    console.error("\n❌ FATAL ERROR during summarization:", error);
    throw error;
  }
}
