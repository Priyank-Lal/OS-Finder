import cron from "node-cron";
import { fetchRepos } from "../controllers/github.controller";
import { Project } from "../models/project.model";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

cron.schedule("0 */12 * * *", async () => {
  const langs = await Project.aggregate([
    { $group: { _id: "$language", count: { $sum: 1 } } },
    { $match: { count: { $gte: 5 } } },
    { $project: { _id: 0, language: "$_id" } },
  ]);

  const languages = langs.map((l) => l.language);

  if (languages.length === 0) {
    console.log("No languages found to update.");
    return;
  }

  console.log("Cron job started:", new Date().toISOString());
  try {
    for (const lang of languages) {
      try {
        await fetchRepos(lang, 100);
        console.log(`Updated repos for ${lang}`);
      } catch (error) {
        console.error(`Failed to fetch for ${lang}:`, error);
      }
      await sleep(10000);
    }
  } catch (err) {
    console.error("Cron job crashed:", err);
  }

  console.log("Cron job finished:", new Date().toISOString());
});
