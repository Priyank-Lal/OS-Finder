import { IProject } from "../models/project.model";
import { GoogleGenAI } from "@google/genai";
import { _config } from "../config/config";

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const WEIGHTS = {
  // Beginner Friendliness (0-100)
  beginner: {
    documentation: 0.25, // Good docs, CONTRIBUTING.md
    issueLabels: 0.2, // Good first issues, help wanted
    communitySize: 0.15, // Active, responsive community
    codebaseSimplicity: 0.25, // Low cyclomatic complexity, clear structure
    setupEase: 0.15, // Easy to set up and run
  },

  // Technical Complexity (0-100)
  complexity: {
    codebaseSize: 0.2, // Lines of code, file count
    architectureDepth: 0.25, // Layers, abstractions, patterns
    dependencies: 0.15, // Number and depth of dependencies
    languageFeatures: 0.2, // Advanced language features used
    domainComplexity: 0.2, // Problem domain difficulty
  },

  // Contribution Readiness (0-100)
  contribution: {
    issueQuality: 0.25, // Well-defined issues
    prActivity: 0.25, // PR merge rate and speed
    maintainerResponse: 0.2, // How active maintainers are
    testCoverage: 0.15, // Tests present
    cicd: 0.15, // CI/CD setup
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalize(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

// Sigmoid normalization for better distribution
function sigmoidNormalize(
  value: number,
  midpoint: number,
  steepness: number = 0.1
): number {
  return 1 / (1 + Math.exp(-steepness * (value - midpoint)));
}

// Logarithmic scale for exponential metrics (stars, contributors)
function logNormalize(value: number, base: number = 10): number {
  if (value <= 1) return 0;
  const logValue = Math.log(value) / Math.log(base);
  return clamp(logValue / 5, 0, 1); // 10^5 = 100k is max
}

// ============================================================================
// AI-POWERED COMPLEXITY ANALYSIS
// ============================================================================

interface CodebaseComplexityAnalysis {
  architecture_score: number; // 0-10: How complex is the architecture
  abstraction_level: number; // 0-10: Level of abstraction
  domain_difficulty: number; // 0-10: How hard is the problem domain
  code_patterns: string[]; // Design patterns used
  setup_complexity: number; // 0-10: How hard to set up
  recommended_experience: string; // "beginner" | "intermediate" | "advanced"
}

async function analyzeCodebaseComplexity(
  readme: string,
  fileTree: string[],
  language: string,
  topics: string[],
  contributingMd?: string
): Promise<CodebaseComplexityAnalysis> {
  try {
    const client = new GoogleGenAI({
      apiKey: _config.GEMINI_KEYS?.split(",")[0],
    });

    const prompt = `You are a code complexity analyzer. Analyze this repository and respond ONLY with valid JSON.

README (first 5000 chars):
${readme.slice(0, 5000)}

FILE STRUCTURE (top level):
${JSON.stringify(fileTree.slice(0, 30))}

PRIMARY LANGUAGE: ${language}
TOPICS: ${JSON.stringify(topics)}

${contributingMd ? `CONTRIBUTING.md:\n${contributingMd.slice(0, 1000)}` : ""}

Analyze and return JSON with this EXACT schema:
{
  "architecture_score": <0-10, how complex is the architecture>,
  "abstraction_level": <0-10, how abstract/meta is the code>,
  "domain_difficulty": <0-10, how hard is the problem domain>,
  "code_patterns": [<array of design patterns detected>],
  "setup_complexity": <0-10, setup difficulty>,
  "recommended_experience": "<beginner|intermediate|advanced>"
}

Consider:
- Architecture: Microservices (10), monolith with layers (5), single file (1)
- Abstraction: Meta-programming (10), OOP with interfaces (5), procedural (1)
- Domain: Compilers/OS (10), web framework (5), utility library (1)
- Setup: Multi-service docker compose (10), npm install && run (3), single script (1)`;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
      maxOutputTokens: 400,
      temperature: 0.0,
    } as any);

    const text = response?.text || "";
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim()
      .match(/\{[\s\S]*\}/)?.[0] || "{}";

    let parsed: any = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {};
    }

    return {
      architecture_score: clamp(parsed.architecture_score || 5, 0, 10),
      abstraction_level: clamp(parsed.abstraction_level || 5, 0, 10),
      domain_difficulty: clamp(parsed.domain_difficulty || 5, 0, 10),
      code_patterns: Array.isArray(parsed.code_patterns)
        ? parsed.code_patterns
        : [],
      setup_complexity: clamp(parsed.setup_complexity || 5, 0, 10),
      recommended_experience: parsed.recommended_experience || "intermediate",
    };
  } catch (error) {
    console.error("AI complexity analysis failed:", error);
    // Return safe defaults
    return {
      architecture_score: 5,
      abstraction_level: 5,
      domain_difficulty: 5,
      code_patterns: [],
      setup_complexity: 5,
      recommended_experience: "intermediate",
    };
  }
}

