import { GoogleGenAI } from "@google/genai";
import { clamp } from "./scoring.utils";
import { _config } from "../config/config";
import { FileTreeMetrics } from "../utils/fileTreeAnalyzer";

export interface CodebaseComplexityAnalysis {
  architecture_score: number; // 0-10: How complex is the architecture
  abstraction_level: number; // 0-10: Level of abstraction
  domain_difficulty: number; // 0-10: How hard is the problem domain
  code_patterns: string[]; // Design patterns used
  setup_complexity: number; // 0-10: How hard to set up
  recommended_experience: string; // "beginner" | "intermediate" | "advanced"
}

export async function analyzeCodebaseComplexity(
  readme: string,
  fileTreeMetrics: FileTreeMetrics | null,
  language: string,
  topics: string[],
  contributingMd?: string
): Promise<CodebaseComplexityAnalysis> {
  try {
    const client = new GoogleGenAI({
      apiKey: _config.GEMINI_KEYS?.split(",")[0],
    });

    // Build structured file tree summary
    let fileTreeSummary = "No file tree data available.";

    if (fileTreeMetrics) {
      fileTreeSummary = `
FILE TREE METRICS:
- Total Files: ${fileTreeMetrics.totalFiles}
- Total Directories: ${fileTreeMetrics.totalDirectories}
- Maximum Nesting Depth: ${fileTreeMetrics.maxDepth}
- Average Nesting Depth: ${fileTreeMetrics.avgDepth.toFixed(2)}
- Has Test Suite: ${fileTreeMetrics.hasTests ? "Yes" : "No"}
- Has Documentation Folder: ${fileTreeMetrics.hasDocs ? "Yes" : "No"}
- Has CI/CD: ${fileTreeMetrics.hasCI ? "Yes" : "No"}
- Is Monorepo: ${fileTreeMetrics.hasMonorepo ? "Yes" : "No"}
- Test-to-Code Ratio: ${(fileTreeMetrics.testToCodeRatio * 100).toFixed(1)}%
- Build Complexity (0-10): ${fileTreeMetrics.buildComplexity.toFixed(1)}
- Config Files: ${fileTreeMetrics.configFiles.join(", ") || "None"}
- Lock Files: ${fileTreeMetrics.lockFiles.join(", ") || "None"}
`;
    }

    const prompt = `You are a code complexity analyzer. Analyze this repository and respond ONLY with valid JSON.

README (first 5000 chars):
${readme.slice(0, 5000)}

${fileTreeSummary}

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

SCORING GUIDELINES:

architecture_score (0-10):
- Use the actual file metrics provided above
- 1-3: Simple (< 50 files, depth ≤ 3, single package)
- 4-6: Medium (50-200 files, depth 4-5, modular structure)
- 7-8: Complex (200-500 files, depth 6-7, layered architecture)
- 9-10: Very Complex (> 500 files, depth > 7, microservices/monorepo)

abstraction_level (0-10):
- 1-3: Procedural, direct logic
- 4-6: OOP with classes and interfaces
- 7-8: Advanced patterns (dependency injection, factories, decorators)
- 9-10: Meta-programming, reflection, code generation

domain_difficulty (0-10):
- 1-3: Simple domains (CRUD, static sites, simple utilities)
- 4-6: Medium domains (web frameworks, API clients, data processing)
- 7-8: Complex domains (databases, compilers, networking, ML frameworks)
- 9-10: Expert domains (OS kernels, distributed systems, cryptography)

setup_complexity (0-10):
- Use build_complexity metric from file tree
- 1-3: Simple (npm install && npm start, single command)
- 4-6: Medium (multiple config files, environment setup)
- 7-8: Complex (Docker, multiple services, database setup)
- 9-10: Very Complex (Kubernetes, microservices, complex orchestration)

recommended_experience:
- "beginner": Simple architecture (1-3), low abstraction (1-4), simple domain (1-3), easy setup (1-3)
- "advanced": Complex architecture (8-10), high abstraction (8-10), hard domain (8-10), complex setup (7-10)
- "intermediate": Everything else

IMPORTANT: Base your scores primarily on the FILE TREE METRICS provided, not just the README description.`;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
      maxOutputTokens: 500,
      temperature: 0.0,
    } as any);

    const text = response?.text || "";
    const cleaned =
      text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim()
        .match(/\{[\s\S]*\}/)?.[0] || "{}";

    let parsed: any = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      parsed = {};
    }

    // Validate and provide intelligent defaults based on file metrics
    let defaultArchScore = 5;
    let defaultSetupScore = 5;
    let defaultLevel = "intermediate";

    if (fileTreeMetrics) {
      // Calculate defaults from actual metrics
      const files = fileTreeMetrics.totalFiles;
      const depth = fileTreeMetrics.maxDepth;
      const buildComplexity = fileTreeMetrics.buildComplexity;

      // Architecture score from file metrics
      if (files < 50 && depth <= 3) defaultArchScore = 2;
      else if (files < 200 && depth <= 5) defaultArchScore = 5;
      else if (files < 500 && depth <= 7) defaultArchScore = 7;
      else defaultArchScore = 9;

      // Setup score from build complexity
      defaultSetupScore = Math.min(10, buildComplexity);

      // Recommended level
      if (files < 100 && depth <= 4 && buildComplexity < 4) {
        defaultLevel = "beginner";
      } else if (files > 500 || depth > 7 || buildComplexity > 7) {
        defaultLevel = "advanced";
      }
    }

    return {
      architecture_score: clamp(
        parsed.architecture_score ?? defaultArchScore,
        0,
        10
      ),
      abstraction_level: clamp(parsed.abstraction_level ?? 5, 0, 10),
      domain_difficulty: clamp(parsed.domain_difficulty ?? 5, 0, 10),
      code_patterns: Array.isArray(parsed.code_patterns)
        ? parsed.code_patterns.slice(0, 10)
        : [],
      setup_complexity: clamp(
        parsed.setup_complexity ?? defaultSetupScore,
        0,
        10
      ),
      recommended_experience: ["beginner", "intermediate", "advanced"].includes(
        parsed.recommended_experience
      )
        ? parsed.recommended_experience
        : defaultLevel,
    };
  } catch (error) {
    console.error("AI complexity analysis failed:", error);

    // Return intelligent defaults based on file metrics
    let defaultArchScore = 5;
    let defaultSetupScore = 5;
    let defaultLevel = "intermediate";

    if (fileTreeMetrics) {
      const files = fileTreeMetrics.totalFiles;
      const depth = fileTreeMetrics.maxDepth;
      const buildComplexity = fileTreeMetrics.buildComplexity;

      if (files < 50 && depth <= 3) {
        defaultArchScore = 2;
        defaultLevel = "beginner";
      } else if (files < 200 && depth <= 5) {
        defaultArchScore = 5;
      } else if (files < 500 && depth <= 7) {
        defaultArchScore = 7;
      } else {
        defaultArchScore = 9;
        defaultLevel = "advanced";
      }

      defaultSetupScore = Math.min(10, buildComplexity);
    }

    return {
      architecture_score: defaultArchScore,
      abstraction_level: 5,
      domain_difficulty: 5,
      code_patterns: [],
      setup_complexity: defaultSetupScore,
      recommended_experience: defaultLevel,
    };
  }
}
