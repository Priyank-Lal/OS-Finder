import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:3001",
});

export const getRepos = async (queryParams?: Record<string, any>) => {
  const { data } = await axiosInstance.get("/api/github/repos", {
    params: queryParams,
  });
  return data;
};

export const getRepoById = async (repoId: string) => {
  const { data } = await axiosInstance.get(`/api/github/repo/${repoId}`);
  return data;
};
