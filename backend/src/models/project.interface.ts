import { Document } from "mongoose";

export interface LicenseInfo {
  name?: string;
  key?: string;
}

export interface IssueData {
  total_open: number;
  good_first_issue: number;
  help_wanted: number;
  beginner: number;
  bug: number;
  enhancement: number;
  documentation: number;
}

export interface ActivityData {
  avg_pr_merge_hours: number | null;
  pr_merge_ratio: number;
}

export interface IssueSample {
  title: string;
  labels: string[];
}

export interface ContributionArea {
  area: string;
  confidence: number;
  reasons: string[];
}

export interface Task {
  title: string;
  why: string;
  approx_effort: "low" | "medium" | "high";
  example_issue_title?: string;
}

export interface ScoreBreakdown {
  beginner_friendliness: Record<string, number>;
  technical_complexity: Record<string, number>;
  contribution_readiness: Record<string, number>;
}

export interface IProject extends Document {
  // ========== CORE INFO ==========
  repoId: string;
  repo_name: string;
  repo_url: string;
  owner: string;
  description: string;
  language: string;

  // ========== METADATA ==========
  stars: number;
  forkCount: number;
  contributors: number;
  isArchived: boolean;
  licenseInfo: LicenseInfo;
  topics: string[];

  // ========== ACTIVITY ==========
  open_prs: number;
  issue_data: IssueData;
  activity: ActivityData;
  last_commit: Date;
  last_updated: Date;

  // ========== AI ANALYSIS ==========
  summary: string;
  tech_stack: string[];
  required_skills: string[];
  categories: string[]; // Renamed from ai_categories for clarity
  main_contrib_areas: ContributionArea[];

  // ========== SCORING (0-100) ==========
  beginner_friendliness: number;
  technical_complexity: number;
  contribution_readiness: number;
  overall_score: number;
  recommended_level: "beginner" | "intermediate" | "advanced";
  scoring_confidence: number; // 0-1
  score_breakdown: ScoreBreakdown;

  // ========== TASKS ==========
  beginner_tasks: Task[];
  intermediate_tasks: Task[];

  // ========== RAW DATA (for reprocessing) ==========
  readme_raw?: string;
  contributing_raw?: string;
  issue_samples?: IssueSample[];

  // ========== TIMESTAMPS ==========
  summarizedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
