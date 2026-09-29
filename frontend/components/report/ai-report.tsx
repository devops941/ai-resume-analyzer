"use client";

import { Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";

import type { AiReport, Suggestion } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-[hsl(var(--muted-foreground))]">{label}</span>
        <span className="font-medium">{value}/100</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

export function AiReportCard({
  report,
  suggestions,
}: {
  report: AiReport | null | undefined;
  suggestions: Suggestion[];
}) {
  if (!report) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-400" />
          AI Analysis Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!report.aiAvailable && (
          <p className="rounded-md bg-amber-500/10 p-3 text-xs text-amber-300">
            AI review unavailable: {report.aiError || "unknown error"}. Rule-based results are still
            shown.
          </p>
        )}

        {report.overallSummary && <p className="text-sm text-slate-200">{report.overallSummary}</p>}

        <div className="grid gap-3 sm:grid-cols-3">
          <ScoreBar label="Clarity" value={report.clarityScore || 0} />
          <ScoreBar label="Impact" value={report.impactScore || 0} />
          <ScoreBar label="Structure" value={report.structureScore || 0} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <ThumbsUp className="h-4 w-4" /> Strengths
            </h4>
            <ul className="space-y-1 text-sm text-slate-300">
              {(report.strengths || []).map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-400">•</span>
                  {s}
                </li>
              ))}
              {!report.strengths?.length && <li className="text-xs">None reported.</li>}
            </ul>
          </div>
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-400">
              <ThumbsDown className="h-4 w-4" /> Weaknesses
            </h4>
            <ul className="space-y-1 text-sm text-slate-300">
              {(report.weaknesses || []).map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-rose-400">•</span>
                  {s}
                </li>
              ))}
              {!report.weaknesses?.length && <li className="text-xs">None reported.</li>}
            </ul>
          </div>
        </div>

        {report.jobFitNotes && (
          <div className="rounded-md bg-[hsl(var(--muted))] p-3">
            <p className="mb-1 text-xs font-semibold uppercase text-[hsl(var(--muted-foreground))]">
              Job fit
            </p>
            <p className="text-sm text-slate-200">{report.jobFitNotes}</p>
          </div>
        )}

        {suggestions.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold">Section-by-Section Suggestions</h4>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-md border border-[hsl(var(--border))] p-3"
                >
                  <Badge>{s.section}</Badge>
                  <p className="text-sm text-slate-300">{s.tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
