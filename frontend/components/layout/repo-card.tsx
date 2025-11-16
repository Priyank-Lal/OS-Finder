"use client";

import Link from "next/link";
import { Star, GitFork, Zap, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DifficultyBadge from "./difficulty-badge";
import ScoreBar from "./score-bar";

interface RepoCardProps {
  repo: {
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
  };
}

export default function RepoCard({ repo }: RepoCardProps) {
  return (
    <Link href={`/repo/${repo.repoId}`}>
      <Card className="hover:border-accent/50 transition-all cursor-pointer h-full flex flex-col overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 mb-1">
            <CardTitle className="text-lg font-semibold truncate flex-1 al">
              {repo.repo_name}
            </CardTitle>
            <div className="shrink-0">
              <DifficultyBadge difficulty={repo.summary_level} />
            </div>
          </div>
          <CardDescription className="line-clamp-2 text-xs leading-snug">
            {repo.summary}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-2 pt-2">
          {/* Meta Info Row */}
          <div className="flex items-center gap-1 flex-wrap text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Star className="w-3.5 h-3.5" />
              <span>{(repo.stars / 1000).toFixed(0)}k</span>
            </div>
            <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
              {repo.language}
            </Badge>
            <div className="flex items-center gap-1 text-muted-foreground">
              <GitFork className="w-3.5 h-3.5" />
              <span>{repo.forkCount}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span>{repo.contributors}</span>
            </div>
          </div>

          {/* Categories - Compact */}
          {repo.ai_categories?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {repo.ai_categories?.slice(0, 2).map((cat) => (
                <Badge
                  key={cat}
                  variant="secondary"
                  className="text-xs px-1.5 py-0 h-5 capitalize"
                >
                  {cat}
                </Badge>
              ))}
              {repo.ai_categories?.length > 2 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                  +{repo.ai_categories.length - 2}
                </Badge>
              )}
            </div>
          )}

          {/* Score Bars - Compact */}
          <div className="space-y-1">
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
          </div>

          {/* Issue Stats */}
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="bg-card-foreground/5 rounded px-2 py-1.5">
              <div className="text-muted-foreground text-xs">Good First</div>
              <div className="font-semibold text-sm">
                {repo.issue_data.good_first_issue_count}
              </div>
            </div>
            <div className="bg-card-foreground/5 rounded px-2 py-1.5">
              <div className="text-muted-foreground text-xs">Help Wanted</div>
              <div className="font-semibold text-sm">
                {repo.issue_data.help_wanted_count}
              </div>
            </div>
          </div>

          {/* Footer: Last Updated */}
          {repo.last_updated && (
            <div className="text-xs text-muted-foreground line-clamp-1">
              Updated: {new Date(repo.last_updated).toLocaleDateString()}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
