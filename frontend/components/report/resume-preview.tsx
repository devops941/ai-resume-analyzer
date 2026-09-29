"use client";

import { Mail, Phone, Linkedin, Github } from "lucide-react";

import type { ParsedResume } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ResumePreview({ parsed }: { parsed: ParsedResume | null | undefined }) {
  if (!parsed) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parsed Resume Preview</CardTitle>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Confirm the extraction was accurate before acting on the feedback.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p className="font-semibold text-slate-100">{parsed.name || "Name not detected"}</p>
          <div className="flex flex-wrap gap-3 text-[hsl(var(--muted-foreground))]">
            {parsed.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {parsed.email}
              </span>
            )}
            {parsed.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {parsed.phone}
              </span>
            )}
            {parsed.linkedin && (
              <span className="flex items-center gap-1">
                <Linkedin className="h-3.5 w-3.5" /> LinkedIn
              </span>
            )}
            {parsed.github && (
              <span className="flex items-center gap-1">
                <Github className="h-3.5 w-3.5" /> GitHub
              </span>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-[hsl(var(--muted-foreground))]">
            Sections detected
          </p>
          <div className="flex flex-wrap gap-2">
            {(parsed.sections || []).map((s) => (
              <Badge key={s} variant="muted" className="capitalize">
                {s}
              </Badge>
            ))}
          </div>
        </div>

        {!!parsed.skills?.length && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-[hsl(var(--muted-foreground))]">
              Skills detected ({parsed.skills.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {parsed.skills.map((s) => (
                <Badge key={s} variant="success">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {parsed.wordCount || 0} words extracted
        </p>
      </CardContent>
    </Card>
  );
}
