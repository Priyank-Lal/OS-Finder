"use client";

import { useQuery } from "@tanstack/react-query";

interface UseReposParams {
  lang?: string;
  page?: number;
  category?: string;
  topic?: string;
  level?: string;
  sortBy?: string;
  search?: string;
}

export function useRepos({
  lang = "all",
  page = 1,
  category,
  topic,
  level = "all",
  sortBy = "relevance",
  search = "",
}: UseReposParams = {}) {
  return useQuery({
    queryKey: ["repos", { lang, page, category, topic, level, sortBy, search }],
    queryFn: async () => {
      const params = new URLSearchParams({
        lang,
        page: String(page),
        sortBy,
        ...(category && { category }),
        ...(topic && { topic }),
        ...(level !== "all" && { level }),
        ...(search && { search }),
      });

      const response = await fetch(`/api/repos?${params}`);
      if (!response.ok) throw new Error("Failed to fetch repositories");
      return response.json();
    },
    // keepPreviousData: true, // Show cached data while fetching new page
  });
}
