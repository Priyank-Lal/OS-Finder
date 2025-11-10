import { Router } from "express";
import { getUserRepos } from "../services/github.service";

const router = Router();

router.get("/user/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const data = await getUserRepos(username);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export { router };