import mongoose, { Schema } from "mongoose";
import { IProject } from "./project.interface";

const projectSchema: Schema = new Schema(
  {
    // ========== CORE INFO ==========
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
        validator: (v: string) => /^https?:\/\/.+/.test(v),
        message: "Invalid repository URL format",
      },
    },
    owner: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
    language: {
      type: String,
      required: true,
      index: true,
    },

    // ========== METADATA ==========
    stars: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    forkCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    contributors: {
      type: Number,
      default: 0,
      min: 0,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    licenseInfo: {
      name: String,
      key: String,
    },
    topics: {
      type: [String],
      default: [],
      index: true,
    },
    has_contributing: {
      type: Boolean,
    },

    // ========== ACTIVITY ==========
    open_prs: {
      type: Number,
      default: 0,
      min: 0,
    },
    issue_data: {
      total_open: { type: Number, default: 0, min: 0 },
      good_first_issue: { type: Number, default: 0, min: 0 },
      help_wanted: { type: Number, default: 0, min: 0 },
      beginner: { type: Number, default: 0, min: 0 },
      bug: { type: Number, default: 0, min: 0 },
      enhancement: { type: Number, default: 0, min: 0 },
      documentation: { type: Number, default: 0, min: 0 },
    },
    activity: {
      avg_pr_merge_hours: { type: Number, default: null },
      pr_merge_ratio: { type: Number, min: 0, max: 1, default: 0 },
    },
    last_commit: {
      type: Date,
      default: null,
      index: true,
    },
    last_updated: {
      type: Date,
      required: true,
      index: true,
    },

    // ========== AI ANALYSIS ==========
    summary: {
      type: String,
      default: "",
      index: "text",
    },
    tech_stack: {
      type: [String],
      default: [],
    },
    required_skills: {
      type: [String],
      default: [],
    },
    categories: {
      type: [String],
      default: [],
      index: true,
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

    // ========== SCORING (0-100) ==========
    beginner_friendliness: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    technical_complexity: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    contribution_readiness: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    overall_score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      index: true,
    },
    recommended_level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "intermediate",
      index: true,
    },
    scoring_confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    score_breakdown: {
      type: Object,
      default: {},
    },

    // ========== TASKS ==========
    beginner_tasks: {
      type: [
        {
          title: String,
          why: String,
          approx_effort: {
            type: String,
            enum: ["low", "medium", "high"],
          },
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
          approx_effort: {
            type: String,
            enum: ["low", "medium", "high"],
          },
          example_issue_title: String,
        },
      ],
      default: [],
    },

    // ========== RAW DATA ==========
    readme_raw: String,
    contributing_raw: String,
    issue_samples: {
      type: [
        {
          title: String,
          labels: [String],
        },
      ],
      default: [],
    },

    // ========== TIMESTAMPS ==========
    summarizedAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: "projects",
  }
);

// ========== INDEXES ==========
// Compound indexes for common queries
projectSchema.index({ language: 1, overall_score: -1 });
projectSchema.index({ categories: 1, overall_score: -1 });
projectSchema.index({ recommended_level: 1, overall_score: -1 });
projectSchema.index({ last_updated: -1 });

// Text search index
projectSchema.index({
  summary: "text",
  repo_name: "text",
  description: "text",
});

export const Project = mongoose.model<IProject>("projects", projectSchema);
