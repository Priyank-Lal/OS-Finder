import { Project } from "../models/project.model.js";
import { safeGithubQuery } from "../services/github.query.js";
import { mapGithubRepoToProject } from "../services/github.mapper.js";
import { filterGithubRepos } from "../services/github.filter.js";
import { Request, Response } from "express";


export const fetchRepos = async (lang: string, minStars: number = 100) => {
  try {
    let allFiltered: any[] = [];
    let cursor: string | null = null;
    let hasNextPage = true;
    let loopCount = 0;
    const MAX_LOOPS = 40; // Fetch up to 40 pages (40 * 25 = 1000 max potential)

    console.log(`Starting fetch for ${lang} (minStars: ${minStars})...`);

    // Target 750 repos (leaving buffer for filtering)
    while (hasNextPage && loopCount < MAX_LOOPS && allFiltered.length < 750) {
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
      
      // Rate limiting: Pause for 25s between every page to be very gentle
      await new Promise(r => setTimeout(r, 25000));

      // Long Pause: Pause for 90s every 4 loops (approx 100 repos)
      // This ensures we never hit the complexity limit
      if (loopCount % 4 === 0) {
        console.log(`\n--- Pausing for 90s to cool down GitHub API (Loop ${loopCount}) ---\n`);
        await new Promise(r => setTimeout(r, 90000));
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

    const andConditions: any[] = [];

    if (lang) filter.language = { $regex: new RegExp(`^${lang}$`, "i") };

    if (topic) filter.topics = { $regex: new RegExp(String(topic), "i") };

    // Category Filter (Checks both AI categories AND GitHub topics)
    if (category) {
      const catRegex = new RegExp(String(category), "i");
      andConditions.push({
        $or: [
          { categories: catRegex },
          { topics: catRegex }
        ]
      });
    }

    if (req.query.level) {
      filter.recommended_level = { $regex: new RegExp(String(req.query.level), "i") };
    }

    // Search Filter
    if (req.query.search) {
      const searchRegex = new RegExp(String(req.query.search), "i");
      andConditions.push({
        $or: [
          { repo_name: searchRegex },
          { description: searchRegex },
          { topics: searchRegex },
          { summary: searchRegex },
        ]
      });
    }

    // Apply AND conditions if any
    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    // Advanced Filters
    if (req.query.minStars) {
      filter.stars = { $gte: parseInt(String(req.query.minStars)) };
    }

    if (req.query.maxIssues) {
      filter["issue_data.total_open"] = { $lte: parseInt(String(req.query.maxIssues)) };
    }

    if (req.query.minScore) {
      filter.overall_score = { $gte: parseInt(String(req.query.minScore)) };
    }

    if (req.query.prMergeTime) {
      const time = String(req.query.prMergeTime);
      if (time === "fast") {
        filter["activity.avg_pr_merge_hours"] = { $lt: 24 };
      } else if (time === "medium") {
        filter["activity.avg_pr_merge_hours"] = { $gte: 24, $lte: 72 };
      } else if (time === "slow") {
        filter["activity.avg_pr_merge_hours"] = { $gt: 72 };
      }
    }

    // Exclude rejected repos
    filter.status = { $ne: "rejected" };

    const skip = (safePage - 1) * safeLimit;

    // Sorting Logic
    let sort: any = { overall_score: -1 }; // Default sort
    const sortBy = String(req.query.sortBy || "relevance");

    if (sortBy === "stars") {
      sort = { stars: -1 };
    } else if (sortBy === "friendliness") {
      sort = { beginner_friendliness: -1 };
    } else if (sortBy === "maintenance") {
      sort = { "activity.maintainer_activity_score": -1 };
    } else if (sortBy === "complexity") {
      sort = { technical_complexity: 1 }; // Ascending for complexity (lower is better for beginners)
    } else if (sortBy === "relevance") {
      sort = { overall_score: -1 };
    }

    const repos = await Project.find(filter)
      .sort(sort)
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

