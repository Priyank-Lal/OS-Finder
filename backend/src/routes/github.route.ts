import { Request, Response, Router } from "express";
import { fetchRepos } from "../controllers/github.controller";
import { Project } from "../models/project.model";

const router = Router();

// Endpoint for searching projects: GET /api/github/search?lang=javascript
// router.get("/search", async (req, res) => {
//   const { lang, minStars } = req.query;
//   const language = lang as string;
//   const stars = parseInt(minStars as string) || 100;

//   if (!language) {
//     return res
//       .status(400)
//       .send({ message: "Language parameter (lang) is required." });
//   }
//   console.log("Request Recieved");

//   try {
//     await fetchAndProcessRepos(language, stars)

//     const finalResults = await Project.find({
//       language: language,
//       "health_metrics.responsiveness_score": { $exists: true }, // Ensure metric field exists
//     })
//       .sort({ "health_metrics.responsiveness_score": 1 }) // 1 = Ascending. Low 'Last Activity Days' is GOOD!
//       .limit(10)
//       .exec();

//     console.log(finalResults);

//     return res.json({
//       message: `Successfully fetched and updated ${finalResults.length} repositories with dummy metrics.`,
//       data: finalResults,
//     });
//   } catch (error) {
//     return res.status(500).send({
//       message:
//         (error as Error).message || "Internal server error during search.",
//     });
//   }
// });

router.get("/fetch", async (req: Request, res: Response) => {
  const { lang, minStars } = req.query;
  const language = lang as string;
    const stars = parseInt(minStars as string) || 100;
  const data = await fetchRepos(language, stars);

  console.log(data);

  return res.json({
    message: "Check DB",
  });
});

export { router };
