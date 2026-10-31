"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Sparkles, Trash2, Plus, Clock } from "lucide-react";

import { api, type AnalysisHistoryItem, type Resume } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    if (!confirm(`Delete resume "${name}"?`)) return;
    await api.deleteResume(id);
    setResumes((prev) => prev.filter((r) => r.id !== id));
    setAnalyses((prev) => prev.filter((a) => a.resumeName !== name));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Resumes</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Manage, view, and organize all resumes created in your account.
          </p>
        </div>
        <Link href="/dashboard/generate">
          <Button className="gap-2">
            <Sparkles className="h-4 w-4" /> Open Resume Generator
          </Button>
        </Link>
      </div>

      {/* Resumes List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-400" /> Saved Resumes ({resumes.length})
          </CardTitle>
          <CardDescription>
            All resume versions available for customization and export.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading resumes…</p>
          ) : resumes.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-[hsl(var(--border))] p-10 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--muted))]">
                <FileText className="h-6 w-6 text-[hsl(var(--muted-foreground))]" />
              </div>
              <p className="text-sm font-medium mb-1">No resumes yet</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4 max-w-sm">
                Use the AI Resume Generator to build your professional resume.
              </p>
              <Link href="/dashboard/generate">
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Create a Resume
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {resumes.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-4 hover:bg-[hsl(var(--muted))]/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.fileName}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {(r.fileSize / 1024).toFixed(1)} KB · {formatDate(r.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href="/dashboard/generate">
                      <Button variant="outline" size="sm" className="text-xs">
                        Open in Generator
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeResume(r.id, r.fileName)}
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Reports / Analyses if any exist */}
      {analyses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-indigo-400" /> Generated Analysis History ({analyses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analyses.map((a) => (
                <Link
                  key={a.id}
                  href={`/dashboard/analyze/${a.id}`}
                  className="flex items-center justify-between rounded-md border border-[hsl(var(--border))] p-3 transition-colors hover:bg-[hsl(var(--muted))]"
                >
                  <div>
                    <p className="text-sm font-medium">{a.resumeName}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {a.jobTitle || "Resume Analysis"} · {formatDate(a.createdAt)}
                    </p>
                  </div>
                  <span className="text-xs text-[hsl(var(--primary))]">View Report →</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
