import { callAI } from "../gemini.client.js";
import { tryParseJSON } from "../gemini.utils.js";
import { Label, LabelMapping } from "../../models/project.interface.js";

export async function generateLabelAnalysis(
  labels: Label[],
  issueSamples: any[]
): Promise<LabelMapping> {
  if (!labels || labels.length === 0) {
    return { beginner: [], bug: [], help_wanted: [], enhancement: [] };
  }

  const labelList = labels.map((l) => `${l.name} (${l.description || ""})`).join("\n");
  
  const sampleList = issueSamples
    .slice(0, 5)
    .map((i) => `- "${i.title}" [Labels: ${i.labels.nodes.map((n: any) => n.name).join(", ")}]`)
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
    2. "bug": Bug, defect, error, confirmed bug, etc.
    3. "help_wanted": Help wanted, contributions welcome, etc.
    4. "enhancement": Feature, enhancement, new feature, etc.
    
    OUTPUT SCHEMA (JSON ONLY):
    {
      "beginner": ["label1", "label2"],
      "bug": ["label1"],
      "help_wanted": ["label1"],
      "enhancement": ["label1"]
    }
    
    RULES:
    - Only include labels that ACTUALLY EXIST in the provided list.
    - Be generous with "beginner" labels (e.g. "E-easy", "difficulty: starter").
    - If no labels match a category, return an empty array.
  `;

  const response = await callAI(prompt, {
    model: "gemini-2.0-flash-lite",
    temperature: 0.0,
  });

  if (!response) {
    return { beginner: [], bug: [], help_wanted: [], enhancement: [] };
  }

  return tryParseJSON<LabelMapping>(response, {
    beginner: [],
    bug: [],
    help_wanted: [],
    enhancement: [],
  });
}
