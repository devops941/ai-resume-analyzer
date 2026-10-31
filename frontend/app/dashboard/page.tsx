"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Sparkles,
  Layout,
  Download,
  Plus,
  ArrowRight,
  FilePen,
  Clock,
  Trash2,
} from "lucide-react";

import { api, type Resume } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const templates = [
  {
    id: "modern",
    name: "Modern",
    desc: "Blue accents, clean lines, balanced margins",
    accent: "#2563eb",
  },
  {
    id: "executive",
    name: "Executive",
    desc: "Navy header bar, corporate leadership feel",
    accent: "#0f172a",
  },
  {
    id: "minimal",
    name: "Minimal",
    desc: "Ultra-clean whitespace rhythm, slate gray typography",
    accent: "#64748b",
  },
  {
    id: "classic",
    name: "Classic",
    desc: "Timeless serif hierarchy, centered header style",
    accent: "#1e293b",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listResumes()
      .then(setResumes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      label: "Resumes Created",
      value: resumes.length,
      icon: FileText,
      accent: "border-l-blue-500",
    },
    {
      label: "Available Templates",
      value: "4 Styles",
      icon: Layout,
      accent: "border-l-indigo-500",
    },
    {
      label: "Export Formats",
      value: "PDF & DOCX",
      icon: Download,
      accent: "border-l-emerald-500",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
            Create, customize, and export professional AI-generated resumes.
          </p>
        </div>
        <Link href="/dashboard/generate">
          <Button className="gap-2 shadow-sm">
            <Sparkles className="h-4 w-4" /> Open Resume Generator
          </Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, accent }) => (
          <Card key={label} className={`border-l-4 ${accent} rounded-xl`}>
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

      {/* Quick-Start: Templates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Choose a Template to Generate</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Select any style to start building with the AI generator.
            </p>
          </div>
          <Link
            href="/dashboard/generate"
            className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-1 font-medium"
          >
            Launch Builder <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {templates.map((tpl) => (
            <Card
              key={tpl.id}
              className="group hover:border-[hsl(var(--primary))]/50 transition-all flex flex-col justify-between"
            >
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div>
                  <div
                    className="h-24 rounded-md mb-3 p-3 flex flex-col justify-between border border-[hsl(var(--border))]"
                    style={{ background: tpl.id === "executive" ? "#0f172a" : "#ffffff" }}
                  >
                    <div>
                      <div
                        className="h-2 w-20 rounded mb-1"
                        style={{ background: tpl.id === "executive" ? "#ffffff" : tpl.accent }}
                      />
                      <div
                        className="h-1 w-24 rounded mb-2"
                        style={{ background: tpl.id === "executive" ? "#64748b" : "#cbd5e1" }}
                      />
                      <div
                        className="h-px w-full mb-1.5"
                        style={{ background: tpl.accent, opacity: 0.6 }}
                      />
                      <div
                        className="h-1 w-full rounded mb-1"
                        style={{ background: tpl.id === "executive" ? "#334155" : "#e2e8f0" }}
                      />
                    </div>
                    <span
                      className="text-[9px] font-mono"
                      style={{ color: tpl.id === "executive" ? "#94a3b8" : "#64748b" }}
                    >
                      {tpl.name}
                    </span>
                  </div>

                  <h3 className="font-semibold text-sm mb-0.5">{tpl.name}</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                    {tpl.desc}
                  </p>
                </div>

                <Link href="/dashboard/generate">
                  <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                    <FilePen className="w-3.5 h-3.5" /> Build with {tpl.name}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Saved Resumes Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle>My Resumes</CardTitle>
            <CardDescription>Resumes saved in your account.</CardDescription>
          </div>
          <Link
            href="/dashboard/history"
            className="text-xs text-[hsl(var(--primary))] hover:underline"
          >
            Manage all
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading resumes…</p>
          ) : resumes.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-[hsl(var(--border))] p-8 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                <FileText className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium mb-1">No resumes saved yet</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4 max-w-sm">
                Open the AI Resume Generator to craft your resume and export it in PDF or Word.
              </p>
              <Link href="/dashboard/generate">
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Create Your First Resume
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {resumes.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-3.5 hover:bg-[hsl(var(--muted))]/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.fileName}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {(r.fileSize / 1024).toFixed(1)} KB · {formatDate(r.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Link href="/dashboard/generate">
                    <Button variant="ghost" size="sm" className="text-xs">
                      Open in Generator
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
