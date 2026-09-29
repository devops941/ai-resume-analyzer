"use client";

import { useEffect, useState } from "react";
import { Activity, Download, FileText, Users, BarChart3 } from "lucide-react";

import { api, ApiError, type AdminStats, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate, scoreTone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function AdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== "admin") {
      setError("You do not have access to the admin dashboard.");
      setLoading(false);
      return;
    }
    Promise.all([api.adminStats(), api.adminUsers()])
      .then(([s, u]) => {
        setStats(s);
        setUsers(u);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load admin data"))
      .finally(() => setLoading(false));
  }, [user]);

  const downloadReport = async () => {
    const token = window.localStorage.getItem("token");
    const res = await fetch(api.reportUrl(), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ats-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading admin data…</p>;
  }

  if (error) {
    return <p className="rounded-md bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>;
  }

  const cards = [
    { label: "Total users", value: stats?.totalUsers || 0, icon: Users },
    { label: "Total resumes", value: stats?.totalResumes || 0, icon: FileText },
    { label: "Total analyses", value: stats?.totalAnalyses || 0, icon: Activity },
    { label: "Average ATS score", value: stats?.averageAtsScore || 0, icon: BarChart3 },
  ];

  const maxKeyword = Math.max(1, ...(stats?.commonMissingKeywords || []).map((k) => k.count));

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admin dashboard</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Platform usage and ATS insights across all users.
          </p>
        </div>
        <Button variant="outline" onClick={downloadReport}>
          <Download className="h-4 w-4" /> Export CSV report
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Most common missing keywords</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(stats?.commonMissingKeywords || []).length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Not enough data yet.</p>
            ) : (
              stats!.commonMissingKeywords.map((k) => (
                <div key={k.keyword}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{k.keyword}</span>
                    <span className="text-[hsl(var(--muted-foreground))]">{k.count}</span>
                  </div>
                  <Progress value={(k.count / maxKeyword) * 100} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent analyses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(stats?.recentAnalyses || []).length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">No analyses yet.</p>
            ) : (
              stats!.recentAnalyses.map((a) => {
                const tone = scoreTone(a.atsScore);
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-md border border-[hsl(var(--border))] p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{a.resumeName}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {a.user} · {formatDate(a.createdAt)}
                      </p>
                    </div>
                    <Badge variant="muted" className={tone.text}>
                      {a.atsScore}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-md border border-[hsl(var(--border))] p-3"
              >
                <div>
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{u.email}</p>
                </div>
                <Badge variant={u.role === "admin" ? "success" : "muted"}>{u.role}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
