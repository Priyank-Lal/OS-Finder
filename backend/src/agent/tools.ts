import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Project } from "../models/project.model.js";

export const searchRepos = tool(
  async ({ query, language, minScore, limit = 5 }: { query: string; language?: string; minScore?: number; limit?: number }) => {
    try {
      const filter: any = {};
      
      if (query) {
        filter.$or = [
          { repo_name: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
          { summary: { $regex: query, $options: "i" } },
          { topics: { $in: [new RegExp(query, "i")] } }
        ];
      }

      if (language) {
        filter.language = { $regex: new RegExp(`^${language}$`, "i") };
      }

      if (minScore) {
        filter.overall_score = { $gte: minScore };
      }

      const repos = await Project.find(filter)
        .sort({ overall_score: -1 })
        .limit(limit)
        .select("repoId repo_name description language overall_score stars summary categories");

      if (!repos.length) {
        return "No repositories found matching your criteria.";
      }

      return JSON.stringify(repos.map(r => ({
        id: r.repoId,
        name: r.repo_name,
        description: r.description,
        language: r.language,
        score: r.overall_score,
        stars: r.stars,
        summary: r.summary || r.description,
        categories: r.categories || []
      })), null, 2);
    } catch (error) {
      return `Error searching repositories: ${error}`;
    }
  },
  {
    name: "search_repos",
    description: "Search for repositories. Returns a summary list (ID, name, score). Use this to find candidates before getting details.",
    schema: z.object({
      query: z.string().describe("Keywords to search for"),
      language: z.string().optional().describe("Programming language filter"),
      minScore: z.number().optional().describe("Minimum overall score (0-100)"),
      limit: z.number().optional().describe("Max results (default: 5)"),
    }),
  }
);

export const getRepoDetails = tool(
  async ({ repoIds }: { repoIds: string[] }) => {
    try {
      const repos = await Project.find({ repoId: { $in: repoIds } })
        .select("-__v -_id -file_tree_metrics -community_health -issue_samples"); // Exclude internal fields and unnecessary data

      if (!repos.length) {
        return "No details found for the provided IDs.";
      }

      return JSON.stringify(repos, null, 2);
    } catch (error) {
      return `Error fetching details: ${error}`;
    }
  },
  {
    name: "get_repo_details",
    description: "Get FULL details for specific repositories by their IDs. Use this after search_repos to analyze specific projects. Returns comprehensive data including scores, issues, activity metrics, and AI analysis.",
    schema: z.object({
      repoIds: z.array(z.string()).describe("List of repository IDs to fetch details for"),
    }),
  }
);
