"use client";

import { AlertTriangle } from "lucide-react";

import type { KeywordGap } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function KeywordGaps({ gaps }: { gaps: KeywordGap[] }) {
  if (!gaps.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          Keyword Gap List
        </CardTitle>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Keywords found in the job description but missing from your resume.
        </p>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {gaps.map((gap, i) => (
          <Badge
            key={`${gap.keyword}-${i}`}
            variant={
              gap.importance === "high"
                ? "danger"
                : gap.importance === "medium"
                  ? "warning"
                  : "muted"
            }
          >
            {gap.keyword}
          </Badge>
        ))}
      </CardContent>
    </Card>
  );
}
