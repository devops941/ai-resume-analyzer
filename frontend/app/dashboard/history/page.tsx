"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Gauge } from "lucide-react";

import { api, type AnalysisHistoryItem, type Resume } from "@/lib/api";
import { formatDate, scoreTone } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<AnalysisHistoryItem[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.listAnalyses(), api.listResumes()])
      .then(([a, r]) => {
        setAnalyses(a);
        setResumes(r);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const removeResume = async (id: string, name: string) => {
    if (!confirm(`Delete resume "${name}" and its analyses?`)) return;
    await api.deleteResume(id);
    setResumes((prev) => prev.filter((r) => r.id !== id));
    setAnalyses((prev) => prev.filter((a) => a.resumeName !== name));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Every resume you uploaded and every ATS report you generated.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-indigo-400" /> Analyses ({analyses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading…</p>
          ) : analyses.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No analyses yet.</p>
          ) : (
            <div className="space-y-2">
              {analyses.map((a) => {
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-400" /> Resumes ({resumes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resumes.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No resumes uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {resumes.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-md border border-[hsl(var(--border))] p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{r.fileName}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {(r.fileSize / 1024).toFixed(1)} KB · {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeResume(r.id, r.fileName)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
