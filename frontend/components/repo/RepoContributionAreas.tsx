"use client";

import { Target, Check, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RepoCardProps } from "@/interface/project.interface";

interface RepoContributionAreasProps {
  repo: RepoCardProps;
}

export default function RepoContributionAreas({ repo }: RepoContributionAreasProps) {
  if (!repo.main_contrib_areas || repo.main_contrib_areas.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-primary" />
        Main Contribution Areas
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {repo.main_contrib_areas.map((area, index) => (
          <Card key={index} className="overflow-hidden border-l-4 border-l-primary/50">
            <CardHeader className="pb-2 bg-muted/30">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base font-medium capitalize">
                  {area.area.replace(/-/g, " ")}
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {Math.round(area.confidence * 100)}% Match
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Relevance</span>
                  <span>{Math.round(area.confidence * 100)}%</span>
                </div>
                <Progress value={area.confidence * 100} className="h-1.5" />
              </div>

              <div className="space-y-2">
                {area.reasons.map((reason, rIndex) => (
                  <div key={rIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-3 h-3 mt-1 text-green-500 shrink-0" />
                    <span className="leading-tight">{reason}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