// ============================================================================
// SCORE COMPUTATION FUNCTIONS
// ============================================================================

interface DetailedScores {
  beginner_friendliness: number; // 0-100: How beginner-friendly
  technical_complexity: number; // 0-100: How technically complex
  contribution_readiness: number; // 0-100: How ready for contributions
  overall_score: number; // 0-100: Weighted overall
  recommended_level: string; // "beginner" | "intermediate" | "advanced"
  confidence: number; // 0-1: How confident are we
  breakdown: {
    beginner: Record<string, number>;
    complexity: Record<string, number>;
    contribution: Record<string, number>;
  };
}

function computeBeginnerFriendliness(
  repo: IProject,
  aiAnalysis?: CodebaseComplexityAnalysis
): { score: number; breakdown: Record<string, number> } {
  // 1. Documentation Score (0-100)
  const hasReadme = (repo.readme_raw?.length || 0) > 500;
  const hasContributing = repo.has_contributing;
  const hasClearDescription = (repo.description?.length || 0) > 50;

  const documentationScore =
    (hasReadme ? 50 : 0) +
    (hasContributing ? 30 : 0) +
    (hasClearDescription ? 20 : 0);

  // 2. Issue Labels Score (0-100)
  const gfi = repo.issue_data?.good_first_issue_count || 0;
  const helpWanted = repo.issue_data?.help_wanted_count || 0;
  const beginner = repo.issue_data?.beginner_count || 0;
  const doc = repo.issue_data?.documentation_count || 0;

  const totalBeginnerIssues = gfi + helpWanted + beginner + doc;
  const issueLabelsScore = Math.min(
    100,
    gfi * 15 + helpWanted * 10 + beginner * 10 + doc * 5
  );

  // 3. Community Size Score (0-100)
  // Sweet spot: 10-100 contributors (too few = inactive, too many = intimidating)
  const contributors = repo.contributors || 0;
  const stars = repo.stars || 0;

  let communityScore = 0;
  if (contributors >= 5 && contributors <= 50) {
    communityScore = 100; // Sweet spot for beginners
  } else if (contributors < 5) {
    communityScore = contributors * 20; // 0-4 contributors
  } else {
    // Diminishing returns after 50
    communityScore = Math.max(40, 100 - (contributors - 50) * 0.5);
  }

  // Adjust for stars (too popular can be intimidating)
  if (stars > 50000) communityScore *= 0.7;

  // 4. Codebase Simplicity Score (0-100)
  let codebaseSimplicityScore = 50; // Default

  if (aiAnalysis) {
    // Invert AI complexity scores (high complexity = low simplicity)
    const avgComplexity =
      (aiAnalysis.architecture_score +
        aiAnalysis.abstraction_level +
        aiAnalysis.domain_difficulty) /
      3;

    codebaseSimplicityScore = 100 - avgComplexity * 10;
  }

  // 5. Setup Ease Score (0-100)
  let setupEaseScore = 50; // Default

  if (aiAnalysis) {
    setupEaseScore = 100 - aiAnalysis.setup_complexity * 10;
  }

  // Bonus for common beginner languages
  const beginnerLangs = ["javascript", "python", "html", "css", "markdown"];
  if (beginnerLangs.includes(repo.language?.toLowerCase() || "")) {
    setupEaseScore = Math.min(100, setupEaseScore + 10);
  }

  const breakdown = {
    documentation: documentationScore,
    issueLabels: issueLabelsScore,
    communitySize: communityScore,
    codebaseSimplicity: codebaseSimplicityScore,
    setupEase: setupEaseScore,
  };

  // Weighted average
  const score =
    breakdown.documentation * WEIGHTS.beginner.documentation +
    breakdown.issueLabels * WEIGHTS.beginner.issueLabels +
    breakdown.communitySize * WEIGHTS.beginner.communitySize +
    breakdown.codebaseSimplicity * WEIGHTS.beginner.codebaseSimplicity +
    breakdown.setupEase * WEIGHTS.beginner.setupEase;

  return { score: Math.round(score), breakdown };
}

