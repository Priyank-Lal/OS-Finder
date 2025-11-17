import { Project } from "../models/project.model";
import { _config } from "../config/config";
import { graphql } from "@octokit/graphql";
import { Request, Response } from "express";
import { computeScores } from "../utils/scoring";
import { safeGithubQuery } from "../services/github.query";
import { mapGithubRepoToProject } from "../services/github.mapper";
import { filterGithubRepos } from "../services/github.filter";

export const fetchRepos = async (lang: string, minStars: number = 100) => {
  try {
    const response = await safeGithubQuery({
      lang,
      minStars,
    });
    const mappedRepos = mapGithubRepoToProject(response, lang);
    const filteredRepos = filterGithubRepos(mappedRepos);

    if (filteredRepos.length > 0) {
      await Project.bulkWrite(
        filteredRepos.map((repo: any) => ({
          updateOne: {
            filter: { repoId: repo.repoId },
            update: {
              $set: repo,
            },
            upsert: true,
          },
        }))
      );
    }

    return filteredRepos;
  } catch (error: any) {
    console.error("GitHub GraphQL fetch failed:", error);
    throw error;
  }
};

export const getReposFromDb = async (req: Request, res: Response) => {
  try {
    const { lang, limit = 20, page = 1, topic, level, category } = req.query;

    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 50));
    const safePage = Math.max(1, Number(page) || 1);

    const allowedLevels = ["beginner", "intermediate", "advanced"];
    const selectedLevelRaw =
      typeof level === "string" ? level.toLowerCase() : null;
    const selectedLevel =
      selectedLevelRaw && allowedLevels.includes(selectedLevelRaw)
        ? selectedLevelRaw
        : null;

    // Build filter
    const filter: any = {};

    if (lang) {
      filter.language = { $regex: new RegExp(`^${lang}$`, "i") };
    }

    if (topic) {
      filter.topics = { $regex: new RegExp(topic as string, "i") };
    }

    if (category) {
      filter.$or = [
        { ai_categories: { $regex: new RegExp(category as string, "i") } },
        { topics: { $regex: new RegExp(category as string, "i") } },
      ];
    }

    const skip = (safePage - 1) * safeLimit;

    // Fetch repos
    const repos = await Project.find(filter)
      .skip(skip)
      .limit(safeLimit)
      .lean()
      .exec();

    if (!repos || repos.length === 0) {
      return res.json({
        count: 0,
        page: safePage,
        limit: safeLimit,
        data: [],
      });
    }

    // Compute level-specific scores
    const scored = repos.map((repo: any) => {
      let levelScore = 0;

      if (!selectedLevel) {
        // No level filter: use overall quality
        levelScore =
          repo.accessibility * 0.4 +
          repo.maintenance * 0.3 +
          repo.friendliness * 0.3;
      } else if (selectedLevel === "beginner") {
        // Beginner: High friendliness + Low complexity + Good accessibility
        levelScore =
          repo.friendliness * 0.5 +
          (1 - repo.complexity) * 0.3 +
          repo.accessibility * 0.2;
      } else if (selectedLevel === "intermediate") {
        // Intermediate: Balanced
        levelScore =
          repo.maintenance * 0.4 +
          repo.accessibility * 0.3 +
          repo.friendliness * 0.15 +
          repo.complexity * 0.15;
      } else if (selectedLevel === "advanced") {
        // Advanced: High complexity + Good maintenance
        levelScore =
          repo.complexity * 0.5 +
          repo.maintenance * 0.4 +
          repo.accessibility * 0.1;
      }

      // Determine display level
      let displayLevel = "intermediate";
      if (repo.friendliness >= 0.65 && repo.complexity <= 0.35) {
        displayLevel = "beginner";
      } else if (repo.complexity >= 0.65 || repo.friendliness <= 0.3) {
        displayLevel = "advanced";
      }

      return {
        ...repo,
        level_score: levelScore,
        difficulty_level: displayLevel,
      };
    });

    // Sort by level_score descending
    scored.sort((a, b) => b.level_score - a.level_score);

    return res.json({
      count: scored.length,
      page: safePage,
      limit: safeLimit,
      data: scored,
    });
  } catch (error) {
    console.error("Error fetching repos from DB:", error);
    return res.status(500).json({
      message: "Failed to fetch repos",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getRepoById = async (req: Request, res: Response) => {
  try {
    const repo = await Project.findOne({ repoId: req.params.id }).lean();

    if (!repo) {
      return res.status(404).json({ message: "Repo not found" });
    }

    // Add difficulty level to response
    let displayLevel = "intermediate";
    if (repo.friendliness >= 0.65 && repo.complexity <= 0.35) {
      displayLevel = "beginner";
    } else if (repo.complexity >= 0.65 || repo.friendliness <= 0.3) {
      displayLevel = "advanced";
    }

    return res.json({
      ...repo,
      difficulty_level: displayLevel,
    });
  } catch (err) {
    console.error("Error fetching repo by ID:", err);
    return res.status(500).json({
      message: "Failed to fetch repo",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
