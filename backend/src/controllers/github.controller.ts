import { Document } from "mongoose";
import { Octokit } from "@octokit/rest";
import { Project, IProject } from "../models/project.model";
import { _config } from "../config/config";

const octokit = new Octokit({
  auth: _config.GITHUB_TOKEN,
  userAgent: "os-finder",
});

const calculateFastMetrics = (repo: any): IProject["health_metrics"] => {

  const lastPushedDate = new Date(repo.pushed_at);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - lastPushedDate.getTime());

  const lastActivityDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const issuesCount = repo.open_issues_count > 0 ? repo.open_issues_count : 1;
  const starsPerIssueRatio = repo.stargazers_count / issuesCount;


  const createdAt = new Date(repo.created_at);
  const projectAgeDays = Math.ceil(
    Math.abs(today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    last_calculated: new Date(),
    responsiveness_score: lastActivityDays, // Value: Lower is better (fewer days since last push)
    activity_score: parseFloat(starsPerIssueRatio.toFixed(2)), // Value: Higher is better
    stale_issue_ratio: 0, 
  };
};


export const fetchAndProcessRepos = async (
  language: string,
  minStars: number = 100
): Promise<(IProject & Document)[]> => {
  const searchQuery = `language:${language} stars:>${minStars} fork:false`;
  let githubRepos: any[] = [];

  console.log("Fetching and processing repos");

  try {
    const response = await octokit.search.repos({
      q: searchQuery,
      sort: "stars",
      order: "desc",
      per_page: 10,
    });
    githubRepos = response.data.items;
  } catch (error) {
    console.log(error);

    throw new Error(
      "GitHub search failed. Check GITHUB_TOKEN and API rate limits."
    );
  }

  const processedProjects: (IProject & Document)[] = [];

  console.log("processing repos");

  for (const repo of githubRepos) {
    try {
      const health_metrics = calculateFastMetrics(repo);

      const projectData = {
        githubId: repo.id,
        owner: repo.owner.login,
        repo_name: repo.name,
        description: repo.description || "No description provided.",
        language: repo.language,
        topics: repo.topics || [],

        health_metrics: health_metrics,

        issue_data: {
          total_open_issues: repo.open_issues_count,
          beginner_issues_count: 0,
        },
      };
      console.log("Updating Repos in DB");

      const updatedProject = await Project.findOneAndUpdate(
        { githubId: repo.id },
        { $set: projectData },
        { upsert: true, new: true, runValidators: true }
      );
      processedProjects.push(updatedProject as IProject & Document);
    } catch (error) {
      console.error(`Error processing repo ${repo.name}:`, error);
    }
  }
  console.log("Process completed");

  return processedProjects;
};