function computeTechnicalComplexity(
  repo: IProject,
  aiAnalysis?: CodebaseComplexityAnalysis
): { score: number; breakdown: Record<string, number> } {
  // 1. Codebase Size Score (0-100)
  const stars = repo.stars || 0;
  const contributors = repo.contributors || 0;

  // Use logarithmic scale for size indicators
const sizeScore =
  Math.min(
    100,
    (logNormalize(stars, 10) + logNormalize(contributors, 10)) / 2 * 100
  );
  // 2. Architecture Depth Score (0-100)
  let architectureScore = 50; // Default

  if (aiAnalysis) {
    architectureScore = aiAnalysis.architecture_score * 10;
  }

  // 3. Dependencies Score (0-100)
  // Estimate from file tree presence
const fileTree = repo.file_tree || [];
  const hasDependencyFile = fileTree.some((f) =>
    [
      "package.json",
      "requirements.txt",
      "go.mod",
      "pom.xml",
      "Cargo.toml",
    ].includes(f)
  );

  let dependenciesScore = hasDependencyFile ? 60 : 30;

  // Adjust based on language (some have more complex dep ecosystems)
  const complexDepLangs = ["javascript", "java", "rust"];
  if (complexDepLangs.includes(repo.language?.toLowerCase() || "")) {
    dependenciesScore += 20;
  }

  // 4. Language Features Score (0-100)
  let languageFeaturesScore = 50;

  if (aiAnalysis) {
    languageFeaturesScore = aiAnalysis.abstraction_level * 10;
  }

  // Advanced languages bonus
  const advancedLangs = ["rust", "haskell", "scala", "c++", "go"];
  if (advancedLangs.includes(repo.language?.toLowerCase() || "")) {
    languageFeaturesScore = Math.min(100, languageFeaturesScore + 20);
  }

  // 5. Domain Complexity Score (0-100)
  let domainComplexityScore = 50;

  if (aiAnalysis) {
    domainComplexityScore = aiAnalysis.domain_difficulty * 10;
  }

  // Detect complex domains from topics
  const complexDomains = [
    "compiler",
    "operating-system",
    "database",
    "blockchain",
    "machine-learning",
    "crypto",
    "kernel",
    "distributed-systems",
    "compiler-design",
    "virtualization",
  ];

  const hasComplexDomain = (repo.topics || []).some((topic) =>
    complexDomains.some((domain) => topic.toLowerCase().includes(domain))
  );

  if (hasComplexDomain) {
    domainComplexityScore = Math.min(100, domainComplexityScore + 30);
  }

  const breakdown = {
    codebaseSize: sizeScore,
    architectureDepth: architectureScore,
    dependencies: dependenciesScore,
    languageFeatures: languageFeaturesScore,
    domainComplexity: domainComplexityScore,
  };

  const score =
    breakdown.codebaseSize * WEIGHTS.complexity.codebaseSize +
    breakdown.architectureDepth * WEIGHTS.complexity.architectureDepth +
    breakdown.dependencies * WEIGHTS.complexity.dependencies +
    breakdown.languageFeatures * WEIGHTS.complexity.languageFeatures +
    breakdown.domainComplexity * WEIGHTS.complexity.domainComplexity;

  return { score: Math.round(score), breakdown };
}

