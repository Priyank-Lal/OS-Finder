"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowUp, Zap } from "lucide-react";

interface ActivityStatsProps {
  openPRs: number;
  avgPRMergeHours: number;
  prMergeRatio: number;
  lastCommit: string;
}

export default function ActivityStats({
  openPRs,
  avgPRMergeHours,
  prMergeRatio,
  lastCommit,
}: ActivityStatsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Repository Activity</CardTitle>
        <CardDescription>
          Community engagement and contribution metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              Avg PR Merge Time
            </p>
            <p className="text-2xl font-bold flex items-center gap-2">
              {avgPRMergeHours}h
              <Zap className="w-5 h-5 text-yellow-500" />
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Fast turnaround
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">PR Merge Ratio</p>
            <p className="text-2xl font-bold flex items-center gap-2">
              {Math.round(prMergeRatio * 100)}%
              <ArrowUp className="w-5 h-5 text-emerald-500" />
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              High acceptance
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Open PRs</p>
            <p className="text-xl font-bold">{openPRs}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Last Commit</p>
            <p className="text-xl font-bold">{lastCommit}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
