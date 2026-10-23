"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileSearch, LayoutDashboard, History, ShieldCheck, LogOut, FilePen, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/analyze", label: "Analyze", icon: FileSearch },
  { href: "/dashboard/generate", label: "Generate", icon: FilePen },
  { href: "/dashboard/history", label: "History", icon: History },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const nav = [...links];
  if (user?.role === "admin") nav.push({ href: "/dashboard/admin", label: "Admin", icon: ShieldCheck });

  return (
    <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[hsl(var(--primary))] text-xs font-bold text-white">AI</span>
          <span className="hidden font-semibold text-sm sm:block">Resume Analyzer</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] font-medium"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/50"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:block">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--muted))]">
              <User className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
            </div>
            <div className="text-xs leading-tight">
              <p className="font-medium text-[hsl(var(--foreground))]">{user?.name}</p>
              <p className="text-[hsl(var(--muted-foreground))] capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/50 transition-colors"
            title="Log out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:block">Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
