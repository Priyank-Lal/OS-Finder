import axios from "axios";
import { IProject, Project } from "../models/project.model.js";
import { Document } from "mongoose";

const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const githubApi = axios.create({
  baseURL: GITHUB_API_BASE_URL,
  headers: {
    Authorization: `token ${process.env.GITHUB_TOKEN}`,
  },
});

const calculateDummyMetrics = (): IProject["health_metrics"] => {
  return {
    last_calculated: new Date(),
    responsiveness_score: parseFloat((Math.random() * 48 + 2).toFixed(2)), // 2 to 50 hours
    activity_score: Math.floor(Math.random() * 100), // 0 to 100 contributors
    stale_issue_ratio: parseFloat((Math.random() * 0.4).toFixed(2)), // 0 to 40%
  };
};

export const fetchAndProcessRepos = async (
  language: string,
  minStars: number = 100
): Promise<(IProject & Document)[]> => {
  const searchQuery = `language:${language} stars:>${minStars} fork:false`;
  let githubRepos: any[] = [];

  try {
    const response = await githubApi.get("/search/repositories", {
      params: {
        q: searchQuery,
        sort: "stars",
        order: "desc",
        per_page: 10, 
      },
    });
    githubRepos = response.data.items;
  } catch (error) {
    throw new Error(
      "GitHub search failed. Check GITHUB_TOKEN and API rate limits."
    );
  }

  const processedProjects: (IProject & Document)[] = [];

  for (const repo of githubRepos) {
    try {
      const health_metrics = calculateDummyMetrics();

      const projectData = {
        github_id: repo.id,
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

      const updatedProject = await Project.findOneAndUpdate(
        { github_id: repo.id },
        { $set: projectData },
        { upsert: true, new: true, runValidators: true }
      );

      processedProjects.push(updatedProject as IProject & Document);
    } catch (error) {
      console.error(`Error processing repo ${repo.name}:`, error);
    }
  }
  return processedProjects;
};
