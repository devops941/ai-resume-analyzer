"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Gauge } from "lucide-react";

import { api, ApiError, type AdminUserDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate, scoreTone } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const id = params.id as string;
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    if (user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    api
      .adminUser(id)
      .then(setDetail)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load user"))
      .finally(() => setLoading(false));
  }, [authLoading, user, id, router]);

  if (loading || authLoading) {
    return <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading user data…</p>;
  }

  if (error) {
    return <p className="rounded-md bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>;
  }

  if (!detail) return null;

  const { user: account, resumes, analyses } = detail;
  const scores = analyses.map((a) => a.atsScore);
  const avgScore = scores.length
    ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    : null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <Link
          href="/dashboard/admin"
          className="mb-4 inline-flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to admin
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{account.name}</h1>
          <Badge variant={account.role === "admin" ? "success" : "muted"}>{account.role}</Badge>
        </div>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {account.email} · Joined {formatDate(account.createdAt)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Resumes", value: resumes.length },
          { label: "Analyses", value: analyses.length },
          { label: "Average ATS score", value: avgScore ?? "-" },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-6">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-indigo-400" /> Analyses ({analyses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analyses.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No analyses yet.</p>
          ) : (
            <div className="space-y-2">
              {analyses.map((a) => {
                const tone = scoreTone(a.atsScore);
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-md border border-[hsl(var(--border))] p-3"
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
                  </div>
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
                  <Badge variant="muted">{r.fileType.toUpperCase()}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
