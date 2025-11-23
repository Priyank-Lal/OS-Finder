"use client";

import { CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import IssueCard from "@/components/layout/issue-card";
import { formatDistanceToNow } from "date-fns";
import { RepoCardProps } from "@/interface/project.interface";

interface RepoIssueSpotlightProps {
  repo: RepoCardProps;
}

export default function RepoIssueSpotlight({ repo }: RepoIssueSpotlightProps) {
  return (
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
            <CardTitle className="text-base">Recent Issue Samples</CardTitle>
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
                    {issue.title != "" ? issue.title : "No Title"}
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
                        {formatDistanceToNow(new Date(issue.created_at), {
                          addSuffix: true,
                        })}
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
  );
}
