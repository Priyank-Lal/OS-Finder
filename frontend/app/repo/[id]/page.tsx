"use client";

import React, { use } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ArrowUpRight,
  Code2,
  Shield,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ScoreBar from "@/components/layout/score-bar";
import ActivityStats from "@/components/layout/activity-stats";
import LanguageBreakdown from "@/components/layout/language-breakdown";
import { useRepo } from "@/hooks/use-repo";
import { formatDistanceToNow } from "date-fns";
import { RepoCardProps } from "@/interface/project.interface";

// New Components
import RepoHero from "@/components/repo/RepoHero";
import RepoOverview from "@/components/repo/RepoOverview";
import RepoTasks from "@/components/repo/RepoTasks";
import RepoIssueSpotlight from "@/components/repo/RepoIssueSpotlight";
import RepoContributionAreas from "@/components/repo/RepoContributionAreas";

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
        <RepoHero repo={repo} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (Main Content) - Span 8 */}
          <div className="lg:col-span-8 space-y-8">
            <RepoOverview repo={repo} />
            <RepoContributionAreas repo={repo} />
            <RepoTasks repo={repo} />
            <RepoIssueSpotlight repo={repo} />
          </div>

          {/* Right Column (Sticky Sidebar) - Span 4 */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 lg:h-fit">
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
