"use client";

import { useRef, useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
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
  AlertCircle,
  CheckCircle2,
  Layers,
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

// ── Validation Helpers ───────────────────────────────────────────────────────

function validatePhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) {
    return "Phone number is required.";
  }
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length < 10) {
    return "Please enter a valid phone number (at least 10 digits, e.g. 9876543210 or +91 9876543210).";
  }
  if (digitsOnly.length > 15) {
    return "Phone number cannot exceed 15 digits.";
  }
  return null;
}

function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return "Email address is required.";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return "Please enter a valid email address (e.g. name@example.com).";
  }
  return null;
}

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Full Name is required.";
  }
  if (trimmed.length < 2) {
    return "Full Name must be at least 2 characters.";
  }
  return null;
}

function validateTargetRole(role: string): string | null {
  const trimmed = role.trim();
  if (!trimmed) {
    return "Target Role is required (e.g. Full Stack Developer).";
  }
  return null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

function SectionNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-[hsl(var(--muted-foreground))] italic">{children}</p>
  );
}

function Divider() {
  return <hr className="border-[hsl(var(--border))]" />;
}

// ── Dropdown Page Selector Component (Single Input with Dropdown on Click) ───

function PageSelector({
  targetPages,
  onChange,
}: {
  targetPages: number;
  onChange: (pages: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const PAGE_OPTIONS = [
    {
      value: 1,
      title: "1 Page",
      subtitle: "Default / Recommended — Compact, dense, high-impact. AI prevents empty space.",
      isDefault: true,
    },
    {
      value: 2,
      title: "2 Pages",
      subtitle: "Experienced — Detailed roles, multi-tier accomplishments, expanded projects.",
      isDefault: false,
    },
    {
      value: 3,
      title: "3 Pages",
      subtitle: "Senior / Leadership — Comprehensive career trajectory and architecture highlights.",
      isDefault: false,
    },
    {
      value: 4,
      title: "4 Pages",
      subtitle: "Executive / Research — Full history, deep technical stack, publications.",
      isDefault: false,
    },
    {
      value: 5,
      title: "5 Pages",
      subtitle: "Comprehensive CV — Exhaustive credentials, long-term portfolio, all achievements.",
      isDefault: false,
    },
  ];

  const currentOption = PAGE_OPTIONS.find((o) => o.value === targetPages) || PAGE_OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <label htmlFor="pages-dropdown-btn" className="flex items-center gap-2 cursor-pointer">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-slate-200">
            Target Resume Length
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {targetPages} {targetPages === 1 ? "Page (Standard)" : "Pages"}
          </span>
        </label>
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          Click below to change
        </span>
      </div>

      {/* Single input that opens dropdown menu on click */}
      <div className="relative">
        <button
          id="pages-dropdown-btn"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-11 w-full items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3.5 py-2 text-sm text-slate-100 hover:border-indigo-500/60 hover:bg-[hsl(var(--muted))]/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 px-2 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white shadow-sm">
              {currentOption.title}
            </span>
            <span className="font-medium text-slate-200 text-xs sm:text-sm truncate">
              {currentOption.subtitle}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-[hsl(var(--muted-foreground))] transition-transform duration-200 shrink-0 ml-2 ${isOpen ? "rotate-180 text-indigo-400" : ""
              }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95">
            {PAGE_OPTIONS.map((opt) => {
              const isSelected = targetPages === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 rounded-lg p-2.5 text-left text-xs transition-colors cursor-pointer ${isSelected
                      ? "bg-indigo-600/15 border border-indigo-500/30 text-white"
                      : "hover:bg-[hsl(var(--muted))] text-slate-300"
                    }`}
                >
                  <div
                    className={`flex h-6 px-2 shrink-0 items-center justify-center rounded-md text-xs font-bold ${isSelected
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-[hsl(var(--muted))] text-slate-400"
                      }`}
                  >
                    {opt.value} {opt.value === 1 ? "Page" : "Pages"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${isSelected ? "text-indigo-300" : "text-slate-200"}`}>
                        {opt.value} {opt.value === 1 ? "Page Resume" : "Pages Resume"}
                      </span>
                      {opt.isDefault && (
                        <span className="text-[9px] uppercase tracking-wider bg-indigo-950/90 text-indigo-200 border border-indigo-400/30 px-1.5 py-0.2 rounded font-bold">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5 leading-snug">
                      {opt.subtitle}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round(((current - 1) / (total - 1)) * 100);

  return (
    <div className="mb-6">
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
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white shadow-sm"
                    : active
                      ? "border-[hsl(var(--primary))] bg-indigo-500/20 text-indigo-300 ring-2 ring-indigo-500/30"
                      : "border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
                ].join(" ")}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={[
                  "text-[10px] font-medium hidden sm:block",
                  active
                    ? "text-indigo-300 font-semibold"
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

      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 font-medium">
        Step {current} of {total} — {STEP_LABELS[current - 1]?.label}
      </p>
    </div>
  );
}

// ── Step 1 — Personal Info ────────────────────────────────────────────────────

function StepPersonal({
  data,
  onChange,
  errors,
  onClearError,
  setFieldError,
}: {
  data: PersonalInfo;
  onChange: (d: PersonalInfo) => void;
  errors: Record<string, string>;
  onClearError: (field: string) => void;
  setFieldError: (field: string, msg: string) => void;
}) {
  const set = (key: keyof PersonalInfo) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...data, [key]: e.target.value });
    onClearError(key);
  };

  // Full Name handler: strictly alphabetic letters, spaces, dots, and hyphens (no numbers or symbols)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleaned = raw.replace(/[^a-zA-Z\s.'-]/g, "");
    onChange({ ...data, name: cleaned });

    if (cleaned.trim().length === 0) {
      setFieldError("name", "Full Name is required.");
    } else if (cleaned.trim().length < 2) {
      setFieldError("name", "Full Name must be at least 2 characters.");
    } else {
      onClearError("name");
    }
  };

  // Target Role handler
  const handleRoleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange({ ...data, targetRole: val });
    if (val.trim().length === 0) {
      setFieldError("targetRole", "Target Role is required (e.g. Full Stack Developer).");
    } else {
      onClearError("targetRole");
    }
  };

  // Email handler with change and blur validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange({ ...data, email: val });
    if (val.trim().length === 0) {
      setFieldError("email", "Email address is required.");
    } else if (errors.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(val.trim())) {
        onClearError("email");
      }
    }
  };

  const handleEmailBlur = () => {
    const emailErr = validateEmail(data.email);
    if (emailErr) {
      setFieldError("email", emailErr);
    } else {
      onClearError("email");
    }
  };

  // Phone Number handler: STRICTLY numbers (0-9), optional leading +, space, and hyphens.
  // Letters (a-z, A-Z) and symbols are completely filtered out so they CANNOT be typed.
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    let cleaned = raw.replace(/[^\d+\s-]/g, "");
    // Ensure '+' can only be at the start
    if (cleaned.includes("+")) {
      cleaned = (cleaned.startsWith("+") ? "+" : "") + cleaned.replace(/\+/g, "");
    }
    const digitsOnly = cleaned.replace(/\D/g, "");
    // Max 15 digits
    if (digitsOnly.length > 15) {
      return;
    }
    onChange({ ...data, phone: cleaned });

    if (cleaned.length === 0) {
      setFieldError("phone", "Phone number is required.");
    } else if (digitsOnly.length < 10) {
      setFieldError("phone", `Phone number must be at least 10 digits (${digitsOnly.length}/10 digits entered). Numbers only.`);
    } else {
      onClearError("phone");
    }
  };

  const handlePhoneBlur = () => {
    const phoneErr = validatePhone(data.phone);
    if (phoneErr) {
      setFieldError("phone", phoneErr);
    } else {
      onClearError("phone");
    }
  };

  return (
    <Card className="border-[hsl(var(--border))]">
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>
          Your contact details and the role you are targeting. AI uses these to tailor your resume.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="name" className="flex items-center justify-between">
              <span>Full Name <span className="text-rose-400">*</span></span>
            </Label>
            <Input
              id="name"
              value={data.name}
              onChange={handleNameChange}
              onBlur={() => { if (!data.name.trim()) setFieldError("name", "Full Name is required."); }}
              placeholder="e.g. Manoj Kumar (letters only)"
              className={errors.name ? "border-rose-500 focus-visible:ring-rose-500 bg-rose-500/5" : ""}
            />
            {errors.name && (
              <p className="text-xs text-rose-400 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.name}
              </p>
            )}
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="targetRole" className="flex items-center justify-between">
              <span>Target Role <span className="text-rose-400">*</span></span>
            </Label>
            <Input
              id="targetRole"
              value={data.targetRole}
              onChange={handleRoleChange}
              onBlur={() => { if (!data.targetRole.trim()) setFieldError("targetRole", "Target Role is required."); }}
              placeholder="e.g. Full Stack Developer"
              className={errors.targetRole ? "border-rose-500 focus-visible:ring-rose-500 bg-rose-500/5" : ""}
            />
            {errors.targetRole && (
              <p className="text-xs text-rose-400 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.targetRole}
              </p>
            )}
          </FieldGroup>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="email" className="flex items-center justify-between">
              <span>Email <span className="text-rose-400">*</span></span>
            </Label>
            <Input
              id="email"
              type="email"
              value={data.email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              placeholder="e.g. manoj@gmail.com"
              className={errors.email ? "border-rose-500 focus-visible:ring-rose-500 bg-rose-500/5" : ""}
            />
            {errors.email && (
              <p className="text-xs text-rose-400 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.email}
              </p>
            )}
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="phone" className="flex items-center justify-between">
              <span>Phone Number <span className="text-rose-400">*</span></span>
              {data.phone.replace(/\D/g, "").length >= 10 && (
                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Valid
                </span>
              )}
            </Label>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              value={data.phone}
              onChange={handlePhoneChange}
              onBlur={handlePhoneBlur}
              placeholder="e.g. 9876543210 or +91 9876543210"
              className={errors.phone ? "border-rose-500 focus-visible:ring-rose-500 bg-rose-500/5" : ""}
            />
            {errors.phone ? (
              <p className="text-xs text-rose-400 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.phone}
              </p>
            ) : (
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                Numbers only. Minimum 10 digits required (e.g. 9876543210 or +91 9876543210).
              </p>
            )}
          </FieldGroup>
        </div>

        <FieldGroup>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={data.location}
            onChange={set("location")}
            placeholder="e.g. Bengaluru, India or San Francisco, CA"
          />
        </FieldGroup>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="linkedin">LinkedIn URL (optional)</Label>
            <Input
              id="linkedin"
              value={data.linkedin}
              onChange={set("linkedin")}
              placeholder="https://linkedin.com/in/janedoe"
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="github">GitHub / Portfolio URL (optional)</Label>
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
    <Card className="border-[hsl(var(--border))]">
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
            placeholder="Results-driven software engineer with 3+ years of experience building scalable web applications…"
            className="min-h-[160px]"
          />
        </FieldGroup>
        <SectionNote>
          💡 Leave blank and our AI will write a compelling executive summary tailored to your chosen page length and target role.
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
          <Input value={entry.company} onChange={set("company")} placeholder="e.g. Acme Corp" />
        </FieldGroup>
        <FieldGroup>
          <Label>Role / Title</Label>
          <Input value={entry.role} onChange={set("role")} placeholder="e.g. Full Stack Developer" />
        </FieldGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FieldGroup>
          <Label>Start Date</Label>
          <Input value={entry.startDate} onChange={set("startDate")} placeholder="e.g. Jan 2022" />
        </FieldGroup>
        <FieldGroup>
          <Label>End Date</Label>
          <Input value={entry.endDate} onChange={set("endDate")} placeholder="e.g. Present" />
        </FieldGroup>
        <FieldGroup>
          <Label>Location</Label>
          <Input value={entry.location ?? ""} onChange={set("location")} placeholder="e.g. Remote or Bengaluru" />
        </FieldGroup>
      </div>

      <FieldGroup>
        <Label>Achievements / Key Responsibilities</Label>
        <Textarea
          value={entry.bulletsRaw}
          onChange={set("bulletsRaw")}
          placeholder={`- Engineered microservices reducing latency by 35%\n- Spearheaded e-commerce checkout handling 50k monthly orders`}
          rows={3}
        />
        <SectionNote>
          Enter key points separated by newlines. AI will polish them with metrics and strong action verbs.
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
    <Card className="border-[hsl(var(--border))]">
      <CardHeader>
        <CardTitle>Work Experience</CardTitle>
        <CardDescription>
          Add your work history. If left empty, AI will generate relevant industry experience matching your target role to completely fill your chosen page length.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.length === 0 && (
          <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
            No experience added yet. Click &ldquo;Add Experience&rdquo; below or proceed forward to let AI intelligently synthesize experience that fits your page length.
          </div>
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
          <Plus className="w-4 h-4 mr-1.5" />
          Add Experience
        </Button>
      </CardContent>
    </Card>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup>
          <Label>Institution / College</Label>
          <Input value={entry.institution} onChange={set("institution")} placeholder="e.g. Stanford University" />
        </FieldGroup>
        <FieldGroup>
          <Label>Degree</Label>
          <Input value={entry.degree} onChange={set("degree")} placeholder="e.g. B.Sc, B.E., M.S." />
        </FieldGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FieldGroup>
          <Label>Field of Study</Label>
          <Input value={entry.field} onChange={set("field")} placeholder="e.g. Computer Science" />
        </FieldGroup>
        <FieldGroup>
          <Label>Start Year</Label>
          <Input value={entry.startYear} onChange={set("startYear")} placeholder="2019" />
        </FieldGroup>
        <FieldGroup>
          <Label>End Year</Label>
          <Input value={entry.endYear} onChange={set("endYear")} placeholder="2023" />
        </FieldGroup>
      </div>

      <FieldGroup>
        <Label>GPA / Percentage (optional)</Label>
        <Input value={entry.gpa ?? ""} onChange={set("gpa")} placeholder="e.g. 3.8/4.0 or 85%" />
      </FieldGroup>
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
    <Card className="border-[hsl(var(--border))]">
      <CardHeader>
        <CardTitle>Education</CardTitle>
        <CardDescription>Add degrees, diplomas, or relevant academic coursework.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.length === 0 && (
          <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
            No education added. Click &ldquo;Add Education&rdquo; or skip to have AI provide standard credentials.
          </div>
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
          <Plus className="w-4 h-4 mr-1.5" />
          Add Education
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Step 5 — Technical Skills ─────────────────────────────────────────────────

const DEFAULT_SKILL_CATEGORIES = [
  "Languages",
  "Frontend",
  "Backend",
  "Database",
  "Cloud & DevOps",
  "Tools",
];

function StepSkills({
  skills,
  onChange,
}: {
  skills: Record<string, string[]>;
  onChange: (s: Record<string, string[]>) => void;
}) {
  const [skillInput, setSkillInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Frontend");

  // Helper to extract all skills as individual items taking exact width
  // Backwards-compatible if user had entered skills as category keys like {"HTML": [], "CSS": []}
  const allSkillItems: Array<{ name: string; category: string }> = [];
  const seenSkills = new Set<string>();

  for (const [cat, list] of Object.entries(skills)) {
    if (Array.isArray(list) && list.length > 0) {
      list.forEach((s) => {
        const clean = s.trim();
        if (clean && !seenSkills.has(clean.toLowerCase())) {
          seenSkills.add(clean.toLowerCase());
          allSkillItems.push({ name: clean, category: cat });
        }
      });
    } else {
      const clean = cat.trim();
      if (clean && !seenSkills.has(clean.toLowerCase())) {
        seenSkills.add(clean.toLowerCase());
        allSkillItems.push({ name: clean, category: "Skills" });
      }
    }
  }

  const addSkill = (name: string, category: string = selectedCategory) => {
    const rawItems = name.split(/[,]+/).map((s) => s.trim()).filter(Boolean);
    if (rawItems.length === 0) return;

    const next = { ...skills };
    rawItems.forEach((raw) => {
      const lower = raw.toLowerCase();
      // Auto-categorize if in suggestion map
      const foundSugg = SKILL_SUGGESTIONS.find((s) => s.toLowerCase() === lower);
      let catToUse = category || "Technical Skills";
      if (foundSugg) {
        if (["React", "Next.js", "Tailwind CSS", "HTML5", "CSS3"].includes(foundSugg)) catToUse = "Frontend";
        else if (["Node.js", "Express.js", "FastAPI", "Django"].includes(foundSugg)) catToUse = "Backend";
        else if (["Python", "TypeScript", "JavaScript"].includes(foundSugg)) catToUse = "Languages";
        else if (["PostgreSQL", "MongoDB", "Redis"].includes(foundSugg)) catToUse = "Database";
        else if (["Docker", "AWS", "CI/CD", "Kubernetes"].includes(foundSugg)) catToUse = "Cloud & DevOps";
        else if (["Git", "Postman"].includes(foundSugg)) catToUse = "Tools";
      }

      if (!next[catToUse]) next[catToUse] = [];
      if (!next[catToUse].some((item) => item.toLowerCase() === lower)) {
        next[catToUse] = [...next[catToUse], raw];
      }
      // If raw was previously an empty category key, clean it
      if (next[raw] !== undefined && next[raw].length === 0 && catToUse !== raw) {
        delete next[raw];
      }
    });

    onChange(next);
    setSkillInput("");
  };

  const removeSkill = (nameToRemove: string, catToRemove: string) => {
    const next = { ...skills };
    const lower = nameToRemove.toLowerCase();

    // Check if it was an empty category key
    if (next[nameToRemove] !== undefined && next[nameToRemove].length === 0) {
      delete next[nameToRemove];
    }

    if (next[catToRemove]) {
      next[catToRemove] = next[catToRemove].filter((s) => s.toLowerCase() !== lower);
      if (next[catToRemove].length === 0) {
        delete next[catToRemove];
      }
    }

    // Also scan all categories just in case
    for (const [c, list] of Object.entries(next)) {
      if (Array.isArray(list)) {
        next[c] = list.filter((s) => s.toLowerCase() !== lower);
        if (next[c].length === 0) {
          delete next[c];
        }
      }
    }

    onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(skillInput, selectedCategory);
    }
  };

  return (
    <Card className="border-[hsl(var(--border))]">
      <CardHeader>
        <CardTitle>Technical Skills</CardTitle>
        <CardDescription>
          Add your technical skills. Each skill is rendered with exact width for a clean, compact view.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Quick add popular skills */}
        <div className="space-y-1.5">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Quick add popular skills:</p>
          <div className="flex flex-wrap gap-1.5">
            {SKILL_SUGGESTIONS.filter(
              (s) => !seenSkills.has(s.toLowerCase())
            ).slice(0, 12).map((sugg) => (
              <button
                key={sugg}
                type="button"
                onClick={() => addSkill(sugg)}
                className="inline-flex w-fit items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/60 px-2.5 py-0.5 text-xs text-slate-300 hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-indigo-200 transition-all cursor-pointer"
              >
                <Plus className="w-2.5 h-2.5" />
                {sugg}
              </button>
            ))}
          </div>
        </div>

        {/* Input bar to add skills */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex gap-2">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type skill name (or comma-separated, e.g. React, Node.js, Python)..."
              className="flex-1 text-sm"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-1 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {DEFAULT_SKILL_CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-slate-900 text-slate-200">
                  {c}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="default"
            size="default"
            onClick={() => addSkill(skillInput, selectedCategory)}
            className="shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Skill
          </Button>
        </div>

        {/* Added Skills Section - EXACT WIDTH CHIPS (NO FULL ROW TAKEOVER) */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Added Skills ({allSkillItems.length})
            </span>
            {allSkillItems.length > 0 && (
              <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                Click ✕ on any badge to remove
              </span>
            )}
          </div>

          {allSkillItems.length > 0 ? (
            <div className="flex flex-wrap gap-2 p-3.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 min-h-[50px]">
              {allSkillItems.map((item) => (
                <span
                  key={`${item.category}-${item.name}`}
                  className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/15 px-3 py-1.5 text-xs font-semibold text-indigo-200 shadow-sm transition-all hover:border-indigo-400 select-none animate-in fade-in-0"
                >
                  <span>{item.name}</span>
                  <span className="text-[9px] uppercase tracking-wider text-indigo-300/80 bg-indigo-950/80 border border-indigo-500/20 px-1.5 py-0.5 rounded font-normal">
                    {item.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSkill(item.name, item.category)}
                    className="text-indigo-400 hover:text-rose-400 transition-colors ml-0.5 p-0.5 cursor-pointer rounded"
                    title="Remove skill"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
              No skills added yet. Use the input above or click any popular skill to add.
            </div>
          )}
        </div>
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
          <Input value={entry.name} onChange={set("name")} placeholder="e.g. AI Resume Builder" />
        </FieldGroup>
        <FieldGroup>
          <Label>Tech Stack</Label>
          <Input
            value={entry.techStack}
            onChange={set("techStack")}
            placeholder="e.g. React, Next.js, Node.js, FastAPI"
          />
        </FieldGroup>
      </div>

      <FieldGroup>
        <Label>Description & Architectural Highlights</Label>
        <Textarea
          value={entry.description}
          onChange={set("description")}
          placeholder="Architected a multi-tier platform with microservices backend, authentication, and responsive client interfaces."
          rows={3}
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
    <Card className="border-[hsl(var(--border))]">
      <CardHeader>
        <CardTitle>Key Projects</CardTitle>
        <CardDescription>
          Showcase notable projects, open-source work, or applications you built.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.length === 0 && (
          <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
            No projects added. Click &ldquo;Add Project&rdquo; or skip — AI will generate comprehensive projects relevant to your role.
          </div>
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
          <Plus className="w-4 h-4 mr-1.5" />
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
  onChange: (c: CertificationInput) => void;
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
              placeholder="e.g. AWS Certified Developer"
            />
          </FieldGroup>
        </div>
        <FieldGroup>
          <Label>Issuer (optional)</Label>
          <Input
            value={entry.issuer ?? ""}
            onChange={set("issuer")}
            placeholder="e.g. Amazon Web Services"
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
    <Card className="border-[hsl(var(--border))]">
      <CardHeader>
        <CardTitle>Certifications</CardTitle>
        <CardDescription>
          Professional certifications, licenses, or online course completions (Optional).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.length === 0 && (
          <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-6">
            No certifications added. This step is optional — AI will include certifications relevant to your stack if left blank.
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
          <Plus className="w-4 h-4 mr-1.5" />
          Add Certification
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Generated Resume Preview ──────────────────────────────────────────────────

function ResumePreview({
  data,
  targetPages,
  onDownloadPdf,
  onDownloadDocx,
  onRegenerate,
  downloading: isDownloading,
}: {
  data: GeneratedData;
  targetPages: number;
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
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-200">Resume Generated Successfully</p>
            <Badge variant="muted" className="text-[11px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              Target: {targetPages} {targetPages === 1 ? "Page" : "Pages"}
            </Badge>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Choose your preferred template layout, then download in PDF or Word format.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button type="button" variant="outline" size="sm" onClick={onRegenerate} disabled={isDownloading}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Regenerate
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => onDownloadDocx(selectedTemplate)} disabled={isDownloading}>
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Download Word
          </Button>
          <Button type="button" size="sm" onClick={() => onDownloadPdf(selectedTemplate)} disabled={isDownloading}>
            <FileDown className="w-3.5 h-3.5 mr-1.5" />
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
                  ? "border-indigo-500 bg-indigo-500/10 shadow-sm shadow-indigo-500/20"
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
                      • Bullet point achievement here
                    </div>
                    <div style={{ fontSize: 7, color: t.id === "executive" ? "#cbd5e1" : "#334155" }}>
                      • Another achievement bullet point
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

// ── Main Page ─────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 7;

export default function GeneratePage() {
  const previewRef = useRef<HTMLDivElement>(null);

  // Step state
  const [currentStep, setCurrentStep] = useState(1);

  // Target pages state (1 to 5, default 1)
  const [targetPages, setTargetPages] = useState<number>(1);

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

  // Validation field errors state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

    const setFieldError = (field: string, msg: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: msg }));
  };

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    if (error) setError("");
  };

  const validatePersonalInfo = (): Record<string, string> => {
    const errs: Record<string, string> = {};

    const nameErr = validateName(personal.name);
    if (nameErr) errs.name = nameErr;

    const roleErr = validateTargetRole(personal.targetRole);
    if (roleErr) errs.targetRole = roleErr;

    const emailErr = validateEmail(personal.email);
    if (emailErr) errs.email = emailErr;

    const phoneErr = validatePhone(personal.phone);
    if (phoneErr) errs.phone = phoneErr;

    return errs;
  };

  // ── Navigation ────────────────────────────────────────────────────────────

  const goNext = () => {
    if (currentStep === 1) {
      const errs = validatePersonalInfo();
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        setError("Please fix the highlighted errors before continuing.");
        return;
      }
    }
    setFieldErrors({});
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
    skills: (() => {
      const normalized: Record<string, string[]> = {};
      for (const [cat, list] of Object.entries(skills)) {
        if (Array.isArray(list) && list.length > 0) {
          normalized[cat] = list;
        } else if (cat.trim()) {
          if (!normalized["Technical Skills"]) normalized["Technical Skills"] = [];
          normalized["Technical Skills"].push(cat.trim());
        }
      }
      return normalized;
    })(),
    projects,
    certifications: certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer?.trim() || undefined,
      year: c.year?.trim() || undefined,
    })),
    targetRole: personal.targetRole.trim() || undefined,
    targetPages,
  });

  // ── Generate ──────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    const errs = validatePersonalInfo();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setCurrentStep(1);
      setError("Please fill in all required personal information (with valid phone number) first.");
      return;
    }

    setError("");
    setGenerating(true);
    try {
      const result = await api.generateResume(buildPayload());
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
        targetPages,
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

  // ── Downloads ─────────────────────────────────────────────────────

  const handleDownloadPdf = async (template: string) => {
    if (!generatedData) return;
    setDownloading(true);
    setPageCount(null);
    try {
      const pages = await api.downloadResumePdf(generatedData.resumeData, template, targetPages);
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
      await api.downloadResumeDocx(generatedData.resumeData, template, targetPages);
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
        return (
          <StepPersonal
            data={personal}
            onChange={setPersonal}
            errors={fieldErrors}
            onClearError={clearFieldError}
            setFieldError={setFieldError}
          />
        );
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
        <h1 className="text-2xl font-bold">AI Resume Generator</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Fill in your details across 7 steps or use AI Prompt mode to craft a polished,
          executive-ready resume tailored to your target role.
        </p>
      </div>

      {/* Mode switcher */}
      <div className="flex gap-2 p-1 rounded-lg bg-[hsl(var(--muted))] w-fit">
        <button
          type="button"
          onClick={() => setMode("form")}
          className={[
            "px-4 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
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
            "px-4 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
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

      {/* Single Input Dropdown Page Selector */}
      <PageSelector targetPages={targetPages} onChange={setTargetPages} />

      {mode === "prompt" && (
        <Card className="border-[hsl(var(--border))]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Generate Resume from Prompt
            </CardTitle>
            <CardDescription>
              Describe yourself, your experience, and the role you're targeting. AI will build a complete {targetPages}-page resume for you.
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
              <p className="rounded-md bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                {error}
              </p>
            )}
            <Button
              type="button"
              size="lg"
              onClick={handleGenerateFromPrompt}
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />AI is crafting your {targetPages}-page resume…</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Generate {targetPages}-Page Resume with AI</>
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

          {/* Global error banner if present */}
          {error && (
            <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={currentStep === 1 || generating}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
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
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    AI is crafting your {targetPages}-page resume…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate {targetPages}-Page Resume with AI
                  </>
                )}
              </Button>
            ) : (
              <Button type="button" onClick={goNext} disabled={generating}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
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
            targetPages={targetPages}
            onDownloadPdf={handleDownloadPdf}
            onDownloadDocx={handleDownloadDocx}
            onRegenerate={handleRegenerate}
            downloading={downloading || generating}
          />

          {/* Page count feedback */}
          {pageCount !== null && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-emerald-300">
                  Your PDF was generated successfully ({pageCount} {pageCount === 1 ? "Page" : "Pages"}).
                </p>
                <p className="text-xs text-slate-300 mt-0.5">
                  Formatted cleanly with professional typography and zero glyph clipping.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
