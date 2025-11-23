"use client";

import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, SlidersHorizontal, Filter } from "lucide-react";
import { useState } from "react";

const CATEGORIES = [
  "web-framework",
  "mobile",
  "devtool",
  "cli",
  "database",
  "ml",
  "security",
  "frontend",
  "backend",
  "infrastructure",
  "testing",
  "docs",
  "utility",
  "game-dev",
  "blockchain",
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "stars", label: "Stars" },
  { value: "friendliness", label: "Friendliness" },
  { value: "maintenance", label: "Maintenance" },
  { value: "complexity", label: "Complexity" },
];

const PR_MERGE_TIME_OPTIONS = [
  { value: "all", label: "All Times" },
  { value: "fast", label: "Fast (<24h)" },
  { value: "medium", label: "Medium (24-72h)" },
  { value: "slow", label: "Slow (>72h)" },
];

interface FilterBarProps {
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  minStars: number;
  setMinStars: (stars: number) => void;
  maxIssues: number | null;
  setMaxIssues: (issues: number | null) => void;
  minScore: number;
  setMinScore: (score: number) => void;
  prMergeTime: string;
  setPrMergeTime: (time: string) => void;
}

export default function FilterBar({
  selectedCategory,
  setSelectedCategory,
  sortBy,
  setSortBy,
  minStars,
  setMinStars,
  maxIssues,
  setMaxIssues,
  minScore,
  setMinScore,
  prMergeTime,
  setPrMergeTime,
}: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasActiveFilters = minStars > 0 || maxIssues !== null || minScore > 0 || prMergeTime !== "all";

  const clearAllFilters = () => {
    setMinStars(0);
    setMaxIssues(null);
    setMinScore(0);
    setPrMergeTime("all");
  };

  return (
    <div className="space-y-4">
      {/* Main Filter Controls Row */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border border-border shadow-sm">
        
        <div className="flex flex-1 gap-4 w-full md:w-auto overflow-x-auto no-scrollbar">
          {/* Category Dropdown */}
          <div className="flex flex-col gap-1.5 min-w-[180px]">
            <label className="text-xs font-medium text-muted-foreground ml-1">Category</label>
            <Select 
              value={selectedCategory || "all"} 
              onValueChange={(val) => setSelectedCategory(val === "all" ? null : val)}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat} className="capitalize">
                    {cat.replace("-", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort Dropdown */}
          <div className="flex flex-col gap-1.5 min-w-[180px]">
            <label className="text-xs font-medium text-muted-foreground ml-1">Sort By</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <div className="flex items-end h-full pt-6 md:pt-0">
          <Button
            variant={showAdvanced || hasActiveFilters ? "default" : "outline"}
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="gap-2 w-full md:w-auto"
          >
            <SlidersHorizontal className="w-4 h-4" />
            More Filters
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary-foreground text-primary text-xs font-bold">
                {[minStars > 0, maxIssues !== null, minScore > 0, prMergeTime !== "all"].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="p-6 border border-border rounded-lg bg-card/50 backdrop-blur-sm space-y-6 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              Advanced Filters
            </h3>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-8 text-xs gap-1 text-muted-foreground hover:text-destructive"
              >
                <X className="w-3 h-3" />
                Reset All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Stars Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Minimum Stars</label>
                <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                  {minStars === 0 ? "Any" : `${(minStars / 1000).toFixed(0)}k+`}
                </span>
              </div>
              <Slider
                value={[minStars]}
                onValueChange={([value]: number[]) => setMinStars(value)}
                max={50000}
                step={1000}
                className="w-full py-2"
              />
            </div>

            {/* Score Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Min Score</label>
                <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                  {minScore === 0 ? "Any" : `${minScore}+`}
                </span>
              </div>
              <Slider
                value={[minScore]}
                onValueChange={([value]: number[]) => setMinScore(value)}
                max={100}
                step={10}
                className="w-full py-2"
              />
            </div>

            {/* Max Issues Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Max Open Issues</label>
                <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                  {maxIssues === null ? "Any" : maxIssues}
                </span>
              </div>
              <Slider
                value={[maxIssues || 500]}
                onValueChange={([value]: number[]) => setMaxIssues(value === 500 ? null : value)}
                max={500}
                step={50}
                className="w-full py-2"
              />
            </div>

            {/* PR Merge Time Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium block">PR Merge Time</label>
              <Select value={prMergeTime} onValueChange={setPrMergeTime}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PR_MERGE_TIME_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
