import { Request, Response, Router } from "express";
import {
  fetchRepos,
  getRepoById,
  getReposFromDb,
} from "../controllers/github.controller.js";
import { Project } from "../models/project.model.js";
import { getPopularTopics } from "../controllers/topics.controller.js";

const router = Router();

router.get("/fetch", async (req: Request, res: Response) => {
  const { lang, minStars } = req.query;
  const language = lang as string;
  const stars = parseInt(minStars as string) || 100;
  const data = await fetchRepos(language, stars);

  return res.json({
    message: "Check DB",
    length: data.length
  });
});

router.get("/repos", getReposFromDb);

router.get("/topics/popular", getPopularTopics);

router.get("/repo/:id", getRepoById);
export { router };
