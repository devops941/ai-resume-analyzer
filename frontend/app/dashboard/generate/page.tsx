"use client";

import { useRef, useState } from "react";
import {
  Plus,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  FileDown,
  FileText,
  RefreshCw,
  User,
  Briefcase,
  GraduationCap,
  Wrench,
  FolderGit2,
  Award,
  FileEdit,
} from "lucide-react";

import {
  api,
  type GenerateResumeRequest,
  type WorkExperienceInput,
  type EducationInput,
  type ProjectInput,
  type CertificationInput,
} from "@/lib/api";
import {
  TEMPLATES,
  ResumeTemplateRenderer,
  type TemplateId,
} from "@/components/resume-templates";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  targetRole: string;
}

interface ExperienceEntry extends WorkExperienceInput {
  bulletsRaw: string; // textarea value before splitting
}

interface GeneratedData {
  resumeData: Record<string, unknown>;
  rawText: string;
}

const SKILL_SUGGESTIONS = [
  "React",
  "Node.js",
  "Python",
  "TypeScript",
  "JavaScript",
  "Next.js",
  "PostgreSQL",
  "MongoDB",
  "Docker",
  "AWS",
  "Git",
  "REST APIs",
  "GraphQL",
  "Tailwind CSS",
  "FastAPI",
  "Django",
  "Express.js",
  "Redis",
  "Kubernetes",
  "CI/CD",
];

const STEP_LABELS = [
  { label: "Personal", icon: User },
  { label: "Summary", icon: FileEdit },
  { label: "Experience", icon: Briefcase },
  { label: "Education", icon: GraduationCap },
  { label: "Skills", icon: Wrench },
  { label: "Projects", icon: FolderGit2 },
  { label: "Certifications", icon: Award },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function splitBullets(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function emptyExperience(): ExperienceEntry {
  return {
    company: "",
    role: "",
    startDate: "",
    endDate: "Present",
    location: "",
    bullets: [],
    bulletsRaw: "",
  };
}

function emptyEducation(): EducationInput {
  return { institution: "", degree: "", field: "", startYear: "", endYear: "", gpa: "" };
}

function emptyProject(): ProjectInput {
  return { name: "", techStack: "", description: "" };
}

function emptyCertification(): CertificationInput {
  return { name: "", issuer: "", year: "" };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}

function SectionNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-[hsl(var(--muted-foreground))] italic">{children}</p>
  );
}

