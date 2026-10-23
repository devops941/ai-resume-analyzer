"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Gauge, UploadCloud, TrendingUp, FileSearch } from "lucide-react";

import { api, type AnalysisHistoryItem, type Resume } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate, scoreTone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const statAccents = [
  "border-l-blue-500",
  "border-l-indigo-500",
  "border-l-emerald-500",
];

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
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
            Upload a resume and run an ATS check to get started.
          </p>
        </div>
        <Link href="/dashboard/analyze">
          <Button>
            <UploadCloud className="h-4 w-4" /> New analysis
          </Button>
        </Link>
      </div>

      {/* Stat cards with colored left border accent */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }, idx) => (
          <Card key={label} className={`border-l-4 ${statAccents[idx]} rounded-xl`}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--muted))]">
                <Icon className="h-5 w-5 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{value}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent analyses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>Recent analyses</CardTitle>
          <Link href="/dashboard/history" className="text-sm text-[hsl(var(--primary))] hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading…</p>
          ) : analyses.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-[hsl(var(--border))] p-10 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--muted))]">
                <FileSearch className="h-6 w-6 text-[hsl(var(--muted-foreground))]" />
              </div>
              <p className="text-sm font-medium mb-1">No analyses yet</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
                Run your first ATS check to see results here.
              </p>
              <Link href="/dashboard/analyze">
                <Button variant="outline" size="sm">
                  Analyze a resume
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {analyses.slice(0, 5).map((a) => {
                const tone = scoreTone(a.atsScore);
                const scoreWidth = `${Math.min(a.atsScore, 100)}%`;
                return (
                  <Link
                    key={a.id}
                    href={`/dashboard/analyze/${a.id}`}
                    className="group flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-4 transition-colors hover:bg-[hsl(var(--muted))]/50 hover:border-[hsl(var(--primary))]/30"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm font-medium truncate">{a.resumeName}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                        {a.jobTitle || "No job description"} · {formatDate(a.createdAt)}
                      </p>
                      {/* Score bar */}
                      <div className="mt-2 h-1 w-32 rounded-full bg-[hsl(var(--muted))]">
                        <div
                          className={`h-1 rounded-full ${tone.bg} transition-all`}
                          style={{ width: scoreWidth }}
                        />
                      </div>
                    </div>
                    <Badge variant="muted" className={`${tone.text} shrink-0`}>
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
