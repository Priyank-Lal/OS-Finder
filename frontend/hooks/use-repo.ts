"use client";

import { getRepoById } from "@/api/api";
import { useQuery } from "@tanstack/react-query";

interface UseRepoParams {
  repoId?: string;
  enabled?: boolean;
}

export function useRepo({ repoId, enabled = true }: UseRepoParams = {}) {
  return useQuery({
    queryKey: ["repo", repoId],
    queryFn: async () => {
      if (!repoId) throw new Error("repoId is required");
      const response = await getRepoById(repoId);
      return response;
    },
    enabled: !!repoId && enabled,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });
}
