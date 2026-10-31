"use client";

import Link from "next/link";
import {
  Sparkles,
  FileText,
  Layout,
  Download,
  Wand2,
  Layers,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  FilePen,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const templates = [
  {
    id: "modern",
    name: "Modern",
    tagline: "Blue accents, clean divider lines",
    accent: "#2563eb",
    popular: true,
  },
  {
    id: "executive",
    name: "Executive",
    tagline: "Bold dark navy banner, corporate layout",
    accent: "#0f172a",
    popular: false,
  },
  {
    id: "minimal",
    name: "Minimal",
    tagline: "Ultra-clean whitespace rhythm, slate gray typography",
    accent: "#64748b",
    popular: false,
  },
  {
    id: "classic",
    name: "Classic",
    tagline: "Timeless serif hierarchy, centered header style",
    accent: "#1e293b",
    popular: false,
  },
];

const features = [
  {
    icon: Wand2,
    title: "AI Bullet Enhancement",
    body: "Transforms raw tasks into high-impact, achievement-oriented bullets powered by Claude AI and Groq.",
  },
  {
    icon: Layout,
    title: "4 Executive Templates",
    body: "Modern, Executive, Minimal, and Classic designs engineered for maximum clarity and recruiter readability.",
  },
  {
    icon: Sparkles,
    title: "Dual Generation Modes",
    body: "Fill out a guided 7-step form or type a natural language prompt describing your career background.",
  },
  {
    icon: FileText,
    title: "Live Paper Preview",
    body: "Inspect your resume in an interactive, print-scaled paper layout before downloading.",
  },
  {
    icon: Download,
    title: "Instant PDF & Word Export",
    body: "Download production-grade ReportLab PDFs or editable DOCX files in a single click.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Private",
    body: "Protected by JWT authentication; your career details and AI credentials remain strictly confidential.",
  },
];

const steps = [
  {
    step: "01",
    title: "Enter Career Details",
    desc: "Use the step-by-step form or write a prompt summarizing your experience, education, and skills.",
  },
  {
    step: "02",
    title: "AI Crafts Your Content",
    desc: "AI sharpens your summary, formats achievements, and organizes sections into an executive structure.",
  },
  {
    step: "03",
    title: "Choose Template & Export",
    desc: "Switch between 4 visual layouts in real-time, then download pixel-perfect PDF or DOCX files.",
  },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/95 backdrop-blur-sm px-4">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[hsl(var(--primary))] text-xs font-bold text-white">
              AI
            </span>
            <span className="font-semibold text-sm">Resume Generator</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="#templates"
              className="hidden sm:inline-block text-sm text-[hsl(var(--muted-foreground))] hover:text-white transition-colors"
            >
              Templates
            </Link>
            <Link
              href="#features"
              className="hidden sm:inline-block text-sm text-[hsl(var(--muted-foreground))] hover:text-white transition-colors"
            >
              Features
            </Link>
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex h-8 items-center rounded-md bg-[hsl(var(--primary))] px-4 text-xs font-medium text-white hover:opacity-90 transition-opacity"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-[hsl(var(--muted-foreground))] hover:text-white transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-8 items-center rounded-md bg-[hsl(var(--primary))] px-4 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4">
        {/* Hero Section */}
        <section className="py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-1 text-xs text-[hsl(var(--muted-foreground))] mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            AI-Powered Resume Builder • Export to PDF & Word
          </div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl leading-tight mb-6">
            Build a <span className="gradient-text">Job-Winning Resume</span>
            <br />with AI in Minutes
          </h1>
          <p className="text-lg text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto mb-8">
            Create polished, executive-ready resumes tailored to your target roles. Choose from
            4 professionally designed templates with instant PDF & Word download.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={user ? "/dashboard/generate" : "/login?next=/dashboard/generate"}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-6 text-sm font-medium text-white hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20"
            >
              <Sparkles className="h-4 w-4" /> Launch Resume Generator
            </Link>
            <Link
              href="#templates"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-[hsl(var(--border))] px-6 text-sm font-medium hover:bg-[hsl(var(--muted))] transition-colors"
            >
              <Layout className="h-4 w-4" /> Explore Templates
            </Link>
          </div>
        </section>

        {/* Templates Showcase */}
        <section id="templates" className="py-16 border-t border-[hsl(var(--border))]">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-3">Choose Your Design Template</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Each template is crafted with professional typography, balanced margins, and clean section breaks.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="group relative rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 hover:border-[hsl(var(--primary))] transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail Mockup */}
                  <div
                    className="w-full h-44 rounded-lg mb-4 overflow-hidden border border-[hsl(var(--border))] p-3 flex flex-col justify-between"
                    style={{ background: tpl.id === "executive" ? "#0f172a" : "#ffffff" }}
                  >
                    <div>
                      <div
                        className="h-3 w-28 rounded mb-2"
                        style={{ background: tpl.id === "executive" ? "#ffffff" : tpl.accent }}
                      />
                      <div
                        className="h-1.5 w-36 rounded mb-3"
                        style={{ background: tpl.id === "executive" ? "#64748b" : "#cbd5e1" }}
                      />
                      <div
                        className="h-px w-full mb-3"
                        style={{ background: tpl.accent, opacity: 0.6 }}
                      />
                      <div
                        className="h-2 w-16 rounded mb-1.5"
                        style={{ background: tpl.accent }}
                      />
                      <div
                        className="h-1.5 w-full rounded mb-1"
                        style={{ background: tpl.id === "executive" ? "#334155" : "#e2e8f0" }}
                      />
                      <div
                        className="h-1.5 w-4/5 rounded mb-1"
                        style={{ background: tpl.id === "executive" ? "#334155" : "#e2e8f0" }}
                      />
                    </div>
                    <div
                      className="text-[10px] font-mono"
                      style={{ color: tpl.id === "executive" ? "#94a3b8" : "#64748b" }}
                    >
                      {tpl.name} Style
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-base">{tpl.name}</h3>
                    {tpl.popular && (
                      <span className="rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 text-[10px] font-medium">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
                    {tpl.tagline}
                  </p>
                </div>

                <Link
                  href={user ? "/dashboard/generate" : "/login?next=/dashboard/generate"}
                  className="inline-flex items-center justify-center gap-1.5 w-full rounded-md bg-[hsl(var(--muted))] hover:bg-[hsl(var(--primary))] hover:text-white px-3 py-2 text-xs font-medium transition-colors"
                >
                  <FilePen className="w-3.5 h-3.5" /> Use Template
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 border-t border-[hsl(var(--border))]">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-3">How AI Resume Generator Works</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              From blank page to executive-ready resume in three seamless steps.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.step}
                className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 relative"
              >
                <span className="text-3xl font-extrabold text-[hsl(var(--primary))]/20 block mb-3">
                  {s.step}
                </span>
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-16 border-t border-[hsl(var(--border))]">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-3">Engineered for Job Seekers</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Everything required to produce professional resumes that impress recruiters and hiring managers.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 hover:border-[hsl(var(--primary))]/40 transition-colors"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-base mb-1.5">{title}</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="py-20 text-center">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-gradient-to-b from-[hsl(var(--card))] to-[hsl(var(--muted))] p-10 sm:p-14">
            <h2 className="text-3xl font-bold mb-3 sm:text-4xl">
              Ready to Craft Your Standout Resume?
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-xl mx-auto mb-6">
              Launch the AI Resume Generator now and create an executive-level resume ready for export.
            </p>
            <Link
              href={user ? "/dashboard/generate" : "/login?next=/dashboard/generate"}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-6 text-sm font-medium text-white hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/25"
            >
              <Sparkles className="h-4 w-4" /> Open Resume Generator
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[hsl(var(--border))] py-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
        AI Resume Generator — Final Year Project • Next.js • FastAPI • Claude AI • ReportLab
      </footer>
    </div>
  );
}
