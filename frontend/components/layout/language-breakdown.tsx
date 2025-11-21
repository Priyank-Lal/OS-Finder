"use client";

import { cn } from "@/lib/utils";

interface Language {
  name: string;
  size: number;
}

interface LanguageBreakdownProps {
  languages: Language[];
  className?: string;
}

// GitHub-like colors for common languages
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  PHP: "#4F5D95",
  Ruby: "#701516",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Shell: "#89e051",
};

const DEFAULT_COLOR = "#ededed";

export default function LanguageBreakdown({
  languages,
  className,
}: LanguageBreakdownProps) {
  if (!languages || languages.length === 0) return null;

  const totalSize = languages.reduce((acc, lang) => acc + lang.size, 0);

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="font-semibold text-sm">Languages</h3>
      
      {/* Progress Bar */}
      <div className="h-3 w-full flex rounded-full overflow-hidden bg-muted/20">
        {languages.map((lang) => {
          const percentage = (lang.size / totalSize) * 100;
          if (percentage < 0.1) return null; // Don't show tiny segments

          return (
            <div
              key={lang.name}
              style={{
                width: `${percentage}%`,
                backgroundColor: LANGUAGE_COLORS[lang.name] || DEFAULT_COLOR,
              }}
              title={`${lang.name}: ${percentage.toFixed(1)}%`}
              className="h-full first:rounded-l-full last:rounded-r-full hover:opacity-80 transition-opacity"
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {languages.map((lang) => {
          const percentage = (lang.size / totalSize) * 100;
          if (percentage < 1) return null; // Hide very small languages from legend

          return (
            <div key={lang.name} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: LANGUAGE_COLORS[lang.name] || DEFAULT_COLOR,
                }}
              />
              <span className="font-medium text-foreground">{lang.name}</span>
              <span>{percentage.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