function Divider() {
  return <hr className="border-[hsl(var(--border))]" />;
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round(((current - 1) / (total - 1)) * 100);

  return (
    <div className="mb-8">
      {/* Step icons row */}
      <div className="flex justify-between mb-3">
        {STEP_LABELS.map((step, i) => {
          const stepNum = i + 1;
          const done = stepNum < current;
          const active = stepNum === current;
          const Icon = step.icon;

          return (
            <div key={step.label} className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={[
                  "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all",
                  done
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white"
                    : active
                      ? "border-[hsl(var(--primary))] bg-indigo-500/20 text-indigo-300"
                      : "border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
                ].join(" ")}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={[
                  "text-[10px] font-medium hidden sm:block",
                  active
                    ? "text-indigo-300"
                    : done
                      ? "text-slate-300"
                      : "text-[hsl(var(--muted-foreground))]",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress track */}
      <div className="h-1.5 rounded-full bg-[hsl(var(--muted))]">
        <div
          className="h-full rounded-full bg-[hsl(var(--primary))] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
        Step {current} of {total} — {STEP_LABELS[current - 1]?.label}
      </p>
    </div>
  );
}

// ── Step 1 — Personal Info ────────────────────────────────────────────────────

function StepPersonal({
  data,
  onChange,
}: {
  data: PersonalInfo;
  onChange: (d: PersonalInfo) => void;
}) {
  const set = (key: keyof PersonalInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...data, [key]: e.target.value });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>
          Your contact details and the role you are targeting.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="name">
              Full Name <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="name"
              value={data.name}
              onChange={set("name")}
              placeholder="Jane Doe"
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="targetRole">
              Target Role <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="targetRole"
              value={data.targetRole}
              onChange={set("targetRole")}
              placeholder="Full Stack Developer"
            />
          </FieldGroup>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="email">
              Email <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={data.email}
              onChange={set("email")}
              placeholder="jane@example.com"
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="phone">
              Phone <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="phone"
              value={data.phone}
              onChange={set("phone")}
              placeholder="+1 555 000 0000"
            />
          </FieldGroup>
        </div>

        <FieldGroup>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={data.location}
            onChange={set("location")}
            placeholder="San Francisco, CA"
          />
        </FieldGroup>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="linkedin">LinkedIn URL</Label>
            <Input
              id="linkedin"
              value={data.linkedin}
              onChange={set("linkedin")}
              placeholder="https://linkedin.com/in/janedoe"
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="github">GitHub URL</Label>
            <Input
              id="github"
              value={data.github}
              onChange={set("github")}
              placeholder="https://github.com/janedoe"
            />
          </FieldGroup>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Step 2 — Professional Summary ─────────────────────────────────────────────

function StepSummary({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Professional Summary</CardTitle>
        <CardDescription>
          A short paragraph that appears at the top of your resume.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <FieldGroup>
          <Label htmlFor="summary">Summary</Label>
          <Textarea
            id="summary"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Results-driven software engineer with 5+ years of experience building scalable web applications…"
            className="min-h-[160px]"
          />
        </FieldGroup>
        <SectionNote>
          Leave blank and the AI will write a compelling summary for you based on your
          experience and target role.
        </SectionNote>
      </CardContent>
    </Card>
  );
}

// ── Step 3 — Work Experience ──────────────────────────────────────────────────

function ExperienceCard({
  entry,
  index,
  onChange,
  onRemove,
}: {
  entry: ExperienceEntry;
  index: number;
  onChange: (e: ExperienceEntry) => void;
  onRemove: () => void;
}) {
  const set =
    (key: keyof ExperienceEntry) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...entry, [key]: e.target.value });

  return (
    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-200">
          Experience #{index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup>
          <Label>Company</Label>
          <Input value={entry.company} onChange={set("company")} placeholder="Acme Inc." />
        </FieldGroup>
        <FieldGroup>
          <Label>Role / Title</Label>
          <Input value={entry.role} onChange={set("role")} placeholder="Software Engineer" />
        </FieldGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FieldGroup>
          <Label>Start Date</Label>
          <Input value={entry.startDate} onChange={set("startDate")} placeholder="Jan 2022" />
        </FieldGroup>
        <FieldGroup>
          <Label>End Date</Label>
          <Input value={entry.endDate} onChange={set("endDate")} placeholder="Present" />
        </FieldGroup>
        <FieldGroup>
          <Label>Location</Label>
          <Input value={entry.location ?? ""} onChange={set("location")} placeholder="Remote" />
        </FieldGroup>
      </div>

      <FieldGroup>
        <Label>Bullet Points</Label>
        <Textarea
          value={entry.bulletsRaw}
          onChange={set("bulletsRaw")}
          placeholder={
            "Led migration of monolith to microservices, reducing deploy time by 40%\nBuilt REST APIs serving 2M+ daily requests"
          }
          className="min-h-[100px]"
        />
        <SectionNote>
          One bullet per line, or separate with commas. AI will polish each bullet.
        </SectionNote>
      </FieldGroup>
    </div>
  );
}

function StepExperience({
  entries,
  onChange,
}: {
  entries: ExperienceEntry[];
  onChange: (e: ExperienceEntry[]) => void;
}) {
  const update = (i: number, val: ExperienceEntry) =>
    onChange(entries.map((e, idx) => (idx === i ? val : e)));
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const add = () => onChange([...entries, emptyExperience()]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Work Experience</CardTitle>
          <CardDescription>
            Add your jobs in reverse chronological order (most recent first).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {entries.length === 0 && (
            <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
              No experience added yet. Click below to add one.
            </p>
          )}
          {entries.map((e, i) => (
            <ExperienceCard
              key={i}
              entry={e}
              index={i}
              onChange={(val) => update(i, val)}
              onRemove={() => remove(i)}
            />
          ))}
          <Button type="button" variant="outline" onClick={add} className="w-full">
            <Plus className="w-4 h-4" />
            Add Experience
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Step 4 — Education ────────────────────────────────────────────────────────

function EducationCard({
  entry,
  index,
  onChange,
  onRemove,
}: {
  entry: EducationInput;
  index: number;
  onChange: (e: EducationInput) => void;
  onRemove: () => void;
}) {
  const set =
    (key: keyof EducationInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...entry, [key]: e.target.value });

  return (
    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-200">Education #{index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <FieldGroup>
        <Label>Institution</Label>
        <Input
          value={entry.institution}
          onChange={set("institution")}
          placeholder="Massachusetts Institute of Technology"
        />
      </FieldGroup>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup>
          <Label>Degree</Label>
          <Input value={entry.degree} onChange={set("degree")} placeholder="B.S." />
        </FieldGroup>
        <FieldGroup>
          <Label>Field of Study</Label>
          <Input
            value={entry.field}
            onChange={set("field")}
            placeholder="Computer Science"
          />
        </FieldGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FieldGroup>
          <Label>Start Year</Label>
          <Input value={entry.startYear} onChange={set("startYear")} placeholder="2018" />
        </FieldGroup>
        <FieldGroup>
          <Label>End Year</Label>
          <Input value={entry.endYear} onChange={set("endYear")} placeholder="2022" />
        </FieldGroup>
        <FieldGroup>
          <Label>GPA (optional)</Label>
          <Input value={entry.gpa ?? ""} onChange={set("gpa")} placeholder="3.8" />
        </FieldGroup>
      </div>
    </div>
  );
}

function StepEducation({
  entries,
  onChange,
}: {
  entries: EducationInput[];
  onChange: (e: EducationInput[]) => void;
}) {
  const update = (i: number, val: EducationInput) =>
    onChange(entries.map((e, idx) => (idx === i ? val : e)));
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const add = () => onChange([...entries, emptyEducation()]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Education</CardTitle>
        <CardDescription>Your degrees and academic background.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.length === 0 && (
          <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
            No education added yet. Click below to add one.
          </p>
        )}
        {entries.map((e, i) => (
          <EducationCard
            key={i}
            entry={e}
            index={i}
            onChange={(val) => update(i, val)}
            onRemove={() => remove(i)}
          />
        ))}
        <Button type="button" variant="outline" onClick={add} className="w-full">
          <Plus className="w-4 h-4" />
          Add Education
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Step 5 — Skills ───────────────────────────────────────────────────────────

const DEFAULT_SKILL_CATEGORIES = [
  "Languages",
  "Frontend",
  "Backend",
  "Database",
  "Cloud & DevOps",
  "Messaging",
  "Payments & Auth",
  "AI Dev Tools",
  "Tools",
];

function StepSkills({
  skills,
  onChange,
}: {
  skills: Record<string, string[]>;
  onChange: (s: Record<string, string[]>) => void;
}) {
  const [catInput, setCatInput] = useState("");
  const [skillInputs, setSkillInputs] = useState<Record<string, string>>({});

  const existingCategories = Object.keys(skills);
  const unusedDefaults = DEFAULT_SKILL_CATEGORIES.filter((c) => !existingCategories.includes(c));

  const addCategory = (cat: string) => {
    const trimmed = cat.trim();
    if (!trimmed || skills[trimmed] !== undefined) return;
    onChange({ ...skills, [trimmed]: [] });
    setCatInput("");
  };

  const removeCategory = (cat: string) => {
    const next = { ...skills };
    delete next[cat];
    onChange(next);
  };

  const addSkillToCategory = (cat: string, skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed || (skills[cat] || []).includes(trimmed)) return;
    onChange({ ...skills, [cat]: [...(skills[cat] || []), trimmed] });
    setSkillInputs((prev) => ({ ...prev, [cat]: "" }));
  };

  const removeSkillFromCategory = (cat: string, skill: string) => {
    onChange({ ...skills, [cat]: (skills[cat] || []).filter((s) => s !== skill) });
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, cat: string) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkillToCategory(cat, skillInputs[cat] || "");
    }
  };

  const totalSkills = Object.values(skills).reduce((a, b) => a + b.length, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Technical Skills</CardTitle>
        <CardDescription>
          Add skills grouped by category — this creates a professional skills table like a senior resume.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Quick-add default categories */}
        {unusedDefaults.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Quick add category:</p>
            <div className="flex flex-wrap gap-2">
              {unusedDefaults.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => addCategory(cat)}
                  className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/60 px-2.5 py-0.5 text-xs text-[hsl(var(--muted-foreground))] hover:border-indigo-500/50 hover:text-indigo-300 transition-colors"
                >
                  <Plus className="w-2.5 h-2.5" />
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom category input */}
        <div className="flex gap-2">
          <Input
            value={catInput}
            onChange={(e) => setCatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(catInput); } }}
            placeholder="Custom category name…"
            className="flex-1"
          />
          <Button type="button" variant="outline" size="sm" onClick={() => addCategory(catInput)}>
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>

        {/* Category skill rows */}
        {Object.entries(skills).map(([cat, catSkills]) => (
          <div key={cat} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">{cat}</span>
              <button
                type="button"
                onClick={() => removeCategory(cat)}
                className="text-[hsl(var(--muted-foreground))] hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Skill tags */}
            <div className="flex flex-wrap gap-1.5">
              {catSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 border border-indigo-500/25 px-2 py-0.5 text-xs text-indigo-200"
                >
                  {skill}
                  <button type="button" onClick={() => removeSkillFromCategory(cat, skill)} className="text-indigo-400 hover:text-white ml-0.5">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
              <input
                value={skillInputs[cat] || ""}
                onChange={(e) => setSkillInputs((prev) => ({ ...prev, [cat]: e.target.value }))}
                onKeyDown={(e) => handleSkillKeyDown(e, cat)}
                onBlur={() => { if (skillInputs[cat]?.trim()) addSkillToCategory(cat, skillInputs[cat]); }}
                placeholder="Type skill, press Enter…"
                className="flex-1 min-w-[120px] bg-transparent text-xs outline-none placeholder:text-[hsl(var(--muted-foreground))] py-0.5"
              />
            </div>
          </div>
        ))}

        {Object.keys(skills).length === 0 && (
          <p className="text-sm text-center text-[hsl(var(--muted-foreground))] py-4">
            Add a category above to start grouping your skills.
          </p>
        )}

        {totalSkills > 0 && (
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {totalSkills} skill{totalSkills !== 1 ? "s" : ""} across {Object.keys(skills).length} categories
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Step 6 — Projects ─────────────────────────────────────────────────────────

function ProjectCard({
  entry,
  index,
  onChange,
  onRemove,
}: {
  entry: ProjectInput;
  index: number;
  onChange: (e: ProjectInput) => void;
  onRemove: () => void;
}) {
  const set =
    (key: keyof ProjectInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...entry, [key]: e.target.value });

  return (
    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-200">Project #{index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup>
          <Label>Project Name</Label>
          <Input value={entry.name} onChange={set("name")} placeholder="Portfolio Website" />
        </FieldGroup>
        <FieldGroup>
          <Label>Tech Stack</Label>
          <Input
            value={entry.techStack}
            onChange={set("techStack")}
            placeholder="React, Next.js, Tailwind CSS"
          />
        </FieldGroup>
      </div>

      <FieldGroup>
        <Label>Description</Label>
        <Textarea
          value={entry.description}
          onChange={set("description")}
          placeholder="A personal portfolio built with Next.js and deployed on Vercel, showcasing projects and blog posts…"
          className="min-h-[80px]"
        />
      </FieldGroup>
    </div>
  );
}

function StepProjects({
  entries,
  onChange,
}: {
  entries: ProjectInput[];
  onChange: (e: ProjectInput[]) => void;
}) {
  const update = (i: number, val: ProjectInput) =>
    onChange(entries.map((e, idx) => (idx === i ? val : e)));
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const add = () => onChange([...entries, emptyProject()]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projects</CardTitle>
        <CardDescription>
          Highlight side projects, open-source contributions, or academic work.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.length === 0 && (
          <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
            No projects added yet. Click below to add one.
          </p>
        )}
        {entries.map((e, i) => (
          <ProjectCard
            key={i}
            entry={e}
            index={i}
            onChange={(val) => update(i, val)}
            onRemove={() => remove(i)}
          />
        ))}
        <Button type="button" variant="outline" onClick={add} className="w-full">
          <Plus className="w-4 h-4" />
          Add Project
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Step 7 — Certifications ───────────────────────────────────────────────────

function CertCard({
  entry,
  index,
  onChange,
  onRemove,
}: {
  entry: CertificationInput;
  index: number;
  onChange: (e: CertificationInput) => void;
  onRemove: () => void;
}) {
  const set =
    (key: keyof CertificationInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...entry, [key]: e.target.value });

  return (
    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-200">
          Certification #{index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <FieldGroup>
            <Label>Certification Name</Label>
            <Input
              value={entry.name}
              onChange={set("name")}
              placeholder="AWS Certified Developer"
            />
          </FieldGroup>
        </div>
        <FieldGroup>
          <Label>Issuer (optional)</Label>
          <Input
            value={entry.issuer ?? ""}
            onChange={set("issuer")}
            placeholder="Amazon Web Services"
          />
        </FieldGroup>
        <FieldGroup>
          <Label>Year (optional)</Label>
          <Input value={entry.year ?? ""} onChange={set("year")} placeholder="2024" />
        </FieldGroup>
      </div>
    </div>
  );
}

function StepCertifications({
  entries,
  onChange,
}: {
  entries: CertificationInput[];
  onChange: (e: CertificationInput[]) => void;
}) {
  const update = (i: number, val: CertificationInput) =>
    onChange(entries.map((e, idx) => (idx === i ? val : e)));
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const add = () => onChange([...entries, emptyCertification()]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Certifications</CardTitle>
        <CardDescription>
          Professional certifications, licenses, or online course completions. (Optional)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.length === 0 && (
          <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-6">
            No certifications added. This step is optional — skip it if you have none.
          </p>
        )}
        {entries.map((e, i) => (
          <CertCard
            key={i}
            entry={e}
            index={i}
            onChange={(val) => update(i, val)}
            onRemove={() => remove(i)}
          />
        ))}
        <Button type="button" variant="outline" onClick={add} className="w-full">
          <Plus className="w-4 h-4" />
          Add Certification
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Generated Resume Preview ──────────────────────────────────────────────────

function ResumePreview({
  data,
  onDownloadPdf,
  onDownloadDocx,
  onRegenerate,
  downloading: isDownloading,
}: {
  data: GeneratedData;
  onDownloadPdf: (template: string) => void;
  onDownloadDocx: (template: string) => void;
  onRegenerate: () => void;
  downloading: boolean;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("modern");
  const rd = data.resumeData as Record<string, unknown>;

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex flex-wrap gap-3 items-center justify-between p-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div>
          <p className="text-sm font-semibold text-slate-200">Resume generated successfully</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Choose a template, then download as PDF or Word.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button type="button" variant="outline" size="sm" onClick={onRegenerate} disabled={isDownloading}>
            <RefreshCw className="w-3.5 h-3.5" />
            Regenerate
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => onDownloadDocx(selectedTemplate)} disabled={isDownloading}>
            <FileText className="w-3.5 h-3.5" />
            Download Word
          </Button>
          <Button type="button" size="sm" onClick={() => onDownloadPdf(selectedTemplate)} disabled={isDownloading}>
            <FileDown className="w-3.5 h-3.5" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Template chooser */}
      <div>
        <p className="text-sm font-medium text-slate-300 mb-3">Choose Template</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTemplate(t.id)}
              className={[
                "rounded-lg border-2 p-3 text-left transition-all hover:border-indigo-400",
                selectedTemplate === t.id
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-[hsl(var(--border))] bg-[hsl(var(--card))]",
              ].join(" ")}
            >
              {/* Mini template thumbnail */}
              <div className="w-full h-14 rounded mb-2 overflow-hidden" style={{ background: t.id === "executive" ? "#0f172a" : "#fff", border: "1px solid #e2e8f0" }}>
                <div style={{ padding: "6px 8px", transform: "scale(0.55)", transformOrigin: "top left", width: "182%", height: "182%" }}>
                  <div style={{ fontFamily: "Arial, sans-serif", fontSize: 10, lineHeight: 1.4 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: t.id === "executive" ? "#fff" : t.accentColor, marginBottom: 2 }}>
                      {rd.name as string || "Your Name"}
                    </div>
                    <div style={{ fontSize: 7, color: t.id === "executive" ? "#94a3b8" : "#64748b", marginBottom: 4 }}>
                      email · phone · location
                    </div>
                    <div style={{ height: 1.5, background: t.accentColor, marginBottom: 4 }} />
                    <div style={{ fontSize: 7, fontWeight: 600, color: t.accentColor, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 }}>
                      Experience
                    </div>
                    <div style={{ fontSize: 7, color: t.id === "executive" ? "#cbd5e1" : "#334155" }}>
                      ■ Bullet point achievement here
                    </div>
                    <div style={{ fontSize: 7, color: t.id === "executive" ? "#cbd5e1" : "#334155" }}>
                      ■ Another achievement bullet point
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-200">{t.name}</p>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{t.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Paper-look document preview */}
      <div className="flex justify-center">
        <div
          className="w-full max-w-2xl rounded-sm shadow-2xl"
          style={{
            background: "#fff",
            padding: "32px 28px",
            minHeight: 900,
            boxShadow: "0 4px 32px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2)",
          }}
        >
          <ResumeTemplateRenderer templateId={selectedTemplate} data={rd} />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400">
          {title}
        </h2>
        <div className="flex-1 h-px bg-indigo-500/20" />
      </div>
      {children}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 7;

export default function GeneratePage() {
  const previewRef = useRef<HTMLDivElement>(null);

  // Step state
  const [currentStep, setCurrentStep] = useState(1);

  // Form state
  const [personal, setPersonal] = useState<PersonalInfo>({
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    targetRole: "",
  });
  const [summary, setSummary] = useState("");
  const [experience, setExperience] = useState<ExperienceEntry[]>([]);
  const [education, setEducation] = useState<EducationInput[]>([]);
  const [skills, setSkills] = useState<Record<string, string[]>>({});
  const [projects, setProjects] = useState<ProjectInput[]>([]);
  const [certifications, setCertifications] = useState<CertificationInput[]>([]);

  // Mode state
  const [mode, setMode] = useState<"form" | "prompt">("form");
  const [promptText, setPromptText] = useState("");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [generatedData, setGeneratedData] = useState<GeneratedData | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [error, setError] = useState("");

  // ── Validation ────────────────────────────────────────────────────────────

  const validateStep = (): string | null => {
    if (currentStep === 1) {
      if (!personal.name.trim()) return "Please enter your full name.";
      if (!personal.email.trim()) return "Please enter your email address.";
      if (!personal.phone.trim()) return "Please enter your phone number.";
      if (!personal.targetRole.trim()) return "Please enter your target role.";
    }
    return null;
  };

  // ── Navigation ────────────────────────────────────────────────────────────

  const goNext = () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const goBack = () => {
    setError("");
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  // ── Build payload ─────────────────────────────────────────────────────────

  const buildPayload = (): GenerateResumeRequest => ({
    personalInfo: {
      name: personal.name.trim(),
      email: personal.email.trim(),
      phone: personal.phone.trim(),
      location: personal.location.trim(),
      linkedin: personal.linkedin.trim() || undefined,
      github: personal.github.trim() || undefined,
    },
    summary: summary.trim() || undefined,
    experience: experience.map((e) => ({
      company: e.company,
      role: e.role,
      startDate: e.startDate,
      endDate: e.endDate,
      location: e.location || undefined,
      bullets: splitBullets(e.bulletsRaw),
    })),
    education: education.map((e) => ({
      institution: e.institution,
      degree: e.degree,
      field: e.field,
      startYear: e.startYear,
      endYear: e.endYear,
      gpa: e.gpa?.trim() || undefined,
    })),
    skills,
    projects,
    certifications: certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer?.trim() || undefined,
      year: c.year?.trim() || undefined,
    })),
    targetRole: personal.targetRole.trim() || undefined,
  });

  // ── Generate ──────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    setError("");
    setGenerating(true);
    try {
      const result = await api.generateResume(buildPayload());
      setGeneratedData(result);
      // Scroll to preview after a brief render delay
      setTimeout(() => {
        previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: any) {
      setError(err?.message || "Failed to generate resume. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = () => {
    setGeneratedData(null);
    handleGenerate();
  };

  const handleGenerateFromPrompt = async () => {
    if (!promptText.trim()) {
      setError("Please enter a description to generate your resume.");
      return;
    }
    setError("");
    setGenerating(true);
    try {
      const result = await api.generateResume({
        personalInfo: { name: "", email: "", phone: "", location: "" },
        skills: {},
        experience: [],
        education: [],
        projects: [],
        certifications: [],
        promptText: promptText.trim(),
      });
      setGeneratedData(result);
      setTimeout(() => {
        previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: any) {
      setError(err?.message || "Failed to generate resume. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Downloads ─────────────────────────────────────────────────────────────

  const handleDownloadPdf = async (template: string) => {
    if (!generatedData) return;
    setDownloading(true);
    setPageCount(null);
    try {
      const pages = await api.downloadResumePdf(generatedData.resumeData, template);
      setPageCount(pages);
    } catch (err: any) {
      setError(err?.message || "PDF download failed.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadDocx = async (template: string) => {
    if (!generatedData) return;
    setDownloading(true);
    try {
      await api.downloadResumeDocx(generatedData.resumeData, template);
    } catch (err: any) {
      setError(err?.message || "Word download failed.");
    } finally {
      setDownloading(false);
    }
  };

  // ── Render step content ───────────────────────────────────────────────────

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepPersonal data={personal} onChange={setPersonal} />;
      case 2:
        return <StepSummary value={summary} onChange={setSummary} />;
      case 3:
        return <StepExperience entries={experience} onChange={setExperience} />;
      case 4:
        return <StepEducation entries={education} onChange={setEducation} />;
      case 5:
        return <StepSkills skills={skills} onChange={setSkills} />;
      case 6:
        return <StepProjects entries={projects} onChange={setProjects} />;
      case 7:
        return (
          <StepCertifications entries={certifications} onChange={setCertifications} />
        );
      default:
        return null;
    }
  };

  const isLastStep = currentStep === TOTAL_STEPS;

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Resume Generator</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Fill in your details across 7 steps and let the AI craft a polished,
          ATS-ready resume for you.
        </p>
      </div>

      {/* Mode switcher */}
      <div className="flex gap-2 p-1 rounded-lg bg-[hsl(var(--muted))] w-fit">
        <button
          type="button"
          onClick={() => setMode("form")}
          className={[
            "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
            mode === "form"
              ? "bg-[hsl(var(--background))] text-white shadow-sm"
              : "text-[hsl(var(--muted-foreground))] hover:text-white",
          ].join(" ")}
        >
          Step-by-Step Form
        </button>
        <button
          type="button"
          onClick={() => setMode("prompt")}
          className={[
            "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
            mode === "prompt"
              ? "bg-[hsl(var(--background))] text-white shadow-sm"
              : "text-[hsl(var(--muted-foreground))] hover:text-white",
          ].join(" ")}
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            AI Prompt
          </span>
        </button>
      </div>

      {mode === "prompt" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Generate Resume from Prompt
            </CardTitle>
            <CardDescription>
              Describe yourself, your experience, and the role you're targeting. AI will build a complete resume for you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder={`Example:\n"I'm a Full Stack Developer with 3 years experience in React, Node.js, and MongoDB. I've built e-commerce platforms and SaaS apps. I'm applying for a Senior Frontend Engineer role at a product startup. My education is BSc Computer Science from XYZ University (2022). Skills include TypeScript, Next.js, PostgreSQL, Docker, AWS."`}
              rows={8}
              className="resize-none font-mono text-sm"
            />
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Include: your name, contact info, years of experience, tech stack, past companies/roles, education, and target job title for best results.
            </p>
            {error && (
              <p className="rounded-md bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-300">{error}</p>
            )}
            <Button
              type="button"
              size="lg"
              onClick={handleGenerateFromPrompt}
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" />AI is crafting your resume…</>
              ) : (
                <><Sparkles className="w-4 h-4" />Generate Resume with AI</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {mode === "form" && (
        <>
          {/* Progress bar */}
          <ProgressBar current={currentStep} total={TOTAL_STEPS} />

          {/* Active step content */}
          {renderStep()}

          {/* Error message */}
          {error && (
            <p className="rounded-md bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-300">
              {error}
            </p>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={currentStep === 1 || generating}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            {isLastStep ? (
              <Button
                type="button"
                size="lg"
                onClick={handleGenerate}
                disabled={generating}
                className="min-w-[200px]"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI is crafting your resume…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Resume with AI
                  </>
                )}
              </Button>
            ) : (
              <Button type="button" onClick={goNext} disabled={generating}>
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </>
      )}

      {/* Generated preview section */}
      {generatedData && (
        <div ref={previewRef} className="pt-6 space-y-4">
          <Divider />
          <h2 className="text-xl font-bold">Your Generated Resume</h2>
          <ResumePreview
            data={generatedData}
            onDownloadPdf={handleDownloadPdf}
            onDownloadDocx={handleDownloadDocx}
            onRegenerate={handleRegenerate}
            downloading={downloading || generating}
          />

          {/* Page count feedback — shown after PDF is downloaded */}
          {pageCount !== null && pageCount > 1 && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <svg className="h-5 w-5 shrink-0 mt-0.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div>
                <p className="font-semibold text-amber-300">Your resume is {pageCount} pages</p>
                <p className="mt-1 text-sm text-amber-300/80 leading-relaxed">
                  Most recruiters and ATS systems prefer a <strong>single-page resume</strong>. Consider shortening bullet points, removing older roles, or trimming the certifications section to fit everything on one page.
                </p>
              </div>
            </div>
          )}
          {pageCount === 1 && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <svg className="h-5 w-5 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-emerald-300">Your resume fits on 1 page — perfect for recruiters!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
