// backend/src/utils/summarizer/updated-utils.ts
// Simplified summarizer that uses unified scoring

import {
  generateContributionAreas,
  generateReadmeSummary,
  generateSuitabilityEvaluation,
  generateTaskSuggestions,
  generateTechAndSkills,
} from "../../ai";
import { validateAIResults } from "../../ai/gemini.utils";
import { Project } from "../../models/project.model";
import { fetchAllCommunityFiles } from "../../services/github.rest";
import { analyzeFileTree } from "../fileTreeAnalyzer";
import { aiQueue } from "./queue";
import { computeUnifiedScore } from "../../scoring/unified-scoring";

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

export async function summarizeRepo(repo: any): Promise<void> {
  const repoName = repo.repo_name;

  try {
    // Validate repo URL
    const [owner, name] = repo.repo_url
      .replace("https://github.com/", "")
      .split("/");

    if (!owner || !name) {
      throw new Error("Invalid repo URL format");
    }

    // ========== STEP 1: FETCH COMMUNITY FILES ==========
    console.log(`Fetching files for ${repoName}...`);
    const {
      readme,
      contributing: contributingMd,
      codeOfConduct,
      fileTree,
      hasIssueTemplates,
    } = await fetchAllCommunityFiles(repo.repo_url);

    if (!readme) {
      throw new Error("No README available");
    }

    // ========== STEP 2: ANALYZE FILE TREE ==========
    let fileTreeMetrics = null;
    if (fileTree) {
      console.log(`Analyzing structure for ${repoName}...`);
      fileTreeMetrics = analyzeFileTree(fileTree);
    }

    const communityHealth = {
      has_code_of_conduct: !!codeOfConduct,
      has_contributing: !!contributingMd,
      has_issue_templates: hasIssueTemplates,
      has_readme: !!readme,
    };

    // ========== STEP 2.5: AI SUITABILITY CHECK ==========
    console.log(`Evaluating suitability for ${repoName}...`);
    const suitability = await queuedAICall(
      () =>
        generateSuitabilityEvaluation({
          readme,
          description: repo.description || "",
          topics: repo.topics || [],
          fileTreeSummary: fileTreeMetrics
            ? `Files: ${fileTreeMetrics.totalFiles}, Depth: ${fileTreeMetrics.maxDepth}, Configs: ${fileTreeMetrics.configFiles.join(", ")}`
            : undefined,
        }),
      "Suitability Check",
      repoName
    );

    if (!suitability.isSuitable) {
      console.log(`🚫 Rejected ${repoName}: ${suitability.reason}`);
      await Project.updateOne(
        { _id: repo._id },
        {
          $set: {
            status: "rejected",
            rejection_reason: suitability.reason,
            summarizedAt: new Date(), // Mark as processed so we don't retry
            summarization_attempts: 0,
          },
          $unset: {
            // Remove heavy fields to save space
            stars: "",
            forkCount: "",
            contributors: "",
            topics: "",
            description: "",
            issue_data: "",
            activity: "",
            last_commit: "",
            file_tree_metrics: "",
            community_health: "",
            languages_breakdown: "",
            issue_samples: "",
            readme_raw: "",
            contributing_raw: "",
            code_of_conduct_raw: "",
            open_prs: "",
            licenseInfo: "",
          },
        }
      );
      return; // Stop processing
    }

    // ========== STEP 3: AI METADATA GENERATION ==========
    console.log(`Generating metadata for ${repoName}...`);

    const metadata = {
      stars: repo.stars || 0,
      forks: repo.forkCount || 0,
      contributors: repo.contributors || 0,
      topics: repo.topics || [],
      language: repo.language || null,
      issue_counts: repo.issue_data || {},
      activity: repo.activity || {},
    };

    // Phase 1: README Summary
    const phase1 = await queuedAICall(
      () => generateReadmeSummary(readme, metadata),
      "Summary Generation",
      repoName
    );

    await new Promise(r => setTimeout(r, 1000)); // Delay between phases

    // Phase 2: Tech Stack
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

    await new Promise(r => setTimeout(r, 1000)); // Delay between phases

    // Phase 3: Contribution Areas
    const phase3 = await queuedAICall(
      () =>
        generateContributionAreas({
          issue_counts: metadata.issue_counts,
          issue_samples: repo.issue_samples || [],
          topics: metadata.topics,
          phase1,
          phase2,
          contributing_md: contributingMd,
        }),
      "Contribution Areas",
      repoName
    );

    // Validate AI results
    if (!validateAIResults({ phase1, phase2, phase3, phase4: {} })) {
      throw new Error("AI validation failed");
    }

    // Score calculations
    console.log(`Computing scores for ${repoName}...`);

    // Build enriched repo object for scoring
    const enrichedRepo = {
      ...repo,
      tech_stack: phase2.tech_stack || [],
      required_skills: phase2.required_skills || [],
      categories: phase1.repo_categories || [],
      file_tree_metrics: fileTreeMetrics,
      community_health: communityHealth,
    };
    

    // Use unified scoring (AI-first with fallback)
    const scores = await computeUnifiedScore(enrichedRepo as any, {
      readme,
      contributingMd: contributingMd ?? undefined,
      fileTreeMetrics: fileTreeMetrics ?? undefined,
    });

    console.log(
      `   Scores (${scores.scoring_method}): BF=${scores.beginner_friendliness}, ` +
        `TC=${scores.technical_complexity}, ` +
        `CR=${scores.contribution_readiness}, ` +
        `Overall=${scores.overall_score} (${scores.recommended_level})`
    );

    await new Promise(r => setTimeout(r, 1000)); // Delay between phases

    // ========== STEP 5: TASK SUGGESTIONS ==========
    const phase4 = await queuedAICall(
      () =>
        generateTaskSuggestions({
          phase1,
          phase2,
          phase3,
          issue_samples: repo.issue_samples || [],
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

    // ========== STEP 6: SAVE TO DATABASE ==========
    // IMPORTANT: Only store processed results, no raw data
    await Project.updateOne(
      { _id: repo._id },
      {
        $set: {
          // Structure metrics
          status: "active",
          file_tree_metrics: fileTreeMetrics,
          community_health: communityHealth,

          // AI-generated content
          summary: phase1.summary || "",
          categories: phase1.repo_categories || [],
          tech_stack: phase2.tech_stack || [],
          required_skills: phase2.required_skills || [],
          main_contrib_areas: phase3.main_contrib_areas || [],
          beginner_tasks: phase4.beginner_tasks || [],
          intermediate_tasks: phase4.intermediate_tasks || [],

          // Unified scores (from single scoring method)
          beginner_friendliness: scores.beginner_friendliness,
          technical_complexity: scores.technical_complexity,
          contribution_readiness: scores.contribution_readiness,
          overall_score: scores.overall_score,
          recommended_level: scores.recommended_level,
          scoring_confidence: scores.confidence,
          score_breakdown: scores.score_breakdown,
          scoring_method: scores.scoring_method, // Track which method was used

          // Reset error tracking
          summarization_attempts: 0,
          last_summarization_error: null,
          summarizedAt: new Date(),
        },
        // Remove any raw data fields
        $unset: {
          readme_raw: "",
          contributing_raw: "",
          code_of_conduct_raw: "",
          file_tree: "", // Old field
        },
      }
    );

    console.log(`✅ Successfully summarized ${repoName}`);
  } catch (err: any) {
    console.error(`❌ Error summarizing ${repoName}:`, err.message);

    // Track retry attempts
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
