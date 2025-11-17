// backend/src/models/project.model.ts
// IMPROVED: Better indexes, validation, defaults

import mongoose, { Schema } from "mongoose";
import { IProject } from "./project.interface";

const projectSchema: Schema = new Schema(
  {
    // Core repository info
    repoId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    repo_name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    repo_url: {
      type: String,
      required: true,
      validate: {
        validator: function (v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: "Invalid repository URL format",
      },
    },
    owner: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Repository metadata
    language: {
      type: String,
      required: true,
      index: true,
    },
    licenseInfo: {
      name: { type: String },
      key: { type: String },
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    forkCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    topics: {
      type: [String],
      default: [],
      index: true,
    },
    description: String,

    // Activity metrics
    open_prs: {
      type: Number,
      default: 0,
      min: 0,
    },
    stars: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    contributors: {
      type: Number,
      default: 0,
      min: 0,
    },
    has_contributing: {
      type: Boolean,
      default: false,
    },

    // NEW 0-100 Scoring System (Primary)
    beginner_friendliness: { type: Number, min: 0, max: 100, default: 0 },
    technical_complexity: { type: Number, min: 0, max: 100, default: 0 },
    contribution_readiness: { type: Number, min: 0, max: 100, default: 0 },
    overall_score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      index: true, // Important for sorting
    },
    recommended_level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "intermediate",
      index: true,
    },
    scoring_confidence: { type: Number, min: 0, max: 1, default: 0 },
    score_breakdown: { type: Object, default: {} },

    // Legacy 0-1 scores (for backward compatibility)
    friendliness: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    maintenance: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    accessibility: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    complexity: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
    },
    final_score: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Issue tracking
    issue_data: {
      total_open_issues: { type: Number, default: 0, min: 0 },
      good_first_issue_count: { type: Number, default: 0, min: 0 },
      help_wanted_count: { type: Number, default: 0, min: 0 },
      first_timers_count: { type: Number, default: 0, min: 0 },
      beginner_count: { type: Number, default: 0, min: 0 },
      bug_count: { type: Number, default: 0, min: 0 },
      enhancement_count: { type: Number, default: 0, min: 0 },
      documentation_count: { type: Number, default: 0, min: 0 },
      refactor_count: { type: Number, default: 0, min: 0 },
      high_priority_count: { type: Number, default: 0, min: 0 },
    },
    beginner_issue_total: {
      type: Number,
      default: 0,
      min: 0,
    },
    beginner_issue_score: {
      type: Number,
      default: 0,
      min: 0,
    },
    accessibility_score_base: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Activity tracking
    activity: {
      avg_pr_merge_hours: {
        type: Number,
        default: null,
      },
      pr_merge_ratio: {
        type: Number,
        min: 0,
        max: 1,
        default: 0,
      },
    },

    // AI-generated content
    summary: {
      type: String,
      default: "",
      index: "text", // Text index for search
    },
    summary_level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "intermediate",
    },
    readme_raw: {
      type: String,
      default: "",
    },
    contributing_raw: {
      type: String,
      default: "",
    },

    // Analysis data
    ai_categories: {
      type: [String],
      default: [],
      index: true,
    },
    issue_samples: {
      type: [
        {
          title: String,
          labels: [String],
        },
      ],
      default: [],
    },
    tech_stack: {
      type: [String],
      default: [],
    },
    required_skills: {
      type: [String],
      default: [],
    },
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
    beginner_tasks: {
      type: [
        {
          title: String,
          why: String,
          approx_effort: String,
          example_issue_title: { type: String, default: "" },
        },
      ],
      default: [],
    },
    intermediate_tasks: {
      type: [
        {
          title: String,
          why: String,
          approx_effort: String,
          example_issue_title: { type: String, default: "" },
        },
      ],
      default: [],
    },

    // Status
    needs_review: {
      type: Boolean,
      default: false,
      index: true,
    },
    file_tree: {
      type: [String],
      default: [],
    },
    summarizedAt: {
      type: Date,
      index: true,
    },

    // Timestamps
    last_updated: {
      type: Date,
      required: true,
      index: true,
    },
    last_commit: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "projects",
  }
);

// Compound indexes for common queries
projectSchema.index({ language: 1, overall_score: -1 });
projectSchema.index({ topics: 1, overall_score: -1 });
projectSchema.index({ ai_categories: 1, overall_score: -1 });
projectSchema.index({ recommended_level: 1, overall_score: -1 });
projectSchema.index({ last_updated: -1, needs_review: 1 });
projectSchema.index({ summarizedAt: 1 }, { sparse: true });

// Text index for search
projectSchema.index({
  summary: "text",
  repo_name: "text",
  description: "text",
});

export const Project = mongoose.model<IProject>("projects", projectSchema);
