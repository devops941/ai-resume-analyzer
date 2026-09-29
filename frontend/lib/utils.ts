import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export function scoreTone(score: number) {
  if (score >= 85) return { text: "text-emerald-400", bg: "bg-emerald-500", label: "Excellent" };
  if (score >= 70) return { text: "text-sky-400", bg: "bg-sky-500", label: "Good" };
  if (score >= 50) return { text: "text-amber-400", bg: "bg-amber-500", label: "Needs Work" };
  return { text: "text-rose-400", bg: "bg-rose-500", label: "Poor" };
}
