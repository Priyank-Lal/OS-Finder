"use client";

import { useState } from "react";
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

// Mock data - replace with actual API call
const MOCK_REPO_DETAIL = {
  id: "1",
  name: "next.js",
  owner: "vercel",
  url: "https://github.com/vercel/next.js",
  stars: 125000,
  language: "TypeScript",
  license: "MIT",
  difficulty: "advanced",
  categories: ["web-framework", "devtool"],
  topics: ["react", "javascript", "framework", "ssr", "static-generation"],
  summary:
    "The React Framework for Production. Build next-generation applications with server-side rendering, static generation, and API routes. Perfect for building scalable web applications.",
  fullSummary:
    "Next.js is a React framework that enables you to build full-stack web applications. You use React Components to build user interfaces, and Next.js for additional features and optimizations.\n\nBehind the scenes, Next.js also abstracts and automatically configures tooling needed for React, like bundling, compiling, and more. This allows you to focus on building your application instead of spending time with configuration.\n\nWhether you're a solo developer or part of a large team, Next.js can help you build interactive, dynamic, and fast web applications.",
  skillLevel: "intermediate-to-advanced",
  mainContribAreas: [
    "Framework development",
    "Performance optimization",
    "Next.js CLI",
    "Testing infrastructure",
    "Documentation",
  ],
  friendliness: 0.85,
  maintenance: 0.95,
  accessibility: 0.8,
  complexity: 0.8,
  goodFirstIssues: 12,
  helpWanted: 8,
  firstTimersOnly: 3,
  docIssues: 5,
  bugIssues: 18,
  enhancementIssues: 22,
  openPRs: 45,
  avgPRMergeHours: 24,
  prMergeRatio: 0.92,
  lastCommit: "2 hours ago",
  lastUpdated: "2 hours ago",
  similarRepos: [
    { id: "2", name: "remix", owner: "remix-run", stars: 28000 },
    { id: "3", name: "nuxt", owner: "nuxt", stars: 54000 },
    { id: "4", name: "gatsby", owner: "gatsbyjs", stars: 55000 },
  ],
};

export default function RepoDetailPage({ params }: { params: { id: string } }) {
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

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold">
                  {MOCK_REPO_DETAIL.owner}/{MOCK_REPO_DETAIL.name}
                </h1>
                <a
                  href={MOCK_REPO_DETAIL.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  <ArrowUpRight className="w-5 h-5" />
                </a>
              </div>
              <p className="text-muted-foreground mb-4">
                {MOCK_REPO_DETAIL.summary}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
              <span className="text-2xl font-bold">
                {(MOCK_REPO_DETAIL.stars / 1000).toFixed(0)}k
              </span>
            </div>
          </div>

          {/* Meta Tags */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <DifficultyBadge difficulty={MOCK_REPO_DETAIL.difficulty} />
            <Badge variant="outline">{MOCK_REPO_DETAIL.language}</Badge>
            <Badge variant="outline">{MOCK_REPO_DETAIL.license}</Badge>
            <Badge variant="outline">{MOCK_REPO_DETAIL.lastUpdated}</Badge>
          </div>

          {/* Categories & Topics */}
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Categories</p>
              <div className="flex flex-wrap gap-2">
                {MOCK_REPO_DETAIL.categories.map((cat) => (
                  <Badge key={cat} variant="secondary" className="capitalize">
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Topics</p>
              <div className="flex flex-wrap gap-2">
                {MOCK_REPO_DETAIL.topics.map((topic) => (
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
                href={MOCK_REPO_DETAIL.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Repository
              </a>
            </Button>
            <Button size="lg" variant="outline">
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
                    {MOCK_REPO_DETAIL.fullSummary}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">
                    Recommended Skill Level
                  </h3>
                  <p className="text-muted-foreground">
                    {MOCK_REPO_DETAIL.skillLevel}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">
                    Main Contribution Areas
                  </h3>
                  <ul className="space-y-1">
                    {MOCK_REPO_DETAIL.mainContribAreas.map((area) => (
                      <li key={area} className="text-muted-foreground">
                        • {area}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Scoring Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Repository Scoring</CardTitle>
                <CardDescription>
                  4D evaluation of project quality and contributor-friendliness
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ScoreBar
                  label="Friendliness"
                  value={MOCK_REPO_DETAIL.friendliness}
                  color="green"
                />
                <ScoreBar
                  label="Maintenance"
                  value={MOCK_REPO_DETAIL.maintenance}
                  color="yellow"
                />
                <ScoreBar
                  label="Accessibility"
                  value={MOCK_REPO_DETAIL.accessibility}
                  color="cyan"
                />
                <ScoreBar
                  label="Complexity"
                  value={MOCK_REPO_DETAIL.complexity}
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
                  count={MOCK_REPO_DETAIL.goodFirstIssues}
                  description="Perfect for your first contribution"
                  color="green"
                />
                <IssueCard
                  title="Help Wanted"
                  count={MOCK_REPO_DETAIL.helpWanted}
                  description="Active support needed"
                  color="blue"
                />
                <IssueCard
                  title="First Timers Only"
                  count={MOCK_REPO_DETAIL.firstTimersOnly}
                  description="Exclusive for newcomers"
                  color="emerald"
                />
                <IssueCard
                  title="Documentation"
                  count={MOCK_REPO_DETAIL.docIssues}
                  description="Documentation needs"
                  color="purple"
                />
                <IssueCard
                  title="Bug Reports"
                  count={MOCK_REPO_DETAIL.bugIssues}
                  description="Issues to resolve"
                  color="red"
                />
                <IssueCard
                  title="Enhancements"
                  count={MOCK_REPO_DETAIL.enhancementIssues}
                  description="Feature improvements"
                  color="cyan"
                />
              </div>
            </div>

            {/* Activity Section */}
            <ActivityStats
              openPRs={MOCK_REPO_DETAIL.openPRs}
              avgPRMergeHours={MOCK_REPO_DETAIL.avgPRMergeHours}
              prMergeRatio={MOCK_REPO_DETAIL.prMergeRatio}
              lastCommit={MOCK_REPO_DETAIL.lastCommit}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Similar Repos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Similar Projects</CardTitle>
                <CardDescription>
                  Other web frameworks you might enjoy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {MOCK_REPO_DETAIL.similarRepos.map((repo) => (
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
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Facts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Language</span>
                  <span className="font-semibold">
                    {MOCK_REPO_DETAIL.language}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">License</span>
                  <span className="font-semibold">
                    {MOCK_REPO_DETAIL.license}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="font-semibold">
                    {MOCK_REPO_DETAIL.lastUpdated}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Commit</span>
                  <span className="font-semibold">
                    {MOCK_REPO_DETAIL.lastCommit}
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
