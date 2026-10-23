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

export default function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = use(searchParams);
  const redirectTo = safeNext(next ?? null);
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      router.push(redirectTo ?? "/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed");
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
            <h1 className="text-2xl font-bold mb-2">Create your account</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Free to use. Analyze your resume and track your ATS score over time.
            </p>
          </div>

          <Card className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] card-glow">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Get started for free</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>
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
                    placeholder="At least 8 characters"
                  />
                </div>
                {error && (
                  <div className="flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-300">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account…" : "Create account"}
                </Button>
              </form>
              <div className="mt-6 border-t border-[hsl(var(--border))] pt-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
                Already have an account?{" "}
                <Link href="/login" className="text-[hsl(var(--primary))] hover:underline font-medium">
                  Sign in
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
