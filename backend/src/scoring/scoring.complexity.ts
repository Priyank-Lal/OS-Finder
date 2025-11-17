import { IProject } from "../models/project.interface";
import { CodebaseComplexityAnalysis } from "./scoring.ai";
import { logNormalize, clamp } from "./scoring.utils";
import { WEIGHTS } from "./scoring.weights";

export function computeTechnicalComplexity(
  repo: IProject,
  aiAnalysis?: CodebaseComplexityAnalysis
): { score: number; breakdown: Record<string, number> } {
  // 1. Codebase Size Score (0-100)
  // Use actual file metrics if available, otherwise fall back to proxy metrics
  const fileMetrics = (repo as any).file_tree_metrics;
  let sizeScore = 50; // Default

  if (fileMetrics?.totalFiles) {
    // Direct file count analysis
    const fileCount = fileMetrics.totalFiles;

    // Score based on file count ranges:
    // 0-50 files: Very simple (10-30)
    // 51-200 files: Simple to medium (30-50)
    // 201-500 files: Medium (50-70)
    // 501-1000 files: Complex (70-85)
    // 1000+ files: Very complex (85-100)

    if (fileCount <= 50) {
      sizeScore = 10 + (fileCount / 50) * 20;
    } else if (fileCount <= 200) {
      sizeScore = 30 + ((fileCount - 50) / 150) * 20;
    } else if (fileCount <= 500) {
      sizeScore = 50 + ((fileCount - 200) / 300) * 20;
    } else if (fileCount <= 1000) {
      sizeScore = 70 + ((fileCount - 500) / 500) * 15;
    } else {
      sizeScore = Math.min(100, 85 + Math.log10(fileCount / 1000) * 15);
    }
  } else {
    // Fall back to proxy metrics (stars + contributors)
    const stars = repo.stars || 0;
    const contributors = repo.contributors || 0;
    sizeScore = Math.min(
      100,
      ((logNormalize(stars, 10) + logNormalize(contributors, 10)) / 2) * 100
    );
  }

  // 2. Architecture Depth Score (0-100)
  let architectureScore = 50; // Default

  if (fileMetrics) {
    // Use actual directory depth
    const maxDepth = fileMetrics.maxDepth || 0;
    const avgDepth = fileMetrics.avgDepth || 0;
    const hasMonorepo = fileMetrics.hasMonorepo || false;

    // Score based on depth:
    // Depth 1-2: Simple (20-40)
    // Depth 3-4: Medium (40-60)
    // Depth 5-7: Complex (60-80)
    // Depth 8+: Very complex (80-100)

    let depthScore = Math.min(100, maxDepth * 12);

    // Average depth provides additional context
    depthScore = depthScore * 0.7 + Math.min(100, avgDepth * 15) * 0.3;

    // Monorepo adds significant complexity
    if (hasMonorepo) {
      depthScore = Math.min(100, depthScore + 25);
    }

    architectureScore = depthScore;
  } else if (aiAnalysis) {
    // Fall back to AI analysis
    architectureScore = aiAnalysis.architecture_score * 10;
  }

  // 3. Dependencies Score (0-100)
  let dependenciesScore = 30; // Default baseline

  if (fileMetrics) {
    const lockFiles = fileMetrics.lockFiles || [];
    const hasLockFile = lockFiles.length > 0;
    const multipleLockFiles = lockFiles.length > 1;

    // Base score from lock file presence
    if (hasLockFile) {
      dependenciesScore = 50;
    }

    // Multiple lock files (e.g., package-lock + yarn.lock) indicates complexity
    if (multipleLockFiles) {
      dependenciesScore += 15;
    }

    // Monorepo typically has more dependencies
    if (fileMetrics.hasMonorepo) {
      dependenciesScore = Math.min(100, dependenciesScore + 20);
    }

    // Adjust based on language (some have more complex dep ecosystems)
    const complexDepLangs = ["javascript", "typescript", "java", "rust"];
    if (complexDepLangs.includes(repo.language?.toLowerCase() || "")) {
      dependenciesScore = Math.min(100, dependenciesScore + 10);
    }
  } else {
    // Fallback to old logic
    const fileTree = (repo as any).file_tree || [];
    const hasDependencyFile = fileTree.some((f: string) =>
      [
        "package.json",
        "requirements.txt",
        "go.mod",
        "pom.xml",
        "Cargo.toml",
      ].includes(f)
    );

    dependenciesScore = hasDependencyFile ? 60 : 30;

    const complexDepLangs = ["javascript", "typescript", "java", "rust"];
    if (complexDepLangs.includes(repo.language?.toLowerCase() || "")) {
      dependenciesScore = Math.min(100, dependenciesScore + 20);
    }
  }

  // 4. Language Features Score (0-100)
  let languageFeaturesScore = 50;

  if (aiAnalysis) {
    languageFeaturesScore = aiAnalysis.abstraction_level * 10;
  }

  // Advanced languages bonus
  const advancedLangs = ["rust", "haskell", "scala", "c++", "go", "elixir"];
  if (advancedLangs.includes(repo.language?.toLowerCase() || "")) {
    languageFeaturesScore = Math.min(100, languageFeaturesScore + 20);
  }

  // Beginner-friendly languages penalty
  const beginnerLangs = ["python", "javascript", "ruby", "php"];
  if (beginnerLangs.includes(repo.language?.toLowerCase() || "")) {
    languageFeaturesScore = Math.max(20, languageFeaturesScore - 10);
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
    "networking",
    "embedded",
    "security",
    "graphics",
  ];

  const hasComplexDomain = (repo.topics || []).some((topic) =>
    complexDomains.some((domain) => topic.toLowerCase().includes(domain))
  );

  if (hasComplexDomain) {
    domainComplexityScore = Math.min(100, domainComplexityScore + 30);
  }

  // Simple domains reduction
  const simpleDomains = [
    "website",
    "blog",
    "portfolio",
    "tutorial",
    "learning",
    "starter",
    "template",
  ];

  const hasSimpleDomain = (repo.topics || []).some((topic) =>
    simpleDomains.some((domain) => topic.toLowerCase().includes(domain))
  );

  if (hasSimpleDomain) {
    domainComplexityScore = Math.max(20, domainComplexityScore - 20);
  }

  // 6. Build/Setup Complexity Score (0-100)
  let setupComplexityScore = 30; // Default

  if (fileMetrics) {
    const buildComplexity = fileMetrics.buildComplexity || 0;
    setupComplexityScore = Math.min(100, buildComplexity * 10);
  } else if (aiAnalysis) {
    setupComplexityScore = aiAnalysis.setup_complexity * 10;
  }

  const breakdown = {
    codebaseSize: Math.round(sizeScore),
    architectureDepth: Math.round(architectureScore),
    dependencies: Math.round(dependenciesScore),
    languageFeatures: Math.round(languageFeaturesScore),
    domainComplexity: Math.round(domainComplexityScore),
    setupComplexity: Math.round(setupComplexityScore),
  };

  // Weighted average with updated weights
  const score =
    breakdown.codebaseSize * 0.15 +
    breakdown.architectureDepth * 0.25 +
    breakdown.dependencies * 0.15 +
    breakdown.languageFeatures * 0.15 +
    breakdown.domainComplexity * 0.2 +
    breakdown.setupComplexity * 0.1;

  return {
    score: clamp(Math.round(score), 0, 100),
    breakdown,
  };
}
