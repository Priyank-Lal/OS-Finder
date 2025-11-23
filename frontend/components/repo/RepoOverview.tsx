"use client";

import { BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RepoCardProps } from "@/interface/project.interface";

interface RepoOverviewProps {
  repo: RepoCardProps;
}

export default function RepoOverview({ repo }: RepoOverviewProps) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary" />
        Project Overview
      </h2>
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground leading-7">
            {repo.summary ||
              repo.description ||
              "No summary available for this repository."}
          </p>

          {/* Tech Stack */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-3">Tech Stack & Tools</h3>
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
                <span className="text-sm text-muted-foreground">
                  No tech stack information available
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
