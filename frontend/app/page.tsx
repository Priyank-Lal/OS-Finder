"use client";

import { useState, useMemo, useEffect } from "react";
import { Search } from "lucide-react";
import Header from "@/components/layout/header";
import FilterBar from "@/components/layout/filter-bar";
import RepoCard from "@/components/layout/repo-card";
import { Input } from "@/components/ui/input";
import { useRepos } from "@/hooks/use-repos";
import { useDebounce } from "@/hooks/use-debounce";

interface RepoCardProps {
  _id: string;
  repoId: String;
  repo_name: string;
  repo_url: string;
  owner: string;
  language: string;
  licenseInfo: {
    name: string;
    key: any;
  };
  isArchived: boolean;
  forkCount: number;
  topics: string[];
  description: string;
  open_prs: number;
  stars: number;
  score: number;
  final_score: number;
  friendliness: number;
  maintenance: number;
  accessibility: number;
  complexity: number;
  ai_categories: string[];
  contributors: number;
  has_contributing: boolean;
  issue_data: {
    total_open_issues: number;
    good_first_issue_count: number;
    help_wanted_count: number;
    first_timers_count: number;
    beginner_count: number;
    bug_count: number;
    enhancement_count: number;
    documentation_count: number;
    refactor_count: number;
    high_priority_count: number;
  };
  beginner_issue_total: number;
  beginner_issue_score: number;
  accessibility_score_base: number;
  activity: {
    avg_pr_merge_hours: number;
    pr_merge_ratio: number;
  };
  summary: string;
  summary_level: string;
  last_updated: Date;
  last_commit: Date;
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("stars");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(searchQuery, 400);

  useEffect(() => {
    setPage(1);
  }, [
    selectedLanguage,
    selectedDifficulty,
    selectedCategory,
    sortBy,
    searchQuery,
  ]);
  const queryResult = useRepos({
    lang: selectedLanguage === "all" ? "" : selectedLanguage,
    page,
    category: selectedCategory || undefined,
    level: selectedDifficulty === "all" ? "" : selectedDifficulty,
    sortBy,
    search: debouncedSearch,
  });
  const { data: reposData, isLoading, isError, error } = queryResult;

  const isPreviousData = (queryResult as any)?.isPreviousData ?? false;

  const repos = reposData?.data || [];

  console.log(repos);

  return (
    <div className="min-h-screen bg-background">
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
        />

        {/* Repos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-8">
          {isLoading ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">Loading repositories...</p>
            </div>
          ) : isError ? (
            <div className="col-span-full text-center py-12">
              <p className="text-destructive">Error: {error?.message}</p>
            </div>
          ) : repos.length > 0 ? (
            repos.map((repo: RepoCardProps) => (
              <RepoCard key={repo._id} repo={repo} />
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
