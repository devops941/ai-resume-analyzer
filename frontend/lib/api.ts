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
  adminUsers: () => request<User[]>("/api/admin/users"),
  reportUrl: () => `${API_URL}/api/admin/report`,
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
