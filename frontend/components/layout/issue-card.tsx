"use client";

import { Card, CardContent } from "@/components/ui/card";

interface IssueCardProps {
  title: string;
  count: number;
  description: string;
  color: "green" | "blue" | "emerald" | "purple" | "red" | "cyan";
}

const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
  green: {
    bg: "bg-emerald-500/10",
    icon: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
  },
  blue: {
    bg: "bg-blue-500/10",
    icon: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    icon: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
  },
  purple: {
    bg: "bg-purple-500/10",
    icon: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/20",
  },
  red: {
    bg: "bg-red-500/10",
    icon: "text-red-600 dark:text-red-400",
    border: "border-red-500/20",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    icon: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/20",
  },
};

export default function IssueCard({
  title,
  count,
  description,
  color,
}: IssueCardProps) {
  const colors = colorMap[color];

  return (
    <Card className={`${colors.bg} border ${colors.border}`}>
      <CardContent className="pt-6">
        <div className="text-3xl font-bold mb-2">{count}</div>
        <h3 className="font-semibold text-sm mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
