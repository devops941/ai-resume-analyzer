"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Gauge,
  FileSearch,
  ListChecks,
  History,
  UploadCloud,
  Sparkles,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { setPendingCheck } from "@/lib/pending-check";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Label, Textarea } from "@/components/ui/input";

const features = [
  {
    icon: Gauge,
    title: "ATS Score out of 100",
    body: "Deterministic checks for formatting, sections, contact details and keywords.",
  },
  {
    icon: Sparkles,
    title: "AI content review",
    body: "Groq-powered feedback on clarity, impact and structure with strengths and weaknesses.",
  },
  {
    icon: ListChecks,
    title: "Keyword gap matching",
    body: "See exactly which keywords from the job description are missing from your resume.",
  },
  {
    icon: FileSearch,
    title: "Section-by-section tips",
    body: "Actionable rewrite suggestions for summary, experience and skills.",
  },
  {
    icon: History,
    title: "Analysis history",
    body: "Track your ATS score across resume versions over time.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by design",
    body: "JWT auth with role-based access; the AI key never leaves the backend.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [error, setError] = useState("");

  const onCheck = () => {
    if (!file) {
      setError("Please choose a resume file (PDF, DOCX or TXT) first.");
      return;
    }
    setError("");
    setPendingCheck({ file, jobDescription: jobDescription.trim() });
    router.push(user ? "/dashboard/analyze" : "/login?next=/dashboard/analyze");
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <section className="flex flex-col items-center text-center">
        <span className="mb-4 rounded-full border border-[hsl(var(--border))] px-3 py-1 text-xs text-[hsl(var(--muted-foreground))]">
          FastAPI · Next.js · MongoDB · Groq
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          AI <span className="gradient-text">Resume Analyzer</span> & ATS Checker
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[hsl(var(--muted-foreground))]">
          Upload your resume and optionally a job description. Get an instant ATS compatibility
          score, AI-written feedback and clear, actionable suggestions to raise your chances of
          passing automated screening.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="#check"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-6 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <UploadCloud className="h-4 w-4" /> Check my resume
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center rounded-md border border-[hsl(var(--border))] px-6 text-sm font-medium hover:bg-[hsl(var(--muted))]"
          >
            I already have an account
          </Link>
        </div>
      </section>

      <section id="check" className="mt-16">
        <div className="mx-auto max-w-2xl rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 card-glow sm:p-8">
          <div className="mb-5 text-center">
            <h2 className="text-xl font-semibold">Check your resume right here</h2>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              Upload a resume and run an instant ATS check. Sign in is required to run the
              analysis and save your report.
            </p>
          </div>

          <div className="space-y-4">
            <Dropzone file={file} onFile={setFile} />

            <div className="space-y-2">
              <Label htmlFor="home-jd">Job description (optional)</Label>
              <Textarea
                id="home-jd"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste a job posting to unlock keyword gap matching…"
              />
            </div>

            {error && (
              <p className="rounded-md bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>
            )}

            <Button size="lg" className="w-full" onClick={onCheck}>
              <Sparkles className="h-4 w-4" /> Check ATS score
            </Button>

            <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
              {user ? (
                <>
                  Signed in as {user.email}.{" "}
                  <Link href="/dashboard" className="text-indigo-400 hover:underline">
                    Go to dashboard
                  </Link>
                </>
              ) : (
                <>
                  You will be asked to{" "}
                  <Link href="/login" className="text-indigo-400 hover:underline">
                    sign in
                  </Link>{" "}
                  or{" "}
                  <Link href="/register" className="text-indigo-400 hover:underline">
                    create an account
                  </Link>{" "}
                  to run the check.
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 card-glow"
          >
            <Icon className="mb-3 h-6 w-6 text-indigo-400" />
            <h3 className="mb-1 font-semibold">{title}</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{body}</p>
          </div>
        ))}
      </section>

      <footer className="mt-20 border-t border-[hsl(var(--border))] pt-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
        AI Resume Analyzer & ATS Checker — academic project reference implementation.
      </footer>
    </main>
  );
}
