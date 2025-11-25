// backend/src/utils/summarizer/updated-utils.ts
// Simplified summarizer that uses unified scoring

import {
  generateContributionAreas,
  generateReadmeSummary,
  generateSuitabilityEvaluation,
  generateTaskSuggestions,
  generateTechAndSkills,
} from "../../ai/index.js";
import { validateAIResults } from "../../ai/gemini.utils.js";
import { Project } from "../../models/project.model.js";
import { fetchAllCommunityFiles } from "../../services/github.rest.js";
import { analyzeFileTree } from "../fileTreeAnalyzer.js";
import { aiQueue } from "./queue.js";
import { computeUnifiedScore } from "../../scoring/unified-scoring.js";

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
    } = await fetchAllCommunityFiles(repo.repo_url);

    if (!readme) {
      throw new Error("No README available");
    }

    // ========== STEP 1.5: FETCH PR METRICS & ISSUES (REST API) ==========
    console.log(`Fetching PR metrics & issues for ${repoName}...`);
    const { fetchPRMetrics, fetchIssueSamples } = await import("../../services/github.rest.js");
    
    // Run in parallel
    const [prMetrics, issueSamples] = await Promise.all([
      fetchPRMetrics(owner, name),
      fetchIssueSamples(owner, name)
    ]);

    console.log(`   - PR Metrics: ${prMetrics.total_prs_checked > 0 ? "✓" : "⚠"}`);
    console.log(`   - Issue Samples: ${issueSamples.length} fetched`);

    // ========== STEP 2: ANALYZE FILE TREE ==========
    let fileTreeMetrics = null;
    if (fileTree) {
      console.log(`Analyzing structure for ${repoName}...`);
      fileTreeMetrics = analyzeFileTree(fileTree);
    }

    const communityHealth = {
      has_code_of_conduct: !!codeOfConduct,
      has_contributing: !!contributingMd,
      has_readme: !!readme,
    };

    // ========== STEP 2.5: AI SUITABILITY CHECK ==========
    console.log(`Evaluating suitability for ${repoName}...`);
    

    // Log the data being passed to suitability check
    const suitabilityData = {
      readme,
      description: repo.description || "",
      topics: repo.topics || [],
      fileTreeSummary: fileTreeMetrics
        ? `Files: ${fileTreeMetrics.totalFiles}, Depth: ${fileTreeMetrics.maxDepth}, Configs: ${fileTreeMetrics.configFiles.join(", ")}`
        : undefined,
    };


    // Call directly without queue to ensure it's not being skipped
    const suitability = await generateSuitabilityEvaluation(suitabilityData);
    
    console.log(`Suitability result for ${repoName}:`, {
      isSuitable: suitability.isSuitable,
      reason: suitability.reason,
      confidence: suitability.confidence,
    });

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

            readme_raw: "",
            contributing_raw: "",
            code_of_conduct_raw: "",
            open_prs: "",
            licenseInfo: "",
          },
        }
      );
      return; 
    }

    // ========== STEP 2.7: LABEL ANALYSIS ==========
    console.log(`Analyzing labels for ${repoName}...`);
    const { fetchRepoLabels } = await import("../../services/github.labels.js");
    const { generateLabelAnalysis } = await import("../../ai/index.js");

    const allLabels = await fetchRepoLabels(repo.repo_url);
    const labelMapping = await generateLabelAnalysis(allLabels, []);

    // Populate counts in labelMapping using allLabels data
    const labelCounts = new Map(allLabels.map((l) => [l.name, l.count || 0]));

    for (const category of Object.keys(labelMapping)) {
      const catKey = category as keyof typeof labelMapping;
      let totalCount = 0;
      
      // Sum counts for all labels in this category
      for (const labelName of labelMapping[catKey].labels) {
        totalCount += labelCounts.get(labelName) || 0;
      }
      
      labelMapping[catKey].count = totalCount;
    }

    console.log(`Mapped labels for ${repoName}:`, labelMapping);

    // ========== STEP 3: AI METADATA GENERATION ==========
    console.log(`Generating metadata for ${repoName}...`);

    // Merge AI-detected counts into issue_data for better accuracy
    // This solves the redundancy by making issue_data the aggregated summary
    const mergedIssueData = { ...repo.issue_data };
    
    if (labelMapping.beginner.count > 0) mergedIssueData.beginner = labelMapping.beginner.count;
    if (labelMapping.help_wanted.count > 0) mergedIssueData.help_wanted = labelMapping.help_wanted.count;
    if (labelMapping.bug.count > 0) mergedIssueData.bug = labelMapping.bug.count;
    if (labelMapping.enhancement.count > 0) mergedIssueData.enhancement = labelMapping.enhancement.count;
    if (labelMapping.documentation.count > 0) mergedIssueData.documentation = labelMapping.documentation.count;

    const metadata = {
      stars: repo.stars || 0,
      forks: repo.forkCount || 0,
      contributors: repo.contributors || 0,
      topics: repo.topics || [],
      language: repo.language || null,
      issue_counts: mergedIssueData,
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
          issue_samples: [],
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
      all_labels: allLabels,
      label_mapping: labelMapping,
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
          issue_samples: [],
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
          label_mapping: labelMapping,
          top_labels: allLabels
            .sort((a, b) => (b.count || 0) - (a.count || 0))
            .slice(0, 10), // Top 10 labels by count

          // AI-generated content
          summary: phase1.summary || "",
          categories: phase1.repo_categories || [],
          tech_stack: phase2.tech_stack || [],
          required_skills: phase2.required_skills || [],
          main_contrib_areas: phase3.main_contrib_areas || [],
          beginner_tasks: phase4.beginner_tasks || [],
          intermediate_tasks: phase4.intermediate_tasks || [],

          // Activity metrics (PR timing from REST API)
          activity: {
            avg_pr_merge_hours: prMetrics.avg_pr_merge_hours,
            pr_merge_ratio: prMetrics.pr_merge_ratio,
          },
          
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
    );

    throw err;
  }
}
