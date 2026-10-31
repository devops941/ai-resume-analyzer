const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem("token", token);
  else window.localStorage.removeItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const detail =
      (data && (data.detail || data.message)) || `Request failed (${res.status})`;
    throw new ApiError(typeof detail === "string" ? detail : JSON.stringify(detail), res.status);
  }
  return data as T;
}

export const api = {
  register: (body: { name: string; email: string; password: string }) =>
    request<TokenResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<TokenResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<User>("/api/auth/me"),

  uploadResume: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<Resume>("/api/resumes/upload", { method: "POST", body: form });
  },
  listResumes: () => request<Resume[]>("/api/resumes"),
  getResume: (id: string) => request<Resume>(`/api/resumes/${id}`),
  deleteResume: (id: string) => request<void>(`/api/resumes/${id}`, { method: "DELETE" }),

  analyze: (body: {
    resumeId: string;
    jobDescription?: string;
    jobTitle?: string;
    company?: string;
  }) => request<Analysis>("/api/analyses", { method: "POST", body: JSON.stringify(body) }),
  listAnalyses: () => request<AnalysisHistoryItem[]>("/api/analyses"),
  getAnalysis: (id: string) => request<Analysis>(`/api/analyses/${id}`),
  deleteAnalysis: (id: string) => request<void>(`/api/analyses/${id}`, { method: "DELETE" }),

  adminStats: () => request<AdminStats>("/api/admin/stats"),
  adminUsers: () => request<AdminUserRow[]>("/api/admin/users"),
  adminUser: (id: string) => request<AdminUserDetail>(`/api/admin/users/${id}`),
  reportUrl: () => `${API_URL}/api/admin/report`,

  generateResume: (body: GenerateResumeRequest) =>
    request<GeneratedResumeResponse>("/api/generator/generate", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  downloadResumePdf: async (resumeData: Record<string, unknown>, template = "modern", targetPages = 1): Promise<number> => {
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/api/generator/download/pdf-from-data`, {
      method: "POST",
      headers,
      body: JSON.stringify({ resumeData, template, targetPages }),
    });
    if (!res.ok) throw new ApiError("PDF download failed", res.status);
    const pageCount = parseInt(res.headers.get("X-Resume-Pages") || "1", 10);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(resumeData.name as string || "resume").replace(/\s+/g, "_")}_resume.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    return pageCount;
  },

  downloadResumeDocx: async (resumeData: Record<string, unknown>, template = "modern", targetPages = 1): Promise<void> => {
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/api/generator/download/docx-from-data`, {
      method: "POST",
      headers,
      body: JSON.stringify({ resumeData, template, targetPages }),
    });
    if (!res.ok) throw new ApiError("DOCX download failed", res.status);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(resumeData.name as string || "resume").replace(/\s+/g, "_")}_resume.docx`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Resume {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt?: string;
  parsed?: ParsedResume | null;
}

export interface ParsedResume {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  github?: string | null;
  sections?: string[];
  skills?: string[];
  experience?: string[];
  education?: string[];
  projects?: string[];
  wordCount?: number;
}

export interface AtsCheck {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
  detail: string;
}

export interface KeywordGap {
  keyword: string;
  importance: string;
}

export interface Suggestion {
  section: string;
  tip: string;
}

export interface AiReport {
  overallSummary?: string;
  clarityScore?: number;
  impactScore?: number;
  structureScore?: number;
  strengths?: string[];
  weaknesses?: string[];
  jobFitNotes?: string;
  aiAvailable?: boolean;
  aiError?: string;
}

export interface Analysis {
  id: string;
  resumeId: string;
  jobDescId?: string | null;
  atsScore: number;
  atsGrade: string;
  atsChecks: AtsCheck[];
  aiReport?: AiReport | null;
  keywordGaps: KeywordGap[];
  suggestions: Suggestion[];
  missingSkills: string[];
  createdAt?: string;
  resume?: Resume | null;
}

export interface AnalysisHistoryItem {
  id: string;
  atsScore: number;
  atsGrade: string;
  createdAt?: string;
  resumeName: string;
  jobTitle?: string | null;
}

export interface AdminStats {
  totalUsers: number;
  totalResumes: number;
  totalAnalyses: number;
  averageAtsScore: number;
  commonMissingKeywords: { keyword: string; count: number }[];
  recentAnalyses: {
    id: string;
    user: string;
    resumeName: string;
    atsScore: number;
    atsGrade: string;
    createdAt?: string;
  }[];
}

export interface AdminUserRow extends User {
  resumeCount: number;
  analysisCount: number;
  avgAtsScore: number | null;
  lastActiveAt?: string | null;
}

export interface AdminUserDetail {
  user: User;
  resumes: Resume[];
  analyses: AnalysisHistoryItem[];
}

// ── Resume Generator ──────────────────────────────────────────────────────────

export interface WorkExperienceInput {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  location?: string;
  bullets: string[];
}

export interface EducationInput {
  institution: string;
  degree: string;
  field: string;
  startYear: string;
  endYear: string;
  gpa?: string;
}

export interface ProjectInput {
  name: string;
  techStack: string;
  description: string;
}

export interface CertificationInput {
  name: string;
  issuer?: string;
  year?: string;
}

export interface GenerateResumeRequest {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    github?: string;
  };
  summary?: string;
  experience: WorkExperienceInput[];
  education: EducationInput[];
  skills: Record<string, string[]>;   // { category: [skill, ...] }
  projects: ProjectInput[];
  certifications: CertificationInput[];
  targetRole?: string;
  promptText?: string;                // free-form prompt for AI-only generation
  targetPages?: number;               // 1 to 5 pages
}

export interface GeneratedResumeResponse {
  resumeData: Record<string, unknown>;
  rawText: string;
}
