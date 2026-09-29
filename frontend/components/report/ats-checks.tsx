"use client";

import { CheckCircle2, XCircle } from "lucide-react";

import type { AtsCheck } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function AtsChecks({ checks }: { checks: AtsCheck[] }) {
  const passed = checks.filter((c) => c.passed).length;
  const percentage = checks.length ? Math.round((passed / checks.length) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>ATS Compatibility Checks</CardTitle>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {passed} of {checks.length} rule-based checks passed
        </p>
        <Progress value={percentage} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        {checks.map((check) => (
          <div
            key={check.id}
            className="flex items-start gap-3 rounded-md border border-[hsl(var(--border))] p-3"
          >
            {check.passed ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
            )}
            <div>
              <p className="text-sm font-medium">{check.label}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{check.detail}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
