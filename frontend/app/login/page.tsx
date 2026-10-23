"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

function safeNext(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = use(searchParams);
  const redirectTo = safeNext(next ?? null);
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      router.push(redirectTo ?? (user.role === "admin" ? "/dashboard/admin" : "/dashboard"));
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
      {/* Top header */}
      <header className="border-b border-[hsl(var(--border))] px-4">
        <div className="mx-auto flex h-14 max-w-6xl items-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[hsl(var(--primary))] text-xs font-bold text-white">AI</span>
            <span className="font-semibold text-sm">Resume Analyzer</span>
          </Link>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-57px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Brand area above card */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Sign in to access your resume analysis dashboard.
            </p>
          </div>

          <Card className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] card-glow">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Sign in to your account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                {error && (
                  <div className="flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-300">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
              <div className="mt-6 border-t border-[hsl(var(--border))] pt-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-[hsl(var(--primary))] hover:underline font-medium">
                  Create one free
                </Link>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
            <Link href="/" className="hover:text-[hsl(var(--foreground))] transition-colors">Back to home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
