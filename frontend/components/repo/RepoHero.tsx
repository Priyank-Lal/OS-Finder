"use client";

import { Star, GitFork, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DifficultyBadge from "@/components/layout/difficulty-badge";
import { RepoCardProps } from "@/interface/project.interface";

interface RepoHeroProps {
  repo: RepoCardProps;
}

export default function RepoHero({ repo }: RepoHeroProps) {
  return (
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
            <h1 className="text-3xl font-bold tracking-tight break-words">
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
  );
}
