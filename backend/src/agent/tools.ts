import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Project } from "../models/project.model.js";

export const searchRepos = tool(
  async ({ 
    query, 
    language, 
    minScore, 
    limit = 5,
    categories,
    topics,
    recommendedLevel 
  }: { 
    query: string; 
    language?: string; 
    minScore?: number; 
    limit?: number;
    categories?: string[];
    topics?: string[];
    recommendedLevel?: 'beginner' | 'intermediate' | 'advanced';
  }) => {
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

      // Filter by categories
      if (categories && categories.length > 0) {
        filter.categories = { $in: categories.map(c => new RegExp(c, "i")) };
      }

      // Filter by topics
      if (topics && topics.length > 0) {
        filter.topics = { $in: topics.map(t => new RegExp(t, "i")) };
      }

      // Filter by recommended level
      if (recommendedLevel) {
        filter.recommended_level = { $regex: new RegExp(`^${recommendedLevel}$`, "i") };
      }

      const repos = await Project.find(filter)
        .sort({ overall_score: -1 })
        .limit(limit)
        .select("repoId repo_name description language overall_score stars summary categories topics recommended_level");

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
        categories: r.categories || [],
        topics: r.topics || [],
        recommendedLevel: r.recommended_level || 'intermediate'
      })), null, 2);
    } catch (error) {
      return `Error searching repositories: ${error}`;
    }
  },
  {
    name: "search_repos",
    description: "Search for open source repositories based on various criteria including language, score, categories, topics, and difficulty level. Returns a list of matching repositories with their details.",
    schema: z.object({
      query: z.string().describe("Search query to match against repo name, description, summary, or topics"),
      language: z.string().optional().describe("Programming language filter (e.g., 'JavaScript', 'Python')"),
      minScore: z.number().optional().describe("Minimum OS-Finder score (0-100)"),
      limit: z.number().optional().default(5).describe("Maximum number of results to return"),
      categories: z.array(z.string()).optional().describe("Filter by categories (e.g., ['web', 'mobile', 'cli'])"),
      topics: z.array(z.string()).optional().describe("Filter by topics/tags (e.g., ['react', 'machine-learning'])"),
      recommendedLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional().describe("Filter by recommended difficulty level for contributors"),
    }),
  }
);

export const getRepoDetails = tool(
  async ({ repoIds, name }: { repoIds?: string[]; name?: string }) => {
    try {
      let repos;
      
      // Try repoIds first
      if (repoIds && repoIds.length > 0) {
        repos = await Project.find({ repoId: { $in: repoIds } })
          .select("-__v -_id -file_tree_metrics -community_health -issue_samples");
      }
      
      // Fallback to name-based search if no repos found or no repoIds provided
      if ((!repos || repos.length === 0) && name) {
        repos = await Project.find({ 
          repo_name: { $regex: new RegExp(name, "i") } 
        })
          .sort({ overall_score: -1 })
          .limit(1)
          .select("-__v -_id -file_tree_metrics -community_health -issue_samples");
      }

      if (!repos || repos.length === 0) {
        return name 
          ? `No repository found with name "${name}". Try searching first with search_repos.`
          : "No details found for the provided IDs.";
      }

      return JSON.stringify(repos, null, 2);
    } catch (error) {
      return `Error fetching details: ${error}`;
    }
  },
  {
    name: "get_repo_details",
    description: "Get FULL details for specific repositories. Can lookup by repository IDs (from search results) OR by repository name. Returns comprehensive data including scores, issues, activity metrics, and AI analysis.",
    schema: z.object({
      repoIds: z.array(z.string()).optional().describe("List of repository IDs to fetch details for (from search_repos results)"),
      name: z.string().optional().describe("Repository name to search for (fallback if repoIds not available, e.g., 'react', 'tensorflow')"),
    }),
  }
);