function computeContributionReadiness(repo: IProject): {
  score: number;
  breakdown: Record<string, number>;
} {
  // 1. Issue Quality Score (0-100)
  const totalIssues = repo.issue_data?.total_open_issues || 0;
  const labeledIssues =
    (repo.issue_data?.good_first_issue_count || 0) +
    (repo.issue_data?.help_wanted_count || 0) +
    (repo.issue_data?.bug_count || 0) +
    (repo.issue_data?.enhancement_count || 0);

  let issueQualityScore = 0;
  if (totalIssues > 0) {
    const labelRatio = labeledIssues / totalIssues;
    issueQualityScore = labelRatio * 60; // 60% for labeling

    // Bonus for having diverse issue types
    const issueTypes = [
      repo.issue_data?.bug_count,
      repo.issue_data?.enhancement_count,
      repo.issue_data?.documentation_count,
    ].filter((count) => (count || 0) > 0).length;

    issueQualityScore += (issueTypes / 3) * 40; // 40% for diversity
  }

  // 2. PR Activity Score (0-100)
  const mergeRatio = repo.activity?.pr_merge_ratio || 0;
  const mergeHours = repo.activity?.avg_pr_merge_hours || 9999;

  // Good merge ratio: 0.6-0.9
  // mergeRatio in 0..1 -> map midpoint at 0.7 (70%) but use steeper curve
  const mergeRatioScore = sigmoidNormalize(mergeRatio * 100, 70, 0.12) * 100;

  // Good merge time: < 48 hours
  let mergeTimeScore = 0;
  if (mergeHours < 24) mergeTimeScore = 100;
  else if (mergeHours < 48) mergeTimeScore = 80;
  else if (mergeHours < 168) mergeTimeScore = 60; // 1 week
  else if (mergeHours < 720) mergeTimeScore = 40; // 1 month
  else mergeTimeScore = 20;

  const prActivityScore = mergeRatioScore * 0.6 + mergeTimeScore * 0.4;

  // 3. Maintainer Response Score (0-100)
  // Based on PR merge speed and ratio
  const maintainerResponseScore = prActivityScore; // Reuse PR activity as proxy

  // 4. Test Coverage Score (0-100)
  // Estimate from file tree
  const fileTree = repo.file_tree || [];
  const hasTestFiles = fileTree.some(
    (f) => f.includes("test") || f.includes("spec") || f.includes("__tests__")
  );

  const testCoverageScore = hasTestFiles ? 80 : 20;

  // 5. CI/CD Score (0-100)
  const hasCICD = fileTree.some((f) =>
    [".github/", ".gitlab-ci", ".travis.yml", "Jenkinsfile", ".circleci/"].some(
      (ci) => f.includes(ci)
    )
  );

  const cicdScore = hasCICD ? 90 : 30;

  const breakdown = {
    issueQuality: issueQualityScore,
    prActivity: prActivityScore,
    maintainerResponse: maintainerResponseScore,
    testCoverage: testCoverageScore,
    cicd: cicdScore,
  };

  const score =
    breakdown.issueQuality * WEIGHTS.contribution.issueQuality +
    breakdown.prActivity * WEIGHTS.contribution.prActivity +
    breakdown.maintainerResponse * WEIGHTS.contribution.maintainerResponse +
    breakdown.testCoverage * WEIGHTS.contribution.testCoverage +
    breakdown.cicd * WEIGHTS.contribution.cicd;

  return { score: Math.round(score), breakdown };
}

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

