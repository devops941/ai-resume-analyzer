import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "AI Resume Generator - Professional Resume Builder & Templates",
  description:
    "Create professional, executive-ready resumes in minutes with AI. Custom templates, AI bullet point enhancement, and instant PDF & Word export.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
