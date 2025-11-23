"use client";

import { Terminal } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RepoCardProps } from "@/interface/project.interface";

interface RepoTasksProps {
  repo: RepoCardProps;
}

export default function RepoTasks({ repo }: RepoTasksProps) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Terminal className="w-5 h-5 text-primary" />
        Where to Start
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Beginner Tasks */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-base">Beginner Friendly</CardTitle>
            <CardDescription>Good first steps for new contributors</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {repo.beginner_tasks && repo.beginner_tasks.length > 0 ? (
                repo.beginner_tasks.map((task: any, i: number) => (
                  <li key={i} className="text-sm">
                    <p className="font-medium text-foreground mb-0.5">
                      {task.title}
                    </p>
                    <p className="text-muted-foreground text-xs">{task.why}</p>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">
                  Check "Good First Issues" on GitHub.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>

        {/* Intermediate Tasks */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-base">Level Up</CardTitle>
            <CardDescription>More complex challenges</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {repo.intermediate_tasks && repo.intermediate_tasks.length > 0 ? (
                repo.intermediate_tasks.map((task: any, i: number) => (
                  <li key={i} className="text-sm">
                    <p className="font-medium text-foreground mb-0.5">
                      {task.title}
                    </p>
                    <p className="text-muted-foreground text-xs">{task.why}</p>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">
                  Look for "Help Wanted" issues.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
