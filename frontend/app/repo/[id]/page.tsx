"use client";

import React, { use } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Star,
  GitBranch,
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  Code2,
  Users,
  Zap,
  GitFork,
  Calendar,
  Shield,
  CheckCircle2,
  Layers,
  Terminal,
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
import LanguageBreakdown from "@/components/layout/language-breakdown";
import { useRepo } from "@/hooks/use-repo";
import { formatDistanceToNow } from "date-fns";
import { RepoCardProps } from "@/interface/project.interface";

export default function RepoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: repoData, isLoading, error, refetch } = useRepo({ repoId: id });
  const repo = repoData as RepoCardProps | undefined;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background container mx-auto px-4 py-12">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-40 bg-muted rounded-lg" />
              <div className="h-64 bg-muted rounded-lg" />
            </div>
            <div className="h-96 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="min-h-screen bg-background container mx-auto px-4 py-12 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Failed to load repository
            </CardTitle>
            <CardDescription>
              We couldn't fetch the details for this repository.
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
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`${repo.repo_url}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Issues
                </a>
              </Button>
              <Button size="sm" asChild>
                <a
                  href={repo.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Repo <ArrowUpRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-start gap-4 mb-4">
            {repo.avatar_url && (
              <img
                src={repo.avatar_url}
                alt={repo.owner}
                className="w-16 h-16 rounded-full border border-border shadow-sm"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold tracking-tight">
                  {repo.owner} /{" "}
                  <span className="text-primary">{repo.repo_name}</span>
                </h1>
                <DifficultyBadge difficulty={repo.recommended_level} />
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
                {repo.description}
              </p>
            </div>
          </div>

          {/* Meta Tags Row */}
          <div className="flex flex-wrap gap-3 items-center">
            {repo.categories?.map((cat: string) => (
              <Badge
                key={cat}
                variant="secondary"
                className="capitalize px-2 py-1"
              >
                {cat}
              </Badge>
            ))}
            <div className="h-4 w-px bg-border mx-1" />
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="font-medium text-foreground">
                {(repo.stars / 1000).toFixed(1)}k
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <GitFork className="w-4 h-4" />
              <span>{repo.forkCount}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{repo.contributors} contributors</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (Main Content) - Span 8 */}
          <div className="lg:col-span-8 space-y-8">
            {/* AI Summary */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Project Overview
              </h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground leading-7">
                    {repo.summary || repo.description || "No summary available for this repository."}
                  </p>

                  {/* Tech Stack */}
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold mb-3">
                      Tech Stack & Tools
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {repo.tech_stack && repo.tech_stack.length > 0 ? (
                        repo.tech_stack.map((tech: string) => (
                          <Badge
                            key={tech}
                            variant="outline"
                            className="font-mono text-xs"
                          >
                            {tech}
                          </Badge>
                        ))
                      ) : repo.topics && repo.topics.length > 0 ? (
                        repo.topics.slice(0, 5).map((topic: string) => (
                          <Badge
                            key={topic}
                            variant="outline"
                            className="font-mono text-xs"
                          >
                            {topic}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No tech stack information available</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Getting Started / Tasks */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-primary" />
                Where to Start
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Beginner Tasks */}
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Beginner Friendly
                    </CardTitle>
                    <CardDescription>
                      Good first steps for new contributors
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {repo.beginner_tasks && repo.beginner_tasks.length > 0 ? (
                        repo.beginner_tasks.map((task: any, i: number) => (
                          <li key={i} className="text-sm">
                            <p className="font-medium text-foreground mb-0.5">
                              {task.title}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {task.why}
                            </p>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-muted-foreground">
                          Check "Good First Issues" on GitHub.
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>

                {/* Intermediate Tasks */}
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <CardTitle className="text-base">Level Up</CardTitle>
                    <CardDescription>More complex challenges</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {repo.intermediate_tasks && repo.intermediate_tasks.length > 0 ? (
                        repo.intermediate_tasks.map((task: any, i: number) => (
                          <li key={i} className="text-sm">
                            <p className="font-medium text-foreground mb-0.5">
                              {task.title}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {task.why}
                            </p>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-muted-foreground">
                          Look for "Help Wanted" issues.
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Issue Spotlight */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                Issue Spotlight
              </h2>

              {/* Issue Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                <IssueCard
                  title="Good First Issues"
                  count={repo.issue_data?.good_first_issue || 0}
                  description="Start here"
                  color="green"
                />
                <IssueCard
                  title="Help Wanted"
                  count={repo.issue_data?.help_wanted || 0}
                  description="Community help"
                  color="blue"
                />
                <IssueCard
                  title="Bugs"
                  count={repo.issue_data?.bug || 0}
                  description="Needs fixing"
                  color="red"
                />
              </div>

              {/* Sample Issues List */}
              {repo.issue_samples && repo.issue_samples.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Recent Issue Samples
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {repo.issue_samples.map((issue: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 pb-4 border-b border-border last:border-0 last:pb-0"
                      >
                        <div className="mt-1">
                          <AlertCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium text-sm mb-1 line-clamp-1">
                            {issue.title}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {issue.labels?.slice(0, 3).map((label: string) => (
                              <Badge
                                key={label}
                                variant="outline"
                                className="text-[10px] h-5 px-1.5"
                              >
                                {label}
                              </Badge>
                            ))}
                            {issue.created_at && (
                              <span className="text-xs text-muted-foreground ml-auto">
                                {formatDistanceToNow(
                                  new Date(issue.created_at),
                                  { addSuffix: true }
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </section>
          </div>

          {/* Right Column (Sticky Sidebar) - Span 4 */}
          <div className="lg:col-span-4 space-y-6">
            {/* Scores Card */}
            <Card className="border-primary/20 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  OS-Finder Score
                  <span className="text-2xl font-bold text-primary">
                    {repo.overall_score || 0}
                  </span>
                </CardTitle>
                <CardDescription>
                  AI-evaluated contribution readiness
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <ScoreBar
                  label="Beginner Friendliness"
                  value={repo.beginner_friendliness || 0}
                  color="green"
                />
                <ScoreBar
                  label="Contribution Readiness"
                  value={repo.contribution_readiness || 0}
                  color="yellow"
                />
                <ScoreBar
                  label="Technical Complexity"
                  value={repo.technical_complexity || 0}
                  color="red"
                />

              </CardContent>
            </Card>

            {/* Activity Stats */}
            <ActivityStats
              openPRs={repo.open_prs || 0}
              avgPRMergeHours={repo.activity?.avg_pr_merge_hours || 0}
              prMergeRatio={repo.activity?.pr_merge_ratio || 0}
              lastCommit={
                repo.last_commit
                  ? formatDistanceToNow(new Date(repo.last_commit), {
                      addSuffix: true,
                    })
                  : "N/A"
              }
            />

            {/* Language Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Code2 className="w-4 h-4" /> Languages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LanguageBreakdown languages={repo.languages_breakdown || []} />
              </CardContent>
            </Card>

            {/* Community Health */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Community
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">License</span>
                  <span
                    className="font-medium truncate max-w-[150px]"
                    title={repo.licenseInfo?.name}
                  >
                    {repo.licenseInfo?.name || "None"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Code of Conduct</span>
                  <span className="font-medium">
                    {repo.community_health?.has_code_of_conduct ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Contributing Guide
                  </span>
                  <span className="font-medium">
                    {repo.community_health?.has_contributing ? "Yes" : "No"}
                  </span>
                </div>
                <div className="pt-2 border-t border-border/50 flex justify-between text-xs text-muted-foreground">
                  <span>Updated</span>
                  <span>
                    {repo.last_updated
                      ? new Date(repo.last_updated).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
