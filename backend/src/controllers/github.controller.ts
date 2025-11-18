import { Project } from "../models/project.model";
import { safeGithubQuery } from "../services/github.query";
import { mapGithubRepoToProject } from "../services/github.mapper";
import { filterGithubRepos } from "../services/github.filter";
import { Request, Response } from "express";


export const fetchRepos = async (lang: string, minStars: number = 100) => {
  try {
    const response = await safeGithubQuery({ lang, minStars });

    const mapped = await mapGithubRepoToProject(response, lang);
    const filtered = filterGithubRepos(mapped);

    filtered.forEach((r) => {
      if (JSON.stringify(r).includes('"$')) {
        console.log("⚠ Repo contains forbidden $ key:", r.repo_name);
      } else {
        console.log(r.repo_name, "is Good to go");
      }
    });

    if (filtered.length > 0) {
      await Project.bulkWrite(
        filtered.map((repo: any) => ({
          updateOne: {
            filter: { repoId: repo.repoId },
            update: { $set: repo },
            upsert: true,
          },
        })),
        { ordered: false }
      );
    }

    return filtered;
  } catch (err) {
    console.error("GitHub fetch failed:", err);
    throw err;
  }
};

export const getReposFromDb = async (req: Request, res: Response) => {
  try {
    const { lang, topic, category, limit = 20, page = 1 } = req.query;

    const safeLimit = Math.min(Math.max(parseInt(String(limit)) || 20, 1), 50);
    const safePage = Math.max(parseInt(String(page)) || 1, 1);

    const filter: any = {};

    if (lang) filter.language = { $regex: new RegExp(`^${lang}$`, "i") };

    if (topic) filter.topics = { $regex: new RegExp(String(topic), "i") };

    if (category)
      filter.ai_categories = { $regex: new RegExp(String(category), "i") };

    const skip = (safePage - 1) * safeLimit;

    const repos = await Project.find(filter)
      .skip(skip)
      .limit(safeLimit)
      .lean()
      .exec();

    return res.json({
      page: safePage,
      limit: safeLimit,
      count: repos.length,
      data: repos,
    });
  } catch (err: any) {
    console.error("DB fetch failed:", err);
    return res.status(500).json({
      message: "Failed to fetch repos",
      error: err?.message || String(err),
    });
  }
};

export const getRepoById = async (req: Request, res: Response) => {
  try {
    const repo = await Project.findOne({ repoId: req.params.id }).lean();

    if (!repo) {
      return res.status(404).json({ message: "Repo not found" });
    }

    return res.json(repo);
  } catch (err: any) {
    console.error("Fetch-by-ID failed:", err);
    return res.status(500).json({
      message: "Failed to fetch repo",
      error: err?.message || String(err),
    });
  }
};
