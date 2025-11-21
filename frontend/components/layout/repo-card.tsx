"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Star, GitFork, Zap, Users, Circle } from "lucide-react";
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
import { RepoCardProps } from "@/interface/project.interface";


export default function RepoCard({ repo }: { repo: RepoCardProps }) {
  return (
    <Link href={`/repo/${repo.repoId}`}>
      <Card className="h-full flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-muted/40 hover:border-primary/20 group">
        <CardHeader className="pb- space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {repo.avatar_url && (
                <img
                  src={repo.avatar_url}
                  alt={repo.owner}
                  className="w-8 h-8 rounded-full border border-border shrink-0"
                />
              )}
              <div className="min-w-0">
                <CardTitle className="text-lg font-bold truncate leading-tight group-hover:text-primary transition-colors max-w-48">
                  {repo.repo_name}
                </CardTitle>
                <p className="text-xs text-muted-foreground truncate">
                  by {repo.owner}
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <DifficultyBadge difficulty={repo.recommended_level} />
            </div>
          </div>
          <CardDescription className="line-clamp-3 h-16 text-sm leading-relaxed text-muted-foreground/90">
            {repo.summary || repo.description || "No description available"}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-2">
          {/* Meta Info Row */}
          <div className="flex items-center gap-4 text-sm mb-3 px-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Star className="w-4 h-4 text-yellow-500/80" />
              <span className="font-medium text-foreground">
                {repo.stars ? (repo.stars / 1000).toFixed(1) : "0.0"}k
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Circle className="w-3 h-3 fill-sky-500 text-sky-500" />
              <span className="font-medium text-foreground">
                {repo.language}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <GitFork className="w-4 h-4" />
              <span>{repo.forkCount}</span>
            </div>
          </div>

          {/* Categories */}
          {
            repo.topics && repo.topics.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {repo.topics.slice(0, 2).map((cat) => (
                  <Badge
                    key={cat}
                    variant="secondary"
                    className="text-xs px-1.5 py-0 h-5 capitalize"
                  >
                    {cat}
                  </Badge>
                ))}
                {repo.topics.length > 2 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                    +{repo.topics.length - 2}
                  </Badge>
                )}
              </div>
            ) : repo.categories && repo.categories.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {repo.categories.slice(0, 2).map((cat) => (
                  <Badge
                    key={cat}
                    variant="secondary"
                    className="text-xs px-1.5 py-0 h-5 capitalize"
                  >
                    {cat}
                  </Badge>
                ))}
                {repo.categories.length > 2 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                    +{repo.categories.length - 2}
                  </Badge>
                )}
              </div>
            ) : null
          }

          {/* Score Bars - Compact */}
          <div className="space-y-1">
            <ScoreBar
              label="Friendliness"
              value={repo.beginner_friendliness || 0}
              color="green"
            />
            <ScoreBar
              label="Readiness"
              value={repo.contribution_readiness || 0}
              color="yellow"
            />
          </div>

          {/* Issue Stats */}
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="bg-card-foreground/5 rounded px-2 py-1.5">
              <div className="text-muted-foreground text-xs">Good First</div>
              <div className="font-semibold text-sm">
                {repo.issue_data?.good_first_issue || 0}
              </div>
            </div>
            <div className="bg-card-foreground/5 rounded px-2 py-1.5">
              <div className="text-muted-foreground text-xs">Help Wanted</div>
              <div className="font-semibold text-sm">
                {repo.issue_data?.help_wanted || 0}
              </div>
            </div>
          </div>

          {/* Footer: Last Updated */}
          {repo.last_updated && (
            <div className="pt-2 mt-auto border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Updated{" "}
                {formatDistanceToNow(new Date(repo.last_updated), {
                  addSuffix: true,
                })}
              </span>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{repo.contributors} contributors</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
