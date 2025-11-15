"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import Header from "@/components/layout/header";
import FilterBar from "@/components/layout/filter-bar";
import RepoCard from "@/components/layout/repo-card";
import { Input } from "@/components/ui/input";

// Mock data - replace with actual API call
const MOCK_REPOS = [
  {
    id: "1",
    name: "next.js",
    owner: "vercel",
    stars: 125000,
    language: "TypeScript",
    license: "MIT",
    difficulty: "advanced",
    categories: ["web-framework", "devtool"],
    topics: ["react", "javascript", "framework"],
    summary:
      "The React Framework for Production. Build next-generation applications with server-side rendering, static generation, and API routes.",
    friendliness: 0.85,
    maintenance: 0.95,
    accessibility: 0.8,
    complexity: 0.8,
    goodFirstIssues: 12,
    helpWanted: 8,
    openPRs: 45,
    avgPRMergeHours: 24,
    prMergeRatio: 0.92,
    lastCommit: "2 hours ago",
    lastUpdated: "2 hours ago",
  },
  {
    id: "2",
    name: "vue",
    owner: "vuejs",
    stars: 208000,
    language: "TypeScript",
    license: "MIT",
    difficulty: "beginner",
    categories: ["web-framework", "frontend"],
    topics: ["vue", "javascript", "framework"],
    summary:
      "The Progressive JavaScript Framework. An approachable, performant and versatile framework for building web user interfaces.",
    friendliness: 0.9,
    maintenance: 0.88,
    accessibility: 0.85,
    complexity: 0.65,
    goodFirstIssues: 28,
    helpWanted: 15,
    openPRs: 32,
    avgPRMergeHours: 18,
    prMergeRatio: 0.95,
    lastCommit: "1 hour ago",
    lastUpdated: "1 hour ago",
  },
  {
    id: "3",
    name: "tailwindcss",
    owner: "tailwindlabs",
    stars: 82000,
    language: "TypeScript",
    license: "MIT",
    difficulty: "intermediate",
    categories: ["frontend", "devtool"],
    topics: ["css", "utility-first", "tailwind"],
    summary:
      "Rapidly build modern websites without leaving your HTML. A utility-first CSS framework for rapidly building custom designs.",
    friendliness: 0.88,
    maintenance: 0.92,
    accessibility: 0.87,
    complexity: 0.55,
    goodFirstIssues: 8,
    helpWanted: 5,
    openPRs: 18,
    avgPRMergeHours: 30,
    prMergeRatio: 0.88,
    lastCommit: "3 hours ago",
    lastUpdated: "3 hours ago",
  },
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("relevance");

  const filteredRepos = useMemo(() => {
    return MOCK_REPOS.filter((repo) => {
      const matchesSearch =
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.summary.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLanguage =
        selectedLanguage === "all" || repo.language === selectedLanguage;
      const matchesDifficulty =
        selectedDifficulty === "all" || repo.difficulty === selectedDifficulty;
      const matchesCategory =
        !selectedCategory || repo.categories.includes(selectedCategory);

      return (
        matchesSearch && matchesLanguage && matchesDifficulty && matchesCategory
      );
    }).sort((a, b) => {
      if (sortBy === "stars") return b.stars - a.stars;
      if (sortBy === "friendliness") return b.friendliness - a.friendliness;
      if (sortBy === "maintenance") return b.maintenance - a.maintenance;
      return 0;
    });
  }, [
    searchQuery,
    selectedLanguage,
    selectedDifficulty,
    selectedCategory,
    sortBy,
  ]);

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
          {filteredRepos.length > 0 ? (
            filteredRepos.map((repo) => <RepoCard key={repo.id} repo={repo} />)
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground text-lg">
                No repositories found. Try adjusting your filters.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
