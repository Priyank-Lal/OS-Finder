import { GoogleGenAI } from "@google/genai";
import { clamp } from "./scoring.utils";
import { _config } from "../config/config";

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