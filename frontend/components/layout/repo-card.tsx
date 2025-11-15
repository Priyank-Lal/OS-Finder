"use client";

import Link from "next/link";
import { Star, GitFork, Zap } from "lucide-react";
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
    id: string;
    name: string;
    owner: string;
    stars: number;
    language: string;
    license: string;
    difficulty: string;
    categories: string[];
    summary: string;
    friendliness: number;
    maintenance: number;
    accessibility: number;
    complexity: number;
    goodFirstIssues: number;
    helpWanted: number;
    openPRs: number;
  };
}

export default function RepoCard({ repo }: RepoCardProps) {
  return (
    <Link href={`/repo/${repo.id}`}>
      <Card className="hover:border-accent/50 transition-all cursor-pointer h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <CardTitle className="text-lg line-clamp-1">
              {repo.owner}/{repo.name}
            </CardTitle>
            <DifficultyBadge difficulty={repo.difficulty} />
          </div>
          <CardDescription className="line-clamp-2 text-sm">
            {repo.summary}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-4">
          {/* Meta Info */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="w-4 h-4" />
              {(repo.stars / 1000).toFixed(0)}k
            </div>
            <Badge variant="outline" className="text-xs">
              {repo.language}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {repo.license}
            </Badge>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-1">
            {repo.categories.slice(0, 2).map((cat) => (
              <Badge
                key={cat}
                variant="secondary"
                className="text-xs capitalize"
              >
                {cat}
              </Badge>
            ))}
            {repo.categories.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{repo.categories.length - 2}
              </Badge>
            )}
          </div>

          {/* Score Bars */}
          <div className="space-y-2">
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
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-card-foreground/5 rounded p-2">
              <div className="text-muted-foreground">Good First</div>
              <div className="font-semibold">{repo.goodFirstIssues}</div>
            </div>
            <div className="bg-card-foreground/5 rounded p-2">
              <div className="text-muted-foreground">Help Wanted</div>
              <div className="font-semibold">{repo.helpWanted}</div>
            </div>
          </div>

          {/* View Button */}
          <Button size="sm" className="mt-auto" variant="outline">
            View Details <Zap className="w-4 h-4 ml-1" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}
