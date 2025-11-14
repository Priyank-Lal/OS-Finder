import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  repoId: String;
  repo_name: string;
  repo_url: string;
  owner: string;
  language: string;
  licenseInfo: object;
  isArchived: boolean;
  forkCount: number;
  topics: string[];
  description: string;
  open_prs: number;
  stars: number;
  score: number;
  contributors: number;
  has_contributing: boolean;

  // // Custom Calculated Health Metrics (Yeh aapke project ka USP hai)
  // health_metrics: {
  //   last_calculated: Date;
  //   responsiveness_score: number; // Avg time to close a PR (in hours)
  //   activity_score: number; // Unique contributors in last X days
  //   stale_issue_ratio: number; // % of issues with no activity
  // };

  // Basic GitHub Data
  issue_data: {
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
  };
  activity: {
    avg_pr_merge_hours: number;
    pr_merge_ratio: number;
  };
  summary: string;
  last_updated: Date;
  last_commit: Date;
}

const projectSchema: Schema = new Schema(
  {
    repoId: { type: String, required: true, unique: true },
    repo_name: { type: String, required: true },
    repo_url: { type: String, required: true },
    owner: { type: String, required: true },
    language: { type: String, required: true },
    licenseInfo: {
      type: Object,
      default: {},
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    forkCount: {
      type: Number,
      default: 0,
    },
    topics: [{ type: String }],
    description: { type: String },
    open_prs: { type: Number, default: 0 },
    stars: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    contributors: { type: Number, default: 0 },
    issue_data: {
      total_open_issues: { type: Number, default: 0 },
      good_first_issue_count: { type: Number, default: 0 },
      help_wanted_count: { type: Number, default: 0 },
      first_timers_count: { type: Number, default: 0 },
      beginner_count: { type: Number, default: 0 },
      bug_count: { type: Number, default: 0 },
      enhancement_count: { type: Number, default: 0 },
      documentation_count: { type: Number, default: 0 },
      refactor_count: { type: Number, default: 0 },
      high_priority_count: { type: Number, default: 0 },
    },
    beginner_issue_total: { type: Number, default: 0 },
    beginner_issue_score: { type: Number, default: 0 },
    accessibility_score_base: { type: Number, default: 0 },
    has_contributing: {
      type: Boolean,
      default: false,
    },
    activity: {
      avg_pr_merge_hours: { type: Number, default: null },
      pr_merge_ratio: { type: Number, default: 0 },
    },
    summary: { type: String, default: "" },
    summary_level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "intermediate",
    },
    last_updated: {
      type: Date,
      required: true,
    },
    last_commit: {
      type: Date,
    },
  },
  { timestamps: true }
);

export const Project = mongoose.model<IProject>("projects", projectSchema);
projectSchema.index({ language: 1 });
projectSchema.index({ stars: -1 });
projectSchema.index({ topics: 1 });
