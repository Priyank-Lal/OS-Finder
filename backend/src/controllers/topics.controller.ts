import { Request, Response } from "express";
import { Project } from "../models/project.model";

// GET /topics/popular?lang=javascript
export const getPopularTopics = async (req: Request, res: Response) => {
  try {
    const lang = (req.query.lang as string) || "";

    const match: any = {};
    if (lang) match.language = { $regex: new RegExp(lang, "i") };

    const results = await Project.aggregate([
      { $match: match },
      { $unwind: "$topics" },
      {
        $group: {
          _id: "$topics",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]);

    return res.status(200).json({ topics: results });
  } catch (err: any) {
    console.error("Popular topics error", err);
    return res.status(500).json({ error: "Failed to fetch topics" });
  }
};
