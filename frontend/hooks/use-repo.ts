"use client";

import { useState, useEffect } from "react";

interface UseRepoParams {
  repoId?: string;
  enabled?: boolean;
}

export function useRepo({ repoId, enabled = true }: UseRepoParams = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!repoId || !enabled) return;

    const fetchRepo = async () => {
      try {
        setLoading(true);
        // Replace with actual API endpoint
        const response = await fetch(`/api/repos/${repoId}`);
        if (!response.ok) throw new Error("Failed to fetch repository");

        const repo = await response.json();
        setData(repo);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    fetchRepo();
  }, [repoId, enabled]);

  return { data, loading, error };
}
