"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Star,
  GitBranch,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DifficultyBadge from "@/components/layout/difficulty-badge";
import ScoreBar from "@/components/layout/score-bar";
import IssueCard from "@/components/layout/issue-card";
import ActivityStats from "@/components/layout/activity-stats";
import { useRepo } from "@/hooks/use-repo";

export default function RepoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: repo, isLoading, error, refetch } = useRepo({ repoId: id });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Repositories
            </Button>
          </Link>
        </div>
      </header>

      {/* Main container: show loading / error / content */}
      {isLoading ? (
        <main className="container mx-auto px-4 py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-700 rounded w-1/3 mb-4" />
            <div className="h-6 bg-slate-700 rounded w-2/3 mb-6" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-40 bg-card rounded-lg" />
                <div className="h-56 bg-card rounded-lg" />
                <div className="h-32 bg-card rounded-lg" />
              </div>
              <div className="space-y-6">
                <div className="h-24 bg-card rounded-lg" />
                <div className="h-40 bg-card rounded-lg" />
              </div>
            </div>
          </div>
        </main>
      ) : error ? (
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <span>Failed to load repository</span>
                </CardTitle>
                <CardDescription>
                  There was an error fetching repository details. You can retry
                  or go back to the list.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-3">
                <Button onClick={() => refetch()}>Retry</Button>
                <Link href="/">
                  <Button variant="ghost">Back to list</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
      ) : (
        <main className="container mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className="mb-12">
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold">
                    {repo.owner}/{repo.repo_name}
                  </h1>
                  <a
                    href={repo.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    <ArrowUpRight className="w-5 h-5" />
                  </a>
                </div>
                <p className="text-muted-foreground mb-4">{repo.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                <span className="text-2xl font-bold">
                  {(repo.stars / 1000).toFixed(0)}k
                </span>
              </div>
            </div>

            {/* Meta Tags */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <DifficultyBadge difficulty={repo.summary_level} />
              <Badge variant="outline">{repo.language}</Badge>
              <Badge variant="outline">{repo.licenseInfo.name}</Badge>
              <Badge variant="outline">{repo.last_updated}</Badge>
            </div>

            {/* Categories & Topics */}
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Categories</p>
                <div className="flex flex-wrap gap-2">
                  {repo.ai_categories.map((cat: string) => (
                    <Badge key={cat} variant="secondary" className="capitalize">
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Topics</p>
                <div className="flex flex-wrap gap-2">
                  {repo.topics.map((topic: string) => (
                    <Badge key={topic} variant="outline" className="capitalize">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <Button size="lg" asChild>
                <a
                  href={repo.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Repository
                </a>
              </Button>
              <Button
                className=" hover:text-white cursor-pointer"
                size="lg"
                variant="outline"
              >
                View Issues
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* AI Summary Section */}
              <Card>
                <CardHeader>
                  <CardTitle>About This Repository</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Full Description</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {repo.summary}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">
                      Recommended Skill Level
                    </h3>
                    <p className="text-muted-foreground">
                      {repo.summary_level}
                    </p>
                  </div>
                  {/* <div>
                  <h3 className="font-semibold mb-2">
                    Main Contribution Areas
                  </h3>
                  <ul className="space-y-1">
                    {repo.mainContribAreas.map((area) => (
                      <li key={area} className="text-muted-foreground">
                        • {area}
                      </li>
                    ))}
                  </ul>
                </div> */}
                </CardContent>
              </Card>

              {/* Scoring Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Repository Scoring</CardTitle>
                  <CardDescription>
                    4D evaluation of project quality and
                    contributor-friendliness
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ScoreBar
                    label="Friendliness"
                    value={repo.friendliness}
                    color="green"
                  />
                  <ScoreBar
                    label="Maintenance"
                    value={repo.maintenance}
                    color="yellow"
                  />
                  <ScoreBar
                    label="Accessibility"
                    value={repo.accessibility}
                    color="cyan"
                  />
                  <ScoreBar
                    label="Complexity"
                    value={repo.complexity}
                    color="red"
                  />
                </CardContent>
              </Card>

              {/* Issue Breakdown */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Available Issues</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <IssueCard
                    title="Good First Issues"
                    count={repo.issue_data.good_first_issue_count}
                    description="Perfect for your first contribution"
                    color="green"
                  />
                  <IssueCard
                    title="Help Wanted"
                    count={repo.issue_data.help_wanted_count}
                    description="Active support needed"
                    color="blue"
                  />
                  <IssueCard
                    title="First Timers Only"
                    count={repo.issue_data.first_timers_count}
                    description="Exclusive for newcomers"
                    color="emerald"
                  />
                  <IssueCard
                    title="Documentation"
                    count={repo.issue_data.documentation_count}
                    description="Documentation needs"
                    color="purple"
                  />
                  <IssueCard
                    title="Bug Reports"
                    count={repo.issue_data.bug_count}
                    description="Issues to resolve"
                    color="red"
                  />
                  <IssueCard
                    title="Enhancements"
                    count={repo.issue_data.refactor_count}
                    description="Feature improvements"
                    color="cyan"
                  />
                </div>
              </div>

              <ActivityStats
                openPRs={repo.open_prs}
                avgPRMergeHours={repo.activity.avg_pr_merge_hours}
                prMergeRatio={repo.activity.pr_merge_ratio}
                lastCommit={repo.last_commit}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Similar Repos */}
              {/* <Card>
              <CardHeader>
                <CardTitle className="text-lg">Similar Projects</CardTitle>
                <CardDescription>
                  Other web frameworks you might enjoy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {repo.similarRepos.map((repo) => (
                  <Link
                    key={repo.id}
                    href={`/repo/${repo.id}`}
                    className="block p-3 rounded-lg border border-border hover:border-accent/50 transition-colors"
                  >
                    <p className="font-semibold text-sm">
                      {repo.owner}/{repo.name}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                      <span className="text-xs text-muted-foreground">
                        {(repo.stars / 1000).toFixed(0)}k stars
                      </span>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card> */}

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Facts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Language</span>
                    <span className="font-semibold">{repo.language}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">License</span>
                    <span className="font-semibold">
                      {repo.licenseInfo.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span className="font-semibold">{repo.last_updated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Commit</span>
                    <span className="font-semibold">{repo.last_commit}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
