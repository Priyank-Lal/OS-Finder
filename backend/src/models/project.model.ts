import mongoose, { Schema } from "mongoose";
import { IProject } from "./project.interface";

const projectSchema: Schema = new Schema(
  {
    // ========== CORE INFO ==========
    repoId: {
      type: String,
      required: true,
      unique: true,
    },
    repo_name: {
      type: String,
      required: true,
      trim: true,
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
    },
    description: {
      type: String,
      default: "",
    },
    language: {
      type: String,
      required: true,
    },
    languages_breakdown: {
      type: [
        {
          name: String,
          size: Number,
        },
      ],
      default: [],
    },
    file_tree: {
      type: [String],
    }, // not necessary in db
    file_tree_metrics: {
      totalFiles: {
        type: Number,
        default: 0,
      },
      totalDirectories: {
        type: Number,
        default: 0,
      },
      maxDepth: {
        type: Number,
        default: 0,
      },
      avgDepth: {
        type: Number,
        default: 0,
      },
      hasTests: {
        type: Boolean,
        default: false,
      },
      hasDocs: {
        type: Boolean,
        default: false,
      },
      hasCI: {
        type: Boolean,
        default: false,
      },
      hasMonorepo: {
        type: Boolean,
        default: false,
      },
      configFiles: [String],
      lockFiles: [String],
      buildComplexity: {
        type: Number,
        default: 0,
      },
      testToCodeRatio: {
        type: Number,
        default: 0,
      },
    }, // not necessary in db
    community_health: {
      has_code_of_conduct: { type: Boolean },
      has_contributing: { type: Boolean },
      has_issue_templates: { type: Boolean },
      has_readme: { type: Boolean },
    }, // not necessary in db

    // ========== METADATA ==========
    stars: {
      type: Number,
      default: 0,
      min: 0,
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
    },
    licenseInfo: {
      name: String,
      key: String,
    },
    topics: {
      type: [String],
      default: [],
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
      avg_issue_response_hours: { type: Number, default: null },
      issue_response_rate: { type: Number, default: 0 },
      maintainer_activity_score: { type: Number, default: 0 },
      total_commits: { type: Number, default: 0 },
    },
    last_commit: {
      type: Date,
      default: null,
    },
    last_updated: {
      type: Date,
      required: true,
    },

    // ========== AI ANALYSIS ==========
    summary: {
      type: String,
      default: "",
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
    },
    recommended_level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "intermediate",
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
    readme_raw: String, // not necessary in db
    contributing_raw: String, // not necessary in db
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
    }, // not necessary in db?

    // ========== TIMESTAMPS ==========
    summarizedAt: {
      type: Date,
    },

    summarization_attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    last_summarization_error: {
      type: String,
    },
    last_summarization_attempt: {
      type: Date,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: "projects",
  }
);

projectSchema.index({ language: 1 });
projectSchema.index({ categories: 1 });
projectSchema.index({ recommended_level: 1 });

projectSchema.index({ overall_score: -1 });

export const Project = mongoose.model<IProject>("projects", projectSchema);
