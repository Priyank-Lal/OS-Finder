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

const QUEUE_CONCURRENCY = 5;
const QUEUE_INTERVAL = 2500;
const BATCH_LIMIT = 30;

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

    const readme = (repo.readme_raw && String(repo.readme_raw).trim()) || null;
    const contributingMd =
      (repo.contributing_raw && String(repo.contributing_raw).trim()) || null;
    const issueSamples = repo.issue_samples || [];

    if (!readme) {
      console.warn(`Skipping ${repoName}: no README`);
      return;
    }

    // Build clean metadata
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

    // Phase 1: Summary and categories
    console.log(`Phase 1: Generating summary for ${repoName}...`);
    const phase1 = await generateReadmeSummary(readme, metadata);

    // Phase 2: Tech stack and skills
    console.log(`Phase 2: Analyzing tech stack for ${repoName}...`);
    const phase2 = await generateTechAndSkills({
      readme,
      languages: [metadata.language || "javascript"],
      topics: metadata.topics,
    });

    // Phase 3: Contribution areas
    console.log(`Phase 3: Identifying contribution areas for ${repoName}...`);
    const phase3 = await generateContributionAreas({
      issue_counts: metadata.issue_counts,
      issue_samples: issueSamples,
      topics: metadata.topics,
      phase1,
      phase2,
      contributing_md: contributingMd,
    });

    // Phase 4: Task suggestions
    console.log(`Phase 4: Generating task suggestions for ${repoName}...`);
    const phase4 = await generateTaskSuggestions({
      phase1,
      phase2,
      phase3,
      issue_samples: issueSamples,
      scores: {
        beginner_friendliness: repo.beginner_friendliness || 0,
        technical_complexity: repo.technical_complexity || 0,
        contribution_readiness: repo.contribution_readiness || 0,
      },
      metadata,
    });

    // Validate results
    if (!validateAIResults({ phase1, phase2, phase3, phase4 })) {
      console.warn(`Validation failed for ${repoName}`);
      return;
    }

    // Phase 5: Compute detailed scores
    console.log(`Phase 5: Computing detailed scores for ${repoName}...`);

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
    };

    // Optional AI complexity analysis
    let aiAnalysis;
    if (_config.ENABLE_AI_ANALYSIS !== false) {
      try {
        console.log(`  Running AI complexity analysis for ${repoName}...`);
        aiAnalysis = await analyzeCodebaseComplexity(
          readme,
          enrichedRepo.tech_stack,
          metadata.language || "unknown",
          metadata.topics,
          contributingMd
        );
      } catch (err) {
        console.warn(`  AI analysis failed for ${repoName}, continuing...`);
      }
    }

    const scores = await computeDetailedScores(enrichedRepo as any, {
      aiAnalysis,
      includeAIAnalysis: false,
    });

    console.log(`  Scores for ${repoName}:`, {
      overall: scores.overall_score,
      level: scores.recommended_level,
      confidence: scores.confidence,
    });

    // Update database with clean fields
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

          // Timestamp
          summarizedAt: new Date(),
        },
      }
    );

    console.log(`✓ Successfully summarized ${repoName}`);
  } catch (err: any) {
    console.error(`Error summarizing ${repoName}:`, err.message);
    throw err;
  }
}

export async function processSummaries() {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(_config.MONGODB_URI);
      console.log("Connected to MongoDB");
    }

    const queue = new PQueue({
      concurrency: QUEUE_CONCURRENCY,
      interval: QUEUE_INTERVAL,
      intervalCap: QUEUE_CONCURRENCY,
    });

    // Find repos needing summarization
    const repos = await Project.find({
      $or: [
        { summary: { $exists: false } },
        { summary: "" },
        { summary: null },
      ],
    })
      .select(
        "_id repo_url repo_name stars forkCount contributors topics language issue_data activity last_commit last_updated beginner_friendliness technical_complexity contribution_readiness readme_raw contributing_raw issue_samples"
      )
      .limit(BATCH_LIMIT)
      .lean();

    if (!repos.length) {
      console.log("No repos pending summarization.");
      return;
    }

    console.log(`Starting summarization of ${repos.length} repos...\n`);

    let completed = 0;
    let successful = 0;
    let failed = 0;

    for (const repo of repos) {
      queue.add(async () => {
        try {
          await summarizeRepo(repo);
          successful++;
        } catch (err: any) {
          console.error(`Error processing ${repo.repo_name}:`, err.message);
          failed++;
        } finally {
          completed++;
          console.log(
            `Progress: ${completed}/${repos.length} (${Math.round(
              (completed / repos.length) * 100
            )}%)\n`
          );
        }
      });
    }

    await queue.onIdle();

    console.log("\n=== Summarization Complete ===");
    console.log(`Total: ${repos.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
  } catch (error) {
    console.error("Fatal error during summarization:", error);
    throw error;
  }
}
