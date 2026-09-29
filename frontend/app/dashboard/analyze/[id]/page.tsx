"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Trash2 } from "lucide-react";

import { api, type Analysis } from "@/lib/api";
import { formatDate, scoreTone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreGauge } from "@/components/ui/score-gauge";
import { AtsChecks } from "@/components/report/ats-checks";
import { AiReportCard } from "@/components/report/ai-report";
import { KeywordGaps } from "@/components/report/keyword-gaps";
import { ResumePreview } from "@/components/report/resume-preview";

export default function AnalysisDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getAnalysis(id)
      .then(setAnalysis)
      .catch((err) => setError(err.message || "Failed to load analysis"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Delete this analysis?")) return;
    await api.deleteAnalysis(id);
    router.push("/dashboard/history");
  };

  const exportJson = () => {
    if (!analysis) return;
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ats-report-${analysis.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading report…</p>;
  }

  if (error || !analysis) {
    return (
      <div className="space-y-4">
        <p className="rounded-md bg-rose-500/10 p-3 text-sm text-rose-300">
          {error || "Analysis not found."}
        </p>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Button>
      </div>
    );
  }

  const tone = scoreTone(analysis.atsScore);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">ATS Report</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {analysis.resume?.fileName || "Resume"} · {formatDate(analysis.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportJson}>
            <Download className="h-4 w-4" /> Export JSON
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center justify-center gap-4 p-8">
            <ScoreGauge score={analysis.atsScore} />
            <Badge
              variant={
                analysis.atsScore >= 85
                  ? "success"
                  : analysis.atsScore >= 70
                    ? "default"
                    : analysis.atsScore >= 50
                      ? "warning"
                      : "danger"
              }
              className="text-sm"
            >
              {analysis.atsGrade}
            </Badge>
            <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
              Weighted ATS compatibility score
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <AtsChecks checks={analysis.atsChecks} />
          <KeywordGaps gaps={analysis.keywordGaps} />
        </div>
      </div>

      {analysis.missingSkills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Missing skills from the job description</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {analysis.missingSkills.map((skill) => (
              <Badge key={skill} variant="danger">
                {skill}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <AiReportCard report={analysis.aiReport} suggestions={analysis.suggestions} />
      <ResumePreview parsed={analysis.resume?.parsed} />
    </div>
  );
}
