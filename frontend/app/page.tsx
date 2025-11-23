"use client";

import { useState, useMemo, useEffect } from "react";
import { Search } from "lucide-react";
import Header from "@/components/layout/header";
import FilterBar from "@/components/layout/filter-bar";
import RepoCard from "@/components/layout/repo-card";
import { RepoCardSkeleton } from "@/components/layout/repo-card-skeleton";
import { Input } from "@/components/ui/input";
import { useRepos } from "@/hooks/use-repos";
import { useDebounce } from "@/hooks/use-debounce";
import { RepoCardProps } from "@/interface/project.interface";


import { Toaster } from "sonner";
import { toast } from "sonner";

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("stars");
  const [page, setPage] = useState(1);

  // Advanced filters
  const [minStars, setMinStars] = useState(0);
  const [maxIssues, setMaxIssues] = useState<number | null>(null);
  const [minScore, setMinScore] = useState(0);
  const [prMergeTime, setPrMergeTime] = useState("all");

  const debouncedSearch = useDebounce(searchQuery, 400);

  useEffect(() => {
    setPage(1);
  }, [
    selectedLanguage,
    selectedDifficulty,
    selectedCategory,
    sortBy,
    sortBy,
    searchQuery,
    minStars,
    maxIssues,
    minScore,
    prMergeTime,
  ]);
  const queryResult = useRepos({
    lang: selectedLanguage === "all" ? "" : selectedLanguage,
    page,
    category: selectedCategory || undefined,
    level: selectedDifficulty === "all" ? "" : selectedDifficulty,
    sortBy,
    search: debouncedSearch,
    minStars,
    maxIssues: maxIssues || undefined,
    minScore,
    prMergeTime,
  });
  const { data: reposData, isLoading, isError, error } = queryResult;

  // Error Handling
  useEffect(() => {
    if (isError && error) {
      toast.error("Failed to fetch repositories", {
        description: error.message || "Please try again later.",
      });
    }
  }, [isError, error]);

  const isPreviousData = (queryResult as any)?.isPreviousData ?? false;

  const repos = reposData?.data || [];

  console.log(repos);

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />
      <Header
        selectedLanguage={selectedLanguage}
        setSelectedLanguage={setSelectedLanguage}
        selectedDifficulty={selectedDifficulty}
        setSelectedDifficulty={setSelectedDifficulty}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search repositories..."
              className="pl-10 py-6 text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Filter Bar */}
        <FilterBar
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          sortBy={sortBy}
          setSortBy={setSortBy}
          minStars={minStars}
          setMinStars={setMinStars}
          maxIssues={maxIssues}
          setMaxIssues={setMaxIssues}
          minScore={minScore}
          setMinScore={setMinScore}
          prMergeTime={prMergeTime}
          setPrMergeTime={setPrMergeTime}
        />

        {/* Repos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-8">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <RepoCardSkeleton key={i} />
            ))
          ) : isError ? (
            <div className="col-span-full text-center py-12">
              <p className="text-destructive">Error: {error?.message}</p>
              <p className="text-muted-foreground text-sm mt-2">
                Try refreshing the page or adjusting your filters.
              </p>
            </div>
          ) : repos.length > 0 ? (
            repos.map((repo: RepoCardProps) => (
              <RepoCard key={repo.repoId} repo={repo} />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground text-lg">
                No repositories found. Try adjusting your filters.
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && repos.length > 0 && (
          <div className="flex justify-center gap-4 mt-12">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-border rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={
                isPreviousData || repos.length < (reposData?.limit || 20)
              }
              className="px-4 py-2 border border-border rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
