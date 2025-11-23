"use client";

import { getRepos } from "@/api/api";
import { buildRepoQueryParams } from "@/lib/buildFilters";
import { useQuery } from "@tanstack/react-query";

interface UseReposParams {
  lang?: string;
  page?: number;
  category?: string;
  topic?: string;
  level?: string;
  sortBy?: string;
  search?: string;
  minStars?: number;
  maxIssues?: number;
  minScore?: number;
  prMergeTime?: string;
}

export function useRepos({
  lang = "",
  page = 1,
  category,
  topic,
  level = "",
  sortBy = "stars",
  search = "",
  minStars,
  maxIssues,
  minScore,
  prMergeTime,
}: UseReposParams = {}) {
  return useQuery({
    queryKey: ["repos", { lang, page, category, topic, level, sortBy, search, minStars, maxIssues, minScore, prMergeTime }],
    queryFn: async () => {
      const queryParams = buildRepoQueryParams({
        lang,
        page,
        category,
        topic,
        level,
        sortBy,
        search,
        minStars,
        maxIssues,
        minScore,
        prMergeTime,
      });

      const response = await getRepos(queryParams);
      return response;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
