import mongoose, { Schema } from "mongoose";
import { IProject } from "./project.interface";

const projectSchema = new Schema(
  {
    // ========== CORE INFO ==========
    repoId: { type: String, required: true, unique: true },
    repo_name: { type: String, required: true, trim: true },
    repo_url: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^https?:\/\/.+/.test(v),
        message: "Invalid repository URL",
      },
    },
    owner: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    language: { type: String, required: true },

    // ========== LANGUAGE BREAKDOWN ==========
    languages_breakdown: {
      type: [{ name: String, size: Number }],
      default: [],
    },

    // ========== FILE TREE METRICS ==========
    file_tree_metrics: {
      totalFiles: { type: Number, default: 0 },
      totalDirectories: { type: Number, default: 0 },
      maxDepth: { type: Number, default: 0 },
      avgDepth: { type: Number, default: 0 },
      hasTests: { type: Boolean, default: false },
      hasDocs: { type: Boolean, default: false },
      hasCI: { type: Boolean, default: false },
      hasMonorepo: { type: Boolean, default: false },
      configFiles: [String],
      lockFiles: [String],
      buildComplexity: { type: Number, default: 0 },
      testToCodeRatio: { type: Number, default: 0 },
    },

    // ========== COMMUNITY HEALTH ==========
    community_health: {
      has_code_of_conduct: Boolean,
      has_contributing: Boolean,
      has_issue_templates: Boolean,
      has_readme: Boolean,
    },

    // ========== RAW DATA (for reprocessing) ==========
    readme_raw: { type: String, default: "" },
    contributing_raw: { type: String, default: "" },
    code_of_conduct_raw: { type: String, default: "" },

    // ========== METADATA ==========
    stars: { type: Number, default: 0, min: 0 },
    forkCount: { type: Number, default: 0, min: 0 },
    contributors: { type: Number, default: 0, min: 0 },
    isArchived: { type: Boolean, default: false },
    licenseInfo: {
      name: String,
      key: String,
    },
    topics: { type: [String], default: [] },

    // ========== ACTIVITY & ISSUES ==========
    open_prs: { type: Number, default: 0, min: 0 },

    issue_data: {
      total_open: { type: Number, default: 0 },
      good_first_issue: { type: Number, default: 0 },
      help_wanted: { type: Number, default: 0 },
      beginner: { type: Number, default: 0 },
      bug: { type: Number, default: 0 },
      enhancement: { type: Number, default: 0 },
      documentation: { type: Number, default: 0 },
    },

    activity: {
      avg_pr_merge_hours: { type: Number, default: null },
      pr_merge_ratio: { type: Number, default: 0 },
      avg_issue_response_hours: { type: Number, default: null },
      issue_response_rate: { type: Number, default: 0 },
      maintainer_activity_score: { type: Number, default: 0 },
      total_commits: { type: Number, default: 0 },
    },

    last_commit: { type: Date, default: null },
    last_updated: { type: Date, required: true },

    // ========== AI ANALYSIS ==========
    summary: { type: String, default: "" },
    tech_stack: { type: [String], default: [] },
    required_skills: { type: [String], default: [] },
    categories: { type: [String], default: [] },

    main_contrib_areas: {
      type: [
        {
          area: String,
          confidence: Number,
          reasons: [String],
        },
      ],
      default: [],
    },

    // ========== SCORING ==========
    beginner_friendliness: { type: Number, min: 0, max: 100, default: 0 },
    technical_complexity: { type: Number, min: 0, max: 100, default: 0 },
    contribution_readiness: { type: Number, min: 0, max: 100, default: 0 },
    overall_score: { type: Number, min: 0, max: 100, default: 0 },

    recommended_level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "intermediate",
    },

    scoring_confidence: { type: Number, min: 0, max: 1, default: 0 },
    score_breakdown: { type: Object, default: {} },

    // ========== TASKS ==========
    beginner_tasks: {
      type: [
        {
          title: String,
          why: String,
          approx_effort: { type: String, enum: ["low", "medium", "high"] },
          example_issue_title: String,
        },
      ],
      default: [],
    },
    intermediate_tasks: {
      type: [
        {
          title: String,
          why: String,
          approx_effort: { type: String, enum: ["low", "medium", "high"] },
          example_issue_title: String,
        },
      ],
      default: [],
    },

    // ========== RAW DATA STORED FOR REPROCESSING ==========
    issue_samples: {
      type: [
        {
          title: String,
          labels: [String],
          created_at: String,
          has_response: Boolean,
        },
      ],
      default: [],
    },

    // ========== SUMMARIZATION TRACKING ==========
    summarizedAt: Date,
    summarization_attempts: { type: Number, default: 0 },
    last_summarization_error: String,
    last_summarization_attempt: Date,
  },
  {
    timestamps: true,
    collection: "projects",
  }
);

// Indexes for efficient querying
projectSchema.index({ language: 1 });
projectSchema.index({ categories: 1 });
projectSchema.index({ recommended_level: 1 });
projectSchema.index({ overall_score: -1 });

export const Project = mongoose.model<IProject>("projects", projectSchema);