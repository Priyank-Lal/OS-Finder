"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Star, Circle, Award, Users, Calendar, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DifficultyBadge from "./difficulty-badge";
import { RepoCardProps } from "@/interface/project.interface";

export default function RepoCard({ repo }: { repo: RepoCardProps }) {
  const totalIssues = repo.issue_data?.total_open || 0;

  return (
    <Link href={`/repo/${repo.repoId}`}>
      <Card className="h-full flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-muted/40 hover:border-primary/30 group">
        <CardHeader className="pb-2 space-y-2">
          {/* Header with Avatar, Name, and Difficulty */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {repo.avatar_url && (
                <img
                  src={repo.avatar_url}
                  alt={repo.owner}
                  className="w-8 h-8 rounded-full border border-primary/20 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base font-bold truncate group-hover:text-primary transition-colors">
                  {repo.repo_name}
                </CardTitle>
                <p className="text-xs text-muted-foreground truncate">
                  {repo.owner}
                </p>
              </div>
            </div>
            <DifficultyBadge difficulty={repo.recommended_level} />
          </div>

          {/* Description */}
          <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
            {repo.summary || repo.description || "No description available"}
          </p>

          {/* Stats Row */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500/20" />
                <span className="font-semibold">
                  {repo.stars ? (repo.stars / 1000).toFixed(1) : "0.0"}k
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />
                <span className="font-medium">{repo.language}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="w-3 h-3" />
              <span>{repo.contributors}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-2 pt-0">
          {/* Topics/Categories */}
          {(repo.topics?.length > 0 || repo.categories?.length > 0) && (
            <div className="flex flex-wrap gap-1">
              {(repo.topics?.length > 0 ? repo.topics : repo.categories)
                ?.slice(0, 2)
                .map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs px-1.5 py-0 capitalize font-normal h-5"
                  >
                    {tag}
                  </Badge>
                ))}
              {((repo.topics?.length || repo.categories?.length || 0) > 2) && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                  +{(repo.topics?.length || repo.categories?.length || 0) - 2}
                </Badge>
              )}
            </div>
          )}

          {/* Compact Score Grid */}
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="bg-emerald-500/10 rounded px-2 py-1.5">
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Friendly</div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
                {repo.beginner_friendliness || 0}%
              </div>
            </div>
            <div className="bg-rose-500/10 rounded px-2 py-1.5">
              <div className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">Complex</div>
              <div className="text-sm font-bold text-rose-600 dark:text-rose-300">
                {repo.technical_complexity || 0}%
              </div>
            </div>
            <div className="bg-cyan-500/10 rounded px-2 py-1.5">
              <div className="text-[10px] text-cyan-700 dark:text-cyan-400 font-medium">Ready</div>
              <div className="text-sm font-bold text-cyan-600 dark:text-cyan-300">
                {repo.contribution_readiness || 0}%
              </div>
            </div>
            <div className="bg-primary/10 rounded px-2 py-1.5">
              <div className="text-[10px] text-primary font-medium">Overall</div>
              <div className="text-sm font-bold text-primary">
                {repo.overall_score || 0}%
              </div>
            </div>
          </div>

          {/* Total Issues */}
          {totalIssues > 0 && (
            <div className="flex items-center justify-between bg-muted/50 rounded px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Open Issues</span>
              </div>
              <span className="text-sm font-bold">{totalIssues}</span>
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto pt-1.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>
                {formatDistanceToNow(new Date(repo.last_updated || Date.now()), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
