"use client";

import { Badge } from "@/components/ui/badge";

interface DifficultyBadgeProps {
  difficulty: string;
}

export default function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  const colorMap: Record<string, { bg: string; text: string; label: string }> =
    {
      beginner: {
        bg: "bg-emerald-500/10",
        text: "text-emerald-600 dark:text-emerald-400",
        label: "Beginner",
      },
      intermediate: {
        bg: "bg-blue-500/10",
        text: "text-blue-600 dark:text-blue-400",
        label: "Intermediate",
      },
      advanced: {
        bg: "bg-rose-500/10",
        text: "text-rose-600 dark:text-rose-400",
        label: "Advanced",
      },
    };

  const color = colorMap[difficulty] || colorMap.beginner;

  return (
    <Badge className={`${color.bg} ${color.text} border-0`}>
      {color.label}
    </Badge>
  );
}
