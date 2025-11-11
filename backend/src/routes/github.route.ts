import { Router } from "express";
import { fetchAndProcessRepos } from "../controllers/github.controller";

const router = Router();


// Endpoint for searching projects: GET /api/github/search?lang=javascript
router.get("/search", async (req, res) => {
  const { lang, minStars } = req.query;
  const language = lang as string;
  const stars = parseInt(minStars as string) || 100;

  if (!language) {
    return res
      .status(400)
      .send({ message: "Language parameter (lang) is required." });
  }
  console.log("Request Recieved");
  

  try {
    const updatedRepos = await fetchAndProcessRepos(language, stars);

    // Success response
    return res.json({
      message: `Successfully fetched and updated ${updatedRepos.length} repositories with dummy metrics.`,
      data: updatedRepos,
    });
  } catch (error) {
    return res.status(500).send({
      message:
        (error as Error).message || "Internal server error during search.",
    });
  }
});


export { router };
