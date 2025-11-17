export interface LicenseInfo {
  name?: string;
  key?: string;
}

export interface IssueData {
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
