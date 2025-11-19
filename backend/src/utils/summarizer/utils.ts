import {
  generateContributionAreas,
  generateReadmeSummary,
  generateTaskSuggestions,
  generateTechAndSkills,
} from "../../ai";
import { validateAIResults } from "../../ai/gemini.utils";
import { _config } from "../../config/config";
import { Project } from "../../models/project.model";
import { analyzeCodebaseComplexity } from "../../scoring";
import { fetchAllCommunityFiles } from "../../services/github.rest";
import { computeDetailedScores } from "../scoring";
import { analyzeFileTree } from "../fileTreeAnalyzer";
import { aiQueue } from "./queue";

export async function queuedAICall<T>(
  aiFunction: () => Promise<T>,
  callName: string,
  repoName: string
): Promise<T> {
  return aiQueue.add(async () => {
    try {
      const result = await aiFunction();
      console.log(`✓ ${callName} completed for ${repoName}`);
      return result;
    } catch (error: any) {
      console.error(`✗ ${callName} failed for ${repoName}:`, error.message);
      throw error;
    }
  }) as Promise<T>;
}

/**
 * Main function to summarize a repository
 * - Fetches community files (README, CONTRIBUTING, etc.)
 * - Analyzes file tree structure
 * - Runs AI analysis ONCE for all scoring and summaries
 * - Cleans up heavy raw data after processing
 * - Updates database with final results only
 */
export async function summarizeRepo(repo: any): Promise<void> {
  const repoName = repo.repo_name;

  try {
    // validation
    const [owner, name] = repo.repo_url
      .replace("https://github.com/", "")
      .split("/");

    if (!owner || !name) {
      console.error(`Invalid repo URL format: ${repo.repo_url}`);
      throw new Error("Invalid repo URL format");
    }

    // Fetch community files and file tree
    console.log(`Fetching community files for ${repoName}...`);
    const communityFiles = await fetchAllCommunityFiles(repo.repo_url);

    const {
      readme,
      contributing: contributingMd,
      codeOfConduct,
      fileTree,
      hasIssueTemplates,
    } = communityFiles;

    if (!readme) {
      console.warn(`Skipping ${repoName}: no README`);
      throw new Error("No README available");
    }

    // Analyze file tree to get metrics
    let fileTreeMetrics = null;
    if (fileTree) {
      console.log(`Analyzing file tree for ${repoName}...`);
      fileTreeMetrics = analyzeFileTree(fileTree);
      console.log(
        `   File Tree: ${fileTreeMetrics.totalFiles} files, ${fileTreeMetrics.totalDirectories} dirs, depth ${fileTreeMetrics.maxDepth}`
      );
    } else {
      console.warn(`No file tree data available for ${repoName}`);
    }

    // Build community health object
    const communityHealth = {
      has_code_of_conduct: !!codeOfConduct,
      has_contributing: !!contributingMd,
      has_issue_templates: hasIssueTemplates,
      has_readme: !!readme,
    };

    const issueSamples = repo.issue_samples || [];

    // build metadata:
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

    console.log(`Processing ${repoName}...`);
    console.log(
      `   Queue status: ${aiQueue.size} pending, ${aiQueue.pending} running`
    );

    // 1/5: Readme Summary Generation:
    console.log(`   Phase 1/5: Generating summary...`);
    const phase1 = await queuedAICall(
      () => generateReadmeSummary(readme, metadata),
      "README Summary",
      repoName
    );

    // 2/5: Generate tech stack:
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

    // 3/5: Contribution areas generation:
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

    // validation of results:
    if (!validateAIResults({ phase1, phase2, phase3, phase4: {} })) {
      console.warn(`Validation failed for ${repoName} (phases 1-3)`);
      throw new Error("AI validation failed");
    }

    // 4/5: AI Complexity Analysis (SINGLE RUN):
    console.log(`   Phase 4/5: Running AI complexity analysis...`);
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
            `abstraction=${aiAnalysis.abstraction_level.toFixed(1)}, ` +
            `domain=${aiAnalysis.domain_difficulty.toFixed(1)}, ` +
            `setup=${aiAnalysis.setup_complexity.toFixed(1)}, ` +
            `level=${aiAnalysis.recommended_experience}`
        );
      } catch (err) {
        console.warn(`AI analysis failed, using fallback scores`);
        aiAnalysis = undefined;
      }
    }

    // Build enriched repo with temporary data for scoring
    const enrichedRepo = {
      ...repo,
      tech_stack: phase2.tech_stack || [],
      required_skills: phase2.required_skills || [],
      categories: phase1.repo_categories || [],
      issue_samples: issueSamples,
      issue_data: repo.issue_data || {},
      activity: repo.activity || {},
      file_tree_metrics: fileTreeMetrics,
      community_health: communityHealth,
      // Temporarily add raw data for scoring
      readme_raw: readme,
      contributing_raw: contributingMd,
    };

    // Compute scores using AI analysis (no duplicate AI calls)
    console.log(`   Computing detailed scores...`);
    const scores = await computeDetailedScores(enrichedRepo as any, {
      aiAnalysis, // Pass the AI analysis we already ran
      includeAIAnalysis: false, // Don't run AI analysis again
    });

    console.log(
      `   Scores: BF=${scores.beginner_friendliness}, ` +
        `TC=${scores.technical_complexity}, ` +
        `CR=${scores.contribution_readiness}, ` +
        `Overall=${scores.overall_score} (${scores.recommended_level})`
    );

    // 5/5: TASK SUGGESTIONS
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
    // IMPORTANT: We do NOT store raw data (readme, contributing, etc.)
    // Only store processed metrics and results
    await Project.updateOne(
      { _id: repo._id },
      {
        $set: {
          // File tree metrics (lightweight)
          file_tree_metrics: fileTreeMetrics,
          community_health: communityHealth,

          // AI Analysis Results
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
        // IMPORTANT: Remove heavy raw data fields if they exist
        $unset: {
          readme_raw: "",
          contributing_raw: "",
          code_of_conduct_raw: "",
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
