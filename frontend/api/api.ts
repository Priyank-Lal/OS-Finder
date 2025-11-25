import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://os-finder.onrender.com",
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

export interface ChatResponse {
  response: string;
  messageCount?: number;
  duration?: number;
  threadId?: string;
}

export const sendChatMessage = async (
  message: string,
  threadId?: string
): Promise<ChatResponse> => {
  const { data } = await axiosInstance.post<ChatResponse>("/api/agent/chat", {
    message,
    threadId,
  });
  return data;
};
