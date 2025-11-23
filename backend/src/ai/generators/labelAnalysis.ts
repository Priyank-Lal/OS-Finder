import { callAIStructured } from "../structured.client.js";
import { LabelMappingSchema } from "../schemas.js";
import { Label, LabelMapping } from "../../models/project.interface.js";

export async function generateLabelAnalysis(
  labels: Label[],
  issueSamples: any[]
): Promise<LabelMapping> {
  if (!labels || labels.length === 0) {
    return {
      beginner: { labels: [], count: 0 },
      bug: { labels: [], count: 0 },
      help_wanted: { labels: [], count: 0 },
      enhancement: { labels: [], count: 0 },
      documentation: { labels: [], count: 0 },
      testing: { labels: [], count: 0 },
      performance: { labels: [], count: 0 },
      security: { labels: [], count: 0 },
    };
  }

  const labelList = labels.map((l) => l.name).join("\n");
  
  // Handle both GraphQL format (labels.nodes) and mapped format (labels array)
  const sampleList = issueSamples
    .slice(0, 5)
    .filter((i) => i && i.title)
    .map((i) => {
      let labelNames: string[] = [];
      if (Array.isArray(i.labels)) {
        labelNames = i.labels;
      } else if (i.labels?.nodes) {
        labelNames = i.labels.nodes.map((n: any) => n.name);
      }
      return `- "${i.title}" [Labels: ${labelNames.join(", ") || "none"}]`;
    })
    .join("\n");

  const prompt = `
    Analyze this repository's issue labeling system.
    
    GOAL: Map the repo's custom labels to standard categories.
    
    ALL LABELS:
    ${labelList}
    
    RECENT ISSUE SAMPLES (Context):
    ${sampleList}
    
    TASK: Identify which labels correspond to:
    1. "beginner": Easy, starter, good first issue, up for grabs, etc.
    2. "bug": Bug, defect, error, confirmed bug, regression, etc.
    3. "help_wanted": Help wanted, contributions welcome, etc.
    4. "enhancement": Feature, enhancement, new feature, improvement, etc.
    5. "documentation": Docs, documentation, readme, wiki, etc.
    6. "testing": Test, testing, unit test, integration test, etc.
    7. "performance": Performance, optimization, speed, memory, etc.
    8. "security": Security, vulnerability, CVE, exploit, etc.
    
    OUTPUT SCHEMA (JSON ONLY):
    {
      "beginner": ["label1", "label2"],
      "bug": ["label1"],
      "help_wanted": ["label1"],
      "enhancement": ["label1"],
      "documentation": ["label1"],
      "testing": ["label1"],
      "performance": ["label1"],
      "security": ["label1"]
    }
    
    RULES:
    - Only include labels that ACTUALLY EXIST in the provided list.
    - Be generous with "beginner" labels (e.g. "E-easy", "difficulty: starter", "good first issue").
    - If no labels match a category, return an empty array.
    - Return ONLY the JSON object, nothing else.
  `;

  const result = await callAIStructured(prompt, LabelMappingSchema, {
    model: "gemini-2.5-flash-lite",
    temperature: 0.0,
    task: "label_analysis",
  });

  if (!result) {
    return {
      beginner: { labels: [], count: 0 },
      bug: { labels: [], count: 0 },
      help_wanted: { labels: [], count: 0 },
      enhancement: { labels: [], count: 0 },
      documentation: { labels: [], count: 0 },
      testing: { labels: [], count: 0 },
      performance: { labels: [], count: 0 },
      security: { labels: [], count: 0 },
    };
  }

  // Convert to CategoryData format (count will be added later in summarizer)
  return {
    beginner: { labels: result.beginner || [], count: 0 },
    bug: { labels: result.bug || [], count: 0 },
    help_wanted: { labels: result.help_wanted || [], count: 0 },
    enhancement: { labels: result.enhancement || [], count: 0 },
    documentation: { labels: result.documentation || [], count: 0 },
    testing: { labels: result.testing || [], count: 0 },
    performance: { labels: result.performance || [], count: 0 },
    security: { labels: result.security || [], count: 0 },
  };
}
