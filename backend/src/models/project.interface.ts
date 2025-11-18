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
  avg_issue_response_hours?: number | null;
  issue_response_rate?: number;
  maintainer_activity_score?: number;
  total_commits?: number;
}

export interface CommunityHealth {
  has_code_of_conduct: boolean;
  has_contributing: boolean;
  has_issue_templates: boolean;
  has_readme: boolean;
}

export interface FileTreeMetrics {
  totalFiles: number;
  totalDirectories: number;
  maxDepth: number;
  avgDepth: number;
  hasTests: boolean;
  hasDocs: boolean;
  hasCI: boolean;
  hasMonorepo: boolean;
  configFiles: string[];
  lockFiles: string[];
  buildComplexity: number;
  testToCodeRatio: number;
}

export interface LanguageBreakdown {
  name: string;
  size: number;
}

export interface IssueSample {
  title: string;
  labels: string[];
  created_at?: string;
  has_response?: boolean;
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
  beginner: Record<string, number>;
  complexity: Record<string, number>;
  contribution: Record<string, number>;
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

  // ========== FILE STRUCTURE (NEW) ==========
  file_tree?: string[];
  file_tree_metrics?: FileTreeMetrics;
  languages_breakdown?: LanguageBreakdown[];

  // ========== COMMUNITY HEALTH (NEW) ==========
  community_health?: CommunityHealth;

  // ========== AI ANALYSIS ==========
  summary: string;
  tech_stack: string[];
  required_skills: string[];
  categories: string[];
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

  summarization_attempts?: number;
  last_summarization_error?: string;
  last_summarization_attempt?: Date;
}
