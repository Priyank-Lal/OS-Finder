import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  github_id: number;
  owner: string;
  repo_name: string;
  description: string;
  language: string;
  topics: string[];

  // Custom Calculated Health Metrics (Yeh aapke project ka USP hai)
  health_metrics: {
    last_calculated: Date;
    responsiveness_score: number; // Avg time to close a PR (in hours)
    activity_score: number; // Unique contributors in last X days
    stale_issue_ratio: number; // % of issues with no activity
  };

  // Basic GitHub Data
  issue_data: {
    total_open_issues: number;
    beginner_issues_count: number; // 'good first issue' label count
  };
}

const projectSchema: Schema = new Schema(
  {
    githubId: { type: Number, required: true, unique: true },
    owner: { type: String, required: true },
    repo_name: { type: String, required: true },
    description: { type: String },
    language: { type: String, required: true },
    topics: [{ type: String }],
    health_metrics: {
      last_calculated: { type: Date, default: Date.now },
      responsiveness_score: { type: Number, default: 0 },
      activity_score: { type: Number, default: 0 },
      stale_issue_ratio: { type: Number, default: 0 },
    },
    issue_data: {
      total_open_issues: { type: Number, default: 0 },
      beginner_issues_count: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const Project = mongoose.model<IProject>("projects", projectSchema);
