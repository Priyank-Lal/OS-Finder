import mongoose, { Schema, Document } from "mongoose";

// Nested interface definitions
interface LicenseInfo {
  name?: string;
  key?: string;
}

interface IssueData {
  total_open_issues: number;
  good_first_issue_count: number;
  help_wanted_count: number;
  first_timers_count: number;
  beginner_count: number;
  bug_count: number;
  enhancement_count: number;
  documentation_count: number;
  refactor_count: number;
  high_priority_count: number;
}

interface ActivityData {
  avg_pr_merge_hours: number | null;
  pr_merge_ratio: number;
}

interface IssueSample {
  title: string;
  labels: string[];
}

interface ContributionArea {
  area: string;
  confidence: number;
  reasons: string[];
}

interface Task {
  title: string;
  why: string;
  approx_effort: string;
  example_issue_title?: string;
}

export interface IProject extends Document {
  // Core repository info
  repoId: string;
  repo_name: string;
  repo_url: string;
  owner: string;

  // Repository metadata
  language: string;
  licenseInfo: LicenseInfo;
  isArchived: boolean;
  forkCount: number;
  topics: string[];
  description: string;

  // Activity metrics
  open_prs: number;
  stars: number;
  contributors: number;
  has_contributing: boolean;

  // Scoring metrics (0-1 scale)
  friendliness: number;
  maintenance: number;
  accessibility: number;
  complexity: number;
  score: number;
  final_score: number;

  // Issue tracking
  issue_data: IssueData;
  beginner_issue_total: number;
  beginner_issue_score: number;
  accessibility_score_base: number;

  // Activity tracking
  activity: ActivityData;

  // AI-generated content
  summary: string;
  summary_level: "beginner" | "intermediate" | "advanced";
  readme_raw?: string;
  contributing_raw?: string;

  // Analysis data
  ai_categories: string[];
  issue_samples?: IssueSample[];
  tech_stack?: string[];
  required_skills?: string[];
  main_contrib_areas?: ContributionArea[];
  beginner_tasks?: Task[];
  intermediate_tasks?: Task[];

  // Status
  needs_review?: boolean;
  summarizedAt?: Date;
  file_tree: string[];

  // Timestamps
  last_updated: Date;
  last_commit: Date;
}

const projectSchema: Schema = new Schema(
  {
    // Core repository info
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
    },

    // Repository metadata
    language: {
      type: String,
      required: true,
    },
    licenseInfo: {
      name: { type: String },
      key: { type: String },
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    forkCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    topics: {
      type: [String],
      default: [],
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

    // Scoring metrics (0-1 scale)
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
    },
    file_tree: {
      type: [String],
      default: [],
    },
    summarizedAt: {
      type: Date,
    },

    // Timestamps
    last_updated: {
      type: Date,
      required: true,
    },
    last_commit: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "projects",
  }
);

// Indexes for optimal query performance
projectSchema.index({ repoId: 1 });
projectSchema.index({ language: 1 });
projectSchema.index({ final_score: -1 });
projectSchema.index({ topics: 1 });
projectSchema.index({ last_updated: -1 });

export const Project = mongoose.model<IProject>("projects", projectSchema);
