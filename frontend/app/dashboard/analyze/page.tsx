"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

import { api, ApiError, type Resume } from "@/lib/api";
import { takePendingCheck } from "@/lib/pending-check";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dropzone } from "@/components/ui/dropzone";
import { Input, Label, Textarea } from "@/components/ui/input";

type Stage = "idle" | "uploading" | "analyzing";

export default function AnalyzePage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [useUpload, setUseUpload] = useState(true);
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const autoRunStarted = useRef(false);

  useEffect(() => {
    api
      .listResumes()
      .then((r) => {
        setResumes(r);
        if (r.length > 0) {
          setUseUpload(false);
          setSelectedResume(r[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const runAnalysis = async (resumeId: string) => {
    setStage("analyzing");
    const analysis = await api.analyze({
      resumeId,
      jobDescription: jobDescription.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined,
      company: company.trim() || undefined,
    });
    router.push(`/dashboard/analyze/${analysis.id}`);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (useUpload && !file) {
      setError("Please choose a resume file to upload.");
      return;
    }
    if (!useUpload && !selectedResume) {
      setError("Please select a previously uploaded resume.");
      return;
    }

    try {
      let resumeId = selectedResume;
      if (useUpload && file) {
        setStage("uploading");
        const uploaded = await api.uploadResume(file);
        resumeId = uploaded.id;
        setResumes((prev) => [uploaded, ...prev]);
      }

      await runAnalysis(resumeId);
    } catch (err: any) {
      const message =
        err instanceof ApiError
          ? err.message
          : err?.message || "Something went wrong while analyzing your resume.";
      setError(message);
      setStage("idle");
    }
  };

  // A check started on the home page is stashed before login; resume it here.
  useEffect(() => {
    if (autoRunStarted.current) return;
    const pending = takePendingCheck();
    if (!pending) return;
    autoRunStarted.current = true;
    setFile(pending.file);
    setUseUpload(true);
    setJobDescription(pending.jobDescription);

    (async () => {
      try {
        setStage("uploading");
        const uploaded = await api.uploadResume(pending.file);
        setResumes((prev) => [uploaded, ...prev]);
        setStage("analyzing");
        const analysis = await api.analyze({
          resumeId: uploaded.id,
          jobDescription: pending.jobDescription || undefined,
        });
        router.push(`/dashboard/analyze/${analysis.id}`);
      } catch (err: any) {
        const message =
          err instanceof ApiError
            ? err.message
            : err?.message || "Something went wrong while analyzing your resume.";
        setError(message);
        setStage("idle");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = stage !== "idle";
  const buttonLabel =
    stage === "uploading"
      ? "Uploading resume…"
      : stage === "analyzing"
        ? "Running AI analysis…"
        : "Run ATS analysis";

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Analyze a resume</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Upload a resume, paste the job description you are targeting, and get an ATS score with AI
          feedback.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Your resume</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {resumes.length > 0 && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={useUpload ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseUpload(true)}
                >
                  Upload new
                </Button>
                <Button
                  type="button"
                  variant={!useUpload ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseUpload(false)}
                >
                  Use saved ({resumes.length})
                </Button>
              </div>
            )}

            {useUpload ? (
              <Dropzone file={file} onFile={setFile} disabled={busy} />
            ) : (
              <div className="space-y-2">
                <Label htmlFor="resume">Saved resume</Label>
                <select
                  id="resume"
                  value={selectedResume}
                  onChange={(e) => setSelectedResume(e.target.value)}
                  disabled={busy}
                  className="h-10 w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fileName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Job description (optional)</CardTitle>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Adding a job description enables keyword gap matching and a job-fit review.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job title</Label>
                <Input
                  id="jobTitle"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Senior Backend Engineer"
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Inc."
                  disabled={busy}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jd">Job description text</Label>
              <Textarea
                id="jd"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job posting here…"
                disabled={busy}
                className="min-h-[180px]"
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="rounded-md bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          <Sparkles className="h-4 w-4" />
          {buttonLabel}
        </Button>
      </form>
    </div>
  );
}
