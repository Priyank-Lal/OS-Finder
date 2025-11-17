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

interface ProcessStats {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
}

// Constants
const QUEUE_CONCURRENCY = 5;
const QUEUE_INTERVAL = 2500;
const BATCH_LIMIT = 30;

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

    // Phase 1: summary + level + categories (use readme + metadata)
    console.log(`Phase 1: Generating summary for ${repoName}...`);
    const phase1 = await generateReadmeSummary(readme, metadata);

    if (!phase1.summary) {
      console.warn(`Phase 1 failed for ${repoName}: no summary generated`);
    }

    // Phase 2: tech stack + required skills (readme + topics)
    console.log(`Phase 2: Analyzing tech stack for ${repoName}...`);
    const phase2 = await generateTechAndSkills({
      readme,
      languages: [metadata.language || "javascript"],
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

    // ===== NEW: PHASE 5 - COMPUTE DETAILED SCORES =====
    console.log(`Phase 5: Computing detailed scores for ${repoName}...`);

    // Build complete repo object with all analysis data
    const enrichedRepo = {
      ...repo,
      readme_raw: readme,
      contributing_raw: contributingMd,
      has_contributing: !!contributingMd,
      tech_stack: phase2.tech_stack || [],
      required_skills: phase2.required_skills || [],
      ai_categories: phase1.repo_categories || [],
      summary_level: phase1.level || "intermediate",
      issue_samples: issueSamplesFromDb,
      // Ensure all required fields are present
      issue_data: repo.issue_data || {},
      activity: repo.activity || {},
      stars: metadata.stars,
      contributors: metadata.contributors,
      topics: metadata.topics,
      language: metadata.language,
      file_tree: phase2.tech_stack || [], // Use tech_stack as proxy if file_tree not available
    };

    // Optional: Run AI complexity analysis for more accurate scoring
    let aiAnalysis;
    if (_config.ENABLE_AI_ANALYSIS !== false) {
      try {
        console.log(`  Running AI complexity analysis for ${repoName}...`);
        aiAnalysis = await analyzeCodebaseComplexity(
          readme,
          enrichedRepo.file_tree,
          metadata.language || "unknown",
          metadata.topics,
          contributingMd
        );
        console.log(`  AI analysis complete for ${repoName}`);
      } catch (err) {
        console.warn(
          `  AI complexity analysis failed for ${repoName}, continuing without it:`,
          err
        );
      }
    }

    // Compute detailed scores
    const scores = await computeDetailedScores(enrichedRepo as any, {
      aiAnalysis,
      includeAIAnalysis: false, // We already ran it above if enabled
    });

    console.log(`  Scores for ${repoName}:`, {
      beginner_friendliness: scores.beginner_friendliness,
      technical_complexity: scores.technical_complexity,
      contribution_readiness: scores.contribution_readiness,
      overall_score: scores.overall_score,
      recommended_level: scores.recommended_level,
      confidence: scores.confidence,
    });

    // Update legacy 0-1 scores for backward compatibility
    const legacyScores = {
      friendliness: scores.beginner_friendliness / 100,
      complexity: scores.technical_complexity / 100,
      accessibility: scores.contribution_readiness / 100,
      maintenance: scores.contribution_readiness / 100,
      score: scores.overall_score / 100,
      final_score: scores.overall_score,
    };

    // ===== END PHASE 5 =====

    // Persist all new fields to DB (do a safe $set)
    await Project.updateOne(
      { _id: repo._id },
      {
        $set: {
          // AI Analysis results
          summary: phase1.summary || "",
          summary_level: phase1.level || "intermediate",
          ai_categories: phase1.repo_categories || [],
          tech_stack: phase2.tech_stack || [],
          required_skills: phase2.required_skills || [],
          main_contrib_areas: phase3.main_contrib_areas || [],
          beginner_tasks: phase4.beginner_tasks || [],
          intermediate_tasks: phase4.intermediate_tasks || [],

          // New 0-100 scoring system
          beginner_friendliness: scores.beginner_friendliness,
          technical_complexity: scores.technical_complexity,
          contribution_readiness: scores.contribution_readiness,
          overall_score: scores.overall_score,
          recommended_level: scores.recommended_level,
          scoring_confidence: scores.confidence,
          score_breakdown: scores.breakdown,

          // Legacy 0-1 scores for backward compatibility
          friendliness: legacyScores.friendliness,
          complexity: legacyScores.complexity,
          accessibility: legacyScores.accessibility,
          maintenance: legacyScores.maintenance,
          score: legacyScores.score,
          final_score: legacyScores.final_score,

          // Status
          needs_review: false,
          summarizedAt: new Date(),
        },
      }
    );

    console.log(`✓ Successfully summarized and scored ${repoName}`);
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
        "_id repo_url repo_name summary stars forkCount contributors topics language issue_data activity last_commit last_updated friendliness complexity maintenance readme_raw contributing_raw issue_samples file_tree"
      )
      .limit(BATCH_LIMIT)
      .lean(); // Use lean for better performance

    if (!repos.length) {
      console.log("No repos pending summarization.");
      return;
    }

    stats.total = repos.length;
    console.log(`Starting summarization of ${repos.length} repos...\n`);

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
            )}%)\n`
          );
        }
      });
    }

    await queue.onIdle();

    // Print final statistics
    console.log("\n=== Summarization Complete ===");
    console.log(`Total repos processed: ${stats.total}`);
    console.log(`Successful: ${stats.successful}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Skipped: ${stats.skipped}`);
  } catch (error) {
    console.error("Fatal error during summarization:", error);
    throw error;
  }
}
