"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Gauge, FileSearch, ListChecks, History, UploadCloud, Sparkles, Brain, ArrowRight
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { setPendingCheck } from "@/lib/pending-check";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Label, Textarea } from "@/components/ui/input";

const features = [
  { icon: Gauge, title: "ATS Score", body: "Deterministic checks for formatting, sections, contacts and keywords." },
  { icon: Brain, title: "AI Feedback", body: "Claude-powered insights on clarity, impact and structure." },
  { icon: ListChecks, title: "Keyword Gaps", body: "See exactly which job description keywords are missing." },
  { icon: FileSearch, title: "Section Tips", body: "Actionable rewrites for summary, experience and skills." },
  { icon: History, title: "Score History", body: "Track your ATS score across resume versions." },
  { icon: ShieldCheck, title: "Secure", body: "JWT auth with role-based access; AI keys stay on the server." },
];

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [error, setError] = useState("");

  const onCheck = () => {
    if (!file) { setError("Please choose a resume file (PDF, DOCX or TXT) first."); return; }
    setError("");
    setPendingCheck({ file, jobDescription: jobDescription.trim() });
    router.push(user ? "/dashboard/analyze" : "/login?next=/dashboard/analyze");
  };

  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
      {/* Minimal top nav */}
      <header className="border-b border-[hsl(var(--border))] px-4">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[hsl(var(--primary))] text-xs font-bold text-white">AI</span>
            <span className="font-semibold text-sm">Resume Analyzer</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">Sign in</Link>
            <Link href="/register" className="inline-flex h-8 items-center rounded-md bg-[hsl(var(--primary))] px-4 text-xs font-medium text-white hover:opacity-90 transition-opacity">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4">
        {/* Hero */}
        <section className="py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1 text-xs text-[hsl(var(--muted-foreground))] mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Powered by Claude AI + Groq
          </div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl leading-tight mb-6">
            Beat the <span className="gradient-text">ATS filter</span>
            <br />before it beats you
          </h1>
          <p className="text-lg text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto mb-8">
            Upload your resume and get an instant ATS compatibility score, AI-written feedback,
            keyword gap analysis, and actionable suggestions — in seconds.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="#check" className="inline-flex h-11 items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-6 text-sm font-medium text-white hover:opacity-90 transition-opacity">
              <UploadCloud className="h-4 w-4" /> Analyze my resume
            </Link>
            {user ? (
              <Link href="/dashboard" className="inline-flex h-11 items-center gap-2 rounded-md border border-[hsl(var(--border))] px-6 text-sm font-medium hover:bg-[hsl(var(--muted))] transition-colors">
                Go to dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link href="/login" className="inline-flex h-11 items-center rounded-md border border-[hsl(var(--border))] px-6 text-sm font-medium hover:bg-[hsl(var(--muted))] transition-colors">
                Sign in
              </Link>
            )}
          </div>
        </section>

        {/* Upload card */}
        <section id="check" className="pb-20">
          <div className="mx-auto max-w-2xl rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 card-glow">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-1">Check your resume now</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                No account needed to try. Sign in is required to save results.
              </p>
            </div>
            <div className="space-y-5">
              <Dropzone file={file} onFile={setFile} />
              <div className="space-y-2">
                <Label htmlFor="home-jd">Job description <span className="text-[hsl(var(--muted-foreground))]">(optional)</span></Label>
                <Textarea id="home-jd" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste a job posting to unlock keyword gap analysis…" />
              </div>
              {error && <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-300">{error}</p>}
              <Button size="lg" className="w-full" onClick={onCheck}>
                <Sparkles className="h-4 w-4" /> Analyze ATS score
              </Button>
              <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
                {user ? (
                  <>Signed in as <span className="text-white">{user.email}</span> · <Link href="/dashboard" className="text-[hsl(var(--primary))] hover:underline">Dashboard</Link></>
                ) : (
                  <>You&apos;ll be asked to <Link href="/login" className="text-[hsl(var(--primary))] hover:underline">sign in</Link> to save your report</>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section className="pb-24">
          <h2 className="text-center text-2xl font-semibold mb-10">Everything you need to land the interview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 hover:border-[hsl(var(--primary))]/40 transition-colors">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10">
                  <Icon className="h-5 w-5 text-[hsl(var(--primary))]" />
                </div>
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[hsl(var(--border))] py-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
        AI Resume Analyzer — Final Year Project · FastAPI · Next.js · MongoDB · Claude AI
      </footer>
    </div>
  );
}