export async function computeDetailedScores(
  repo: IProject,
  options?: {
    aiAnalysis?: CodebaseComplexityAnalysis;
    includeAIAnalysis?: boolean;
  }
): Promise<DetailedScores> {
  let aiAnalysis = options?.aiAnalysis;

  // Optionally run AI analysis
  if (options?.includeAIAnalysis && !aiAnalysis) {
    const fileTree = repo.tech_stack || [];
    aiAnalysis = await analyzeCodebaseComplexity(
      repo.readme_raw || "",
      fileTree,
      repo.language || "unknown",
      repo.topics || [],
      repo.contributing_raw
    );
  }

  // Compute three main scores
  const beginnerResult = computeBeginnerFriendliness(repo, aiAnalysis);
  const complexityResult = computeTechnicalComplexity(repo, aiAnalysis);
  const contributionResult = computeContributionReadiness(repo);

  // Coupling normalization
  const F = beginnerResult.score / 100;
  const C = complexityResult.score / 100;

  const adjustedFriendliness = Math.round(F * (1 - C) * 100);
  const adjustedComplexity = Math.round(C * (1 - F) * 100);

  // Overall score: weighted combination
  // For overall, we want repos that are either:
  // - High beginner-friendly + low complexity, OR
  // - High contribution-ready
  const overall =
    adjustedFriendliness * 0.35 +
    (100 - adjustedComplexity) * 0.25 + // Inverse complexity
    contributionResult.score * 0.4;

  // Determine recommended level
  let recommendedLevel: string;

  if (aiAnalysis?.recommended_experience) {
    recommendedLevel = aiAnalysis.recommended_experience;
  } else {
    // Fallback logic
    if (adjustedFriendliness >= 70 && adjustedComplexity <= 40) {
      recommendedLevel = "beginner";
    } else if (adjustedComplexity >= 70 || adjustedFriendliness <= 30) {
      recommendedLevel = "advanced";
    } else {
      recommendedLevel = "intermediate";
    }
  }

  // Confidence based on data completeness
  let confidence = 0.5; // Base confidence

  if (repo.readme_raw && repo.readme_raw.length > 500) confidence += 0.1;
  if (repo.has_contributing) confidence += 0.1;
  if ((repo.issue_data?.total_open_issues || 0) > 5) confidence += 0.1;
  if (repo.activity?.pr_merge_ratio) confidence += 0.1;
  if (aiAnalysis) confidence += 0.2;

  confidence = Math.min(1, confidence);

  return {
    beginner_friendliness: adjustedFriendliness,
    technical_complexity: adjustedComplexity,
    contribution_readiness: contributionResult.score,
    overall_score: Math.round(overall),
    recommended_level: recommendedLevel,
    confidence,
    breakdown: {
      beginner: beginnerResult.breakdown,
      complexity: complexityResult.breakdown,
      contribution: contributionResult.breakdown,
    },
  };
}

// ============================================================================
// BACKWARDS COMPATIBLE FUNCTION
// ============================================================================

export function computeScores(repo: IProject) {
  // This is a sync version for backwards compatibility
  // It won't use AI analysis but will use improved logic

  const beginnerResult = computeBeginnerFriendliness(repo);
  const complexityResult = computeTechnicalComplexity(repo);
  const contributionResult = computeContributionReadiness(repo);

  return {
    friendliness: beginnerResult.score / 100,
    complexity: complexityResult.score / 100,
    accessibility: contributionResult.score / 100,
    maintenance: contributionResult.score / 100, // Reuse contribution as maintenance proxy
  };
}

// Export analysis function for use in summarizer
export { analyzeCodebaseComplexity };
