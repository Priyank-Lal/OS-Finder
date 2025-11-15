"use client";

import { useQuery } from "@tanstack/react-query";

interface UseRepoParams {
  repoId?: string;
  enabled?: boolean;
}

export function useRepo({ repoId, enabled = true }: UseRepoParams = {}) {
  return useQuery({
    queryKey: ["repo", repoId],
    queryFn: async () => {
      const response = await fetch(`/api/repos/${repoId}`);
      if (!response.ok) throw new Error("Failed to fetch repository");
      return response.json();
    },
    enabled: !!repoId && enabled, // Only fetch if repoId exists and enabled is true
    staleTime: 300_000, // 5 minutes
  });
}
