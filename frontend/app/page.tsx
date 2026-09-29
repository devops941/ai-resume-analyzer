import Link from "next/link";
import {
  ShieldCheck,
  Gauge,
  FileSearch,
  ListChecks,
  History,
  UploadCloud,
  Sparkles,
} from "lucide-react";

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
            href="/register"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-6 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <UploadCloud className="h-4 w-4" /> Get started free
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center rounded-md border border-[hsl(var(--border))] px-6 text-sm font-medium hover:bg-[hsl(var(--muted))]"
          >
            I already have an account
          </Link>
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
