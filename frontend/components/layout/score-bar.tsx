"use client";

interface ScoreBarProps {
  label: string;
  value: number;
  color?: "green" | "yellow" | "cyan" | "red";
}

export default function ScoreBar({
  label,
  value,
  color = "green",
}: ScoreBarProps) {
  const colorMap: Record<string, { bar: string; bg: string }> = {
    green: { bar: "bg-emerald-500", bg: "bg-emerald-500/10" },
    yellow: { bar: "bg-yellow-500", bg: "bg-yellow-500/10" },
    cyan: { bar: "bg-cyan-500", bg: "bg-cyan-500/10" },
    red: { bar: "bg-rose-500", bg: "bg-rose-500/10" },
  };

  const colors = colorMap[color];
  const percentage = Math.round(value * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{percentage}%</span>
      </div>
      <div className={`w-full h-2 rounded-full ${colors.bg} overflow-hidden`}>
        <div
          className={`h-full ${colors.bar} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
