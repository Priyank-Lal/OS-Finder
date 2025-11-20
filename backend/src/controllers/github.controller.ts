import { Project } from "../models/project.model";
import { safeGithubQuery } from "../services/github.query";
import { mapGithubRepoToProject } from "../services/github.mapper";
import { filterGithubRepos } from "../services/github.filter";
import { Request, Response } from "express";


export const fetchRepos = async (lang: string, minStars: number = 100) => {
  try {
    let allFiltered: any[] = [];
    let cursor: string | null = null;
    let hasNextPage = true;
    let loopCount = 0;
    const MAX_LOOPS = 15;

    console.log(`Starting fetch for ${lang} (minStars: ${minStars})...`);

    while (hasNextPage && loopCount < MAX_LOOPS && allFiltered.length < 80) {
      loopCount++;
      console.log(`--- Fetch Loop ${loopCount} (Cursor: ${cursor}) ---`);

      const response = await safeGithubQuery({ lang, minStars, cursor });
      
      if (!response || !response.search) {
        console.error("Invalid response structure from GitHub");
        break;
      }

      const nodes = response.search.nodes || [];
      const pageInfo = response.search.pageInfo;

      console.log(`Fetched ${nodes.length} raw repos.`);

      if (nodes.length === 0) {
        break;
      }

      const mapped = await mapGithubRepoToProject(response, lang);
      const filtered = filterGithubRepos(mapped);

      console.log(`Kept ${filtered.length} repos from this batch.`);

      // Save current batch
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
        allFiltered = [...allFiltered, ...filtered];
      }

      // Setup next loop
      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;

      if (!hasNextPage) {
        console.log("No more pages from GitHub.");
      }
      
      // Small delay to be nice to API
      await new Promise(r => setTimeout(r, 2000));

      // Rate limiting: Pause for 60s every 2 loops to prevent 502s
      if (loopCount % 2 === 0) {
        console.log(`\n--- Pausing for 60s to cool down GitHub API (Loop ${loopCount}) ---\n`);
        await new Promise(r => setTimeout(r, 60000));
      }
    }

    console.log(`Total repos fetched and saved: ${allFiltered.length}`);
    return allFiltered;
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

    // Exclude rejected repos
    filter.status = { $ne: "rejected" };

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

