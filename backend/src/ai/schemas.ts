import { z } from "zod";

/**
 * Shared Zod schemas for AI-generated content
 * Used with LangChain's ChatGoogleGenerativeAI.withStructuredOutput() for reliable JSON responses
 */

// Task Suggestion Schemas
export const TaskSchema = z.object({
  title: z.string().min(15).max(200).describe("Specific, actionable task description with file/feature names"),
  why: z.string().min(15).max(500).describe("Concrete reason why this task is valuable"),
  approx_effort: z.enum(["low", "medium", "high"]).describe("Estimated effort level"),
  example_issue_title: z.string().optional().describe("Matching open issue title if applicable"),
  file_locations: z.string().optional().describe("Specific files or paths related to this task"),
  related_tech: z.string().optional().describe("Technologies involved in this task"),
});

export const TaskSuggestionsSchema = z.object({
  beginner_tasks: z.array(TaskSchema).max(6).describe("Beginner-friendly contribution tasks"),
  intermediate_tasks: z.array(TaskSchema).max(6).describe("Intermediate-level contribution tasks"),
});

// Scoring Schemas
export const ScoreBreakdownSchema = z.object({
  readme_quality: z.string().describe("Assessment of README documentation"),
  documentation: z.string().describe("Assessment of code documentation"),
  issue_quality: z.string().describe("Assessment of issue templates and quality"),
  community_health: z.string().describe("Assessment of community responsiveness"),
  manual_score_adjustment: z.string().optional().describe("Explanation of changes from manual score"),
});

export const ScoringSchema = z.object({
  beginner_friendliness: z.number().min(0).max(1).describe("How welcoming the project is to beginners (0-1)"),
  technical_complexity: z.number().min(0).max(1).describe("Technical difficulty level (0-1)"),
  contribution_readiness: z.number().min(0).max(1).describe("How ready the project is for contributions (0-1)"),
  overall_score: z.number().int().min(0).max(100).describe("Overall OS-Finder score (0-100)"),
  recommended_level: z.enum(["beginner", "intermediate", "advanced"]).describe("Recommended contributor experience level"),
  confidence: z.number().min(0).max(1).describe("Confidence in this scoring (0-1)"),
  score_breakdown: ScoreBreakdownSchema.describe("Detailed breakdown of scoring factors"),
});

// Contribution Areas Schema
export const ContributionAreaSchema = z.object({
  area: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).describe("Short hyphenated area name (e.g., 'frontend-components')"),
  confidence: z.number().min(0).max(1).describe("Confidence in this area (0-1)"),
  reasons: z.array(z.string().min(5).max(200)).min(1).max(3).describe("1-3 concrete reasons supporting this area"),
});

export const ContributionAreasSchema = z.object({
  main_contrib_areas: z.array(ContributionAreaSchema).max(6).describe("Main contribution areas ranked by relevance"),
});

// Tech Stack & Skills Schema
export const TechStackSchema = z.object({
  tech_stack: z.array(z.string()).max(15).describe("Main technologies used (languages, frameworks, tools)"),
  required_skills: z.array(z.string()).max(10).describe("Skills needed to contribute effectively"),
});

// README Summary Schema
export const ReadmeSummarySchema = z.object({
  summary: z.string().min(50).max(1000).describe("Concise project summary from README"),
  repo_categories: z.array(z.string()).max(5).describe("Main categories this repo belongs to"),
});

// Label Analysis Schema
export const LabelMappingSchema = z.object({
  beginner: z.array(z.string()).describe("Labels for beginner-friendly issues"),
  bug: z.array(z.string()).describe("Labels for bug reports"),
  help_wanted: z.array(z.string()).describe("Labels for help wanted issues"),
  enhancement: z.array(z.string()).describe("Labels for enhancements/features"),
  documentation: z.array(z.string()).describe("Labels for documentation"),
  testing: z.array(z.string()).describe("Labels for testing"),
  performance: z.array(z.string()).describe("Labels for performance"),
  security: z.array(z.string()).describe("Labels for security"),
});

// Suitability Schema
export const SuitabilitySchema = z.object({
  isSuitable: z.boolean().describe("Whether this repo is suitable for OS-Finder"),
  reason: z.string().min(10).max(500).describe("Explanation of suitability decision"),
  confidence: z.number().min(0).max(1).describe("Confidence in this decision"),
});

// Type exports for use in code
export type TaskSuggestions = z.infer<typeof TaskSuggestionsSchema>;
export type Scoring = z.infer<typeof ScoringSchema>;
export type ContributionAreas = z.infer<typeof ContributionAreasSchema>;
export type TechStack = z.infer<typeof TechStackSchema>;
export type ReadmeSummary = z.infer<typeof ReadmeSummarySchema>;
export type LabelMappingOutput = z.infer<typeof LabelMappingSchema>;
export type Suitability = z.infer<typeof SuitabilitySchema>;
