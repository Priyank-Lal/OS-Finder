import { IProject } from "../models/project.interface";
import { CodebaseComplexityAnalysis } from "./scoring.ai";
import { logNormalize } from "./scoring.utils";
import { WEIGHTS } from "./scoring.weights";

export function computeTechnicalComplexity(
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
