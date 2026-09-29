"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Gauge, UploadCloud, TrendingUp } from "lucide-react";

import { api, type AnalysisHistoryItem, type Resume } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate, scoreTone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.listResumes(), api.listAnalyses()])
      .then(([r, a]) => {
        setResumes(r);
        setAnalyses(a);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const avgScore = analyses.length
    ? Math.round(analyses.reduce((sum, a) => sum + a.atsScore, 0) / analyses.length)
    : 0;

  const stats = [
    { label: "Resumes uploaded", value: resumes.length, icon: FileText },
    { label: "Analyses run", value: analyses.length, icon: Gauge },
    { label: "Average ATS score", value: analyses.length ? avgScore : "-", icon: TrendingUp },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Hi {user?.name?.split(" ")[0]}, welcome back</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Upload a resume and run an ATS check to get started.
          </p>
        </div>
        <Link href="/dashboard/analyze">
          <Button>
            <UploadCloud className="h-4 w-4" /> New analysis
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[hsl(var(--muted))]">
                <Icon className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent analyses</CardTitle>
          <Link href="/dashboard/history" className="text-sm text-indigo-400 hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading…</p>
          ) : analyses.length === 0 ? (
            <div className="rounded-md border border-dashed border-[hsl(var(--border))] p-8 text-center">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                No analyses yet. Run your first ATS check.
              </p>
              <Link href="/dashboard/analyze">
                <Button variant="outline" className="mt-4">
                  Analyze a resume
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {analyses.slice(0, 5).map((a) => {
                const tone = scoreTone(a.atsScore);
                return (
                  <Link
                    key={a.id}
                    href={`/dashboard/analyze/${a.id}`}
                    className="flex items-center justify-between rounded-md border border-[hsl(var(--border))] p-3 transition-colors hover:bg-[hsl(var(--muted))]"
                  >
                    <div>
                      <p className="text-sm font-medium">{a.resumeName}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {a.jobTitle || "No job description"} · {formatDate(a.createdAt)}
                      </p>
                    </div>
                    <Badge variant="muted" className={tone.text}>
                      {a.atsScore} · {a.atsGrade}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
