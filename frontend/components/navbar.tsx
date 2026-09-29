"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileSearch, LayoutDashboard, History, ShieldCheck, LogOut } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/analyze", label: "Analyze", icon: FileSearch },
  { href: "/dashboard/history", label: "History", icon: History },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const nav = [...links];
  if (user?.role === "admin") {
    nav.push({ href: "/dashboard/admin", label: "Admin", icon: ShieldCheck });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[hsl(var(--primary))] text-sm font-bold">
            AI
          </span>
          <span className="hidden font-semibold sm:block">Resume Analyzer</span>
        </Link>

        <nav className="flex items-center gap-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-[hsl(var(--muted))] text-white"
                    : "text-[hsl(var(--muted-foreground))] hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:block">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden text-right text-xs sm:block">
            <p className="font-medium text-slate-100">{user?.name}</p>
            <p className="text-[hsl(var(--muted-foreground))]">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1 rounded-md px-2 py-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-white"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
