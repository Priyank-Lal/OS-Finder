export interface UnifiedScoreResult {
  beginner_friendliness: number; // 0-100
  technical_complexity: number; // 0-100
  contribution_readiness: number; // 0-100
  overall_score: number; // 0-100
  recommended_level: "beginner" | "intermediate" | "advanced";
  confidence: number; // 0-1
  score_breakdown: ScoreBreakdown;
  scoring_method: "ai" | "fallback";
}

export interface ScoreBreakdown {
  beginner: {
    documentation: number;
    issue_labels: number;
    community_response: number;
    codebase_simplicity: number;
  };
  complexity: {
    architecture: number;
    dependencies: number;
    domain_difficulty: number;
  };
  contribution: {
    issue_quality: number;
    pr_activity: number;
    maintainer_engagement: number;
  };
}

export interface AIScoreResponse {
  beginner_friendliness: number;
  technical_complexity: number;
  contribution_readiness: number;
  recommended_level: string;
  confidence: number;
  reasoning: {
    beginner: {
      documentation_score: number;
      issue_labels_score: number;
      community_response_score: number;
      codebase_simplicity_score: number;
      explanation: string;
    };
    complexity: {
      architecture_score: number;
      dependencies_score: number;
      domain_difficulty_score: number;
      explanation: string;
    };
    contribution: {
      issue_quality_score: number;
      pr_activity_score: number;
      maintainer_engagement_score: number;
      explanation: string;
    };
  };
}
