"use client";

/**
 * Resume preview templates — render like actual paper documents.
 * Each template receives a `data` dict (from the AI generator) and
 * renders a white-background, print-quality resume preview.
 */

import React from "react";

export type TemplateId = "modern" | "classic" | "minimal" | "executive";

export interface TemplateInfo {
  id: TemplateId;
  name: string;
  description: string;
  accentColor: string;
}

export const TEMPLATES: TemplateInfo[] = [
  { id: "modern",    name: "Modern",    description: "Blue accents, clean lines",      accentColor: "#2563eb" },
  { id: "classic",   name: "Classic",   description: "Traditional, timeless layout",   accentColor: "#1e293b" },
  { id: "minimal",   name: "Minimal",   description: "Ultra-clean, lots of whitespace", accentColor: "#64748b" },
  { id: "executive", name: "Executive", description: "Bold header, corporate feel",    accentColor: "#0f172a" },
];

// ── Shared helpers ─────────────────────────────────────────────────────────────

function contactLine(data: Record<string, unknown>): string {
  return [data.email, data.phone, data.location, data.linkedin, data.github]
    .filter(Boolean)
    .join("  |  ") as string;
}

function parseSkills(raw: unknown): Record<string, string[]> | null {
  if (!raw) return null;
  if (!Array.isArray(raw) && typeof raw === "object") return raw as Record<string, string[]>;
  if (Array.isArray(raw) && raw.length > 0) return { Skills: raw as string[] };
  return null;
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SkillsTable({ skillsDict, categoryColor, skillColor }: {
  skillsDict: Record<string, string[]>;
  categoryColor: string;
  skillColor: string;
}) {
  const entries = Object.entries(skillsDict).filter(([, list]) => list.length > 0);
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <tbody>
        {entries.map(([category, list]) => (
          <tr key={category}>
            <td style={{ width: "26%", fontWeight: 700, color: categoryColor, fontSize: 11.5, paddingBottom: 3, verticalAlign: "top", paddingRight: 10 }}>
              {category}
            </td>
            <td style={{ fontSize: 11.5, color: skillColor, paddingBottom: 3, verticalAlign: "top", lineHeight: 1.5 }}>
              {list.join(", ")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Section helpers ───────────────────────────────────────────────────────────

/** Modern: left-aligned title + blue accent line extending right */
function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: accent, whiteSpace: "nowrap" }}>{title}</span>
        <div style={{ flex: 1, height: 1, background: accent, opacity: 0.3 }} />
      </div>
      {children}
    </div>
  );
}

/** Classic: centered title with em-dash decorators on both sides */
function ClassicSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 400, textTransform: "uppercase", letterSpacing: 2, color: "#222", fontFamily: "Georgia, 'Times New Roman', serif" }}>
          {"── "}
          {title}
          {" ──"}
        </span>
      </div>
      <div style={{ borderBottom: "1px solid #bbb", marginBottom: 6 }} />
      <div>{children}</div>
    </div>
  );
}

/** Minimal: tiny spaced uppercase label, no line — just whitespace */
function MinimalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 20, marginBottom: 0 }}>
      <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: 3, color: "#aaa", display: "block", marginBottom: 8 }}>{title}</span>
      {children}
    </div>
  );
}

/** Executive: right-main section heading with full-width subtle rule */
function ExecSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 3, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#0f172a" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

// ── Template: Modern ──────────────────────────────────────────────────────────
// Left-aligned header, blue accent bar, blue dot bullets, inline role+company

export function ModernTemplate({ data }: { data: Record<string, unknown> }) {
  const name           = (data.name           as string) || "";
  const summary        = (data.summary        as string) || "";
  const experience     = (data.experience     as any[]) || [];
  const education      = (data.education      as any[]) || [];
  const skillsDict     = parseSkills(data.skills);
  const projects       = (data.projects       as any[]) || [];
  const certifications = (data.certifications as any[]) || [];

  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#1e293b", lineHeight: 1.45, fontSize: 13 }}>
      {/* Header: left-aligned name, contact row, blue accent bar */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#0f172a", letterSpacing: -0.5 }}>
          {name}
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "#475569" }}>{contactLine(data)}</p>
        <div style={{ marginTop: 10, height: 2.5, background: "#2563eb", borderRadius: 2 }} />
      </div>

      {summary && (
        <Section title="Professional Summary" accent="#2563eb">
          <p style={{ margin: 0, fontSize: 12, color: "#334155", lineHeight: 1.6 }}>{summary}</p>
        </Section>
      )}

      {experience.length > 0 && (
        <Section title="Experience" accent="#2563eb">
          {experience.map((exp: any, i: number) => (
            <div key={i} style={{ marginBottom: i < experience.length - 1 ? 12 : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <strong style={{ fontSize: 13, color: "#0f172a" }}>{exp.role}</strong>
                  <span style={{ fontSize: 12, color: "#2563eb", marginLeft: 8 }}>{exp.company}</span>
                  {exp.location && <span style={{ fontSize: 11, color: "#64748b", marginLeft: 8 }}>{exp.location}</span>}
                </div>
                <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>
                  {exp.startDate} – {exp.endDate}
                </span>
              </div>
              {Array.isArray(exp.bullets) && exp.bullets.map((b: string, bi: number) => (
                <div key={bi} style={{ display: "flex", gap: 6, marginTop: 3 }}>
                  <span style={{ color: "#2563eb", marginTop: 1, flexShrink: 0, fontSize: 14, lineHeight: "14px" }}>•</span>
                  <span style={{ fontSize: 11.5, color: "#334155", lineHeight: 1.5 }}>{b}</span>
                </div>
              ))}
            </div>
          ))}
        </Section>
      )}

      {education.length > 0 && (
        <Section title="Education" accent="#2563eb">
          {education.map((edu: any, i: number) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <div>
                <strong style={{ fontSize: 12, color: "#0f172a" }}>{edu.degree} in {edu.field}</strong>
                <div style={{ fontSize: 11, color: "#2563eb" }}>{edu.institution}{edu.gpa ? `  |  GPA: ${edu.gpa}` : ""}</div>
              </div>
              <span style={{ fontSize: 11, color: "#64748b" }}>{edu.startYear} – {edu.endYear}</span>
            </div>
          ))}
        </Section>
      )}

      {skillsDict && Object.keys(skillsDict).length > 0 && (
        <Section title="Technical Skills" accent="#2563eb">
          <SkillsTable skillsDict={skillsDict} categoryColor="#0f172a" skillColor="#334155" />
        </Section>
      )}

      {projects.length > 0 && (
        <Section title="Projects" accent="#2563eb">
          {projects.map((p: any, i: number) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <strong style={{ fontSize: 12, color: "#0f172a" }}>{p.name}</strong>
              <span style={{ fontSize: 11, color: "#64748b", marginLeft: 6 }}>— {p.techStack}</span>
              <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "#334155", lineHeight: 1.5 }}>{p.description}</p>
            </div>
          ))}
        </Section>
      )}

      {certifications.length > 0 && (
        <Section title="Certifications" accent="#2563eb">
          {certifications.map((c: any, i: number) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span><strong>{c.name}</strong>{c.issuer ? ` — ${c.issuer}` : ""}</span>
              {c.year && <span style={{ color: "#64748b" }}>{c.year}</span>}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

// ── Template: Classic ─────────────────────────────────────────────────────────
// FULLY CENTERED header, Georgia serif, double-rule, em-dash bullets, centered section titles

export function ClassicTemplate({ data }: { data: Record<string, unknown> }) {
  const name           = (data.name           as string) || "";
  const summary        = (data.summary        as string) || "";
  const experience     = (data.experience     as any[]) || [];
  const education      = (data.education      as any[]) || [];
  const skillsDict     = parseSkills(data.skills);
  const projects       = (data.projects       as any[]) || [];
  const certifications = (data.certifications as any[]) || [];

  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#111", lineHeight: 1.5, fontSize: 13 }}>
      {/* CENTERED header with thick-thin double rule */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 6px", letterSpacing: 2, textTransform: "uppercase", color: "#111" }}>
          {name}
        </h1>
        {/* Double rule: thick then thin */}
        <div style={{ borderTop: "3px solid #222", marginBottom: 2 }} />
        <div style={{ borderTop: "1px solid #222", marginBottom: 6 }} />
        <p style={{ margin: 0, fontSize: 11, color: "#444", letterSpacing: 0.3 }}>{contactLine(data)}</p>
      </div>

      {summary && (
        <ClassicSection title="Objective">
          <p style={{ margin: 0, fontSize: 12, color: "#222", lineHeight: 1.65, fontStyle: "italic", textAlign: "justify" }}>{summary}</p>
        </ClassicSection>
      )}

      {experience.length > 0 && (
        <ClassicSection title="Work Experience">
          {experience.map((exp: any, i: number) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: 13, color: "#111" }}>{exp.role}</strong>
                <em style={{ fontSize: 11, color: "#555" }}>{exp.startDate} – {exp.endDate}</em>
              </div>
              <div style={{ fontSize: 12, color: "#444", fontStyle: "italic", marginBottom: 3 }}>
                {exp.company}{exp.location ? `, ${exp.location}` : ""}
              </div>
              {Array.isArray(exp.bullets) && exp.bullets.map((b: string, bi: number) => (
                <div key={bi} style={{ display: "flex", gap: 8, marginTop: 3 }}>
                  <span style={{ flexShrink: 0, color: "#333" }}>—</span>
                  <span style={{ fontSize: 11.5, lineHeight: 1.5, color: "#333" }}>{b}</span>
                </div>
              ))}
            </div>
          ))}
        </ClassicSection>
      )}

      {education.length > 0 && (
        <ClassicSection title="Education">
          {education.map((edu: any, i: number) => (
            <div key={i} style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <strong style={{ fontSize: 12, color: "#111" }}>{edu.degree} in {edu.field}</strong>
                <div style={{ fontSize: 11, fontStyle: "italic", color: "#444" }}>
                  {edu.institution}{edu.gpa ? ` — GPA: ${edu.gpa}` : ""}
                </div>
              </div>
              <span style={{ fontSize: 11, color: "#666", whiteSpace: "nowrap" }}>{edu.startYear} – {edu.endYear}</span>
            </div>
          ))}
        </ClassicSection>
      )}

      {skillsDict && Object.keys(skillsDict).length > 0 && (
        <ClassicSection title="Technical Skills">
          <SkillsTable skillsDict={skillsDict} categoryColor="#111" skillColor="#333" />
        </ClassicSection>
      )}

      {projects.length > 0 && (
        <ClassicSection title="Projects">
          {projects.map((p: any, i: number) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong style={{ fontSize: 12, color: "#111" }}>{p.name}</strong>
                <span style={{ fontSize: 11, color: "#555", fontStyle: "italic" }}>{p.techStack}</span>
              </div>
              <p style={{ margin: "3px 0 0", fontSize: 11.5, lineHeight: 1.5, color: "#333", textAlign: "justify" }}>{p.description}</p>
            </div>
          ))}
        </ClassicSection>
      )}

      {certifications.length > 0 && (
        <ClassicSection title="Certifications">
          {certifications.map((c: any, i: number) => (
            <div key={i} style={{ fontSize: 12, marginBottom: 3, color: "#333" }}>
              <strong>{c.name}</strong>{c.issuer ? ` — ${c.issuer}` : ""}{c.year ? ` (${c.year})` : ""}
            </div>
          ))}
        </ClassicSection>
      )}
    </div>
  );
}

// ── Template: Minimal ─────────────────────────────────────────────────────────
// Huge ultra-light name, tiny grey contact, zero section lines — pure whitespace rhythm

export function MinimalTemplate({ data }: { data: Record<string, unknown> }) {
  const name           = (data.name           as string) || "";
  const summary        = (data.summary        as string) || "";
  const experience     = (data.experience     as any[]) || [];
  const education      = (data.education      as any[]) || [];
  const skillsDict     = parseSkills(data.skills);
  const projects       = (data.projects       as any[]) || [];
  const certifications = (data.certifications as any[]) || [];

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: "#1a1a1a", lineHeight: 1.55, fontSize: 12 }}>
      {/* Header: giant featherweight name, single hairline rule, tiny contact */}
      <div style={{ marginBottom: 0, paddingBottom: 12, borderBottom: "1px solid #e5e7eb" }}>
        <h1 style={{ fontSize: 34, fontWeight: 200, margin: "0 0 4px", letterSpacing: -1, color: "#111", lineHeight: 1 }}>
          {name}
        </h1>
        <p style={{ margin: 0, fontSize: 10, color: "#999", letterSpacing: 0.5 }}>{contactLine(data)}</p>
      </div>

      {summary && (
        <MinimalSection title="Summary">
          <p style={{ margin: 0, fontSize: 12, color: "#555", lineHeight: 1.7, fontWeight: 300 }}>{summary}</p>
        </MinimalSection>
      )}

      {experience.length > 0 && (
        <MinimalSection title="Experience">
          {experience.map((exp: any, i: number) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span>
                  <strong style={{ fontSize: 12.5, color: "#111", fontWeight: 600 }}>{exp.role}</strong>
                  <span style={{ color: "#777", fontSize: 11.5, marginLeft: 8 }}>{exp.company}</span>
                  {exp.location && <span style={{ color: "#bbb", fontSize: 10.5, marginLeft: 6 }}>{exp.location}</span>}
                </span>
                <span style={{ fontSize: 10.5, color: "#ccc", whiteSpace: "nowrap" }}>{exp.startDate} – {exp.endDate}</span>
              </div>
              {Array.isArray(exp.bullets) && exp.bullets.map((b: string, bi: number) => (
                <div key={bi} style={{ display: "flex", gap: 7, marginTop: 4, paddingLeft: 2 }}>
                  <span style={{ color: "#ccc", fontSize: 10, marginTop: 2, flexShrink: 0 }}>·</span>
                  <span style={{ fontSize: 11, color: "#555", lineHeight: 1.55, fontWeight: 300 }}>{b}</span>
                </div>
              ))}
            </div>
          ))}
        </MinimalSection>
      )}

      {education.length > 0 && (
        <MinimalSection title="Education">
          {education.map((edu: any, i: number) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <strong style={{ fontSize: 11.5, fontWeight: 500, color: "#222" }}>{edu.degree} in {edu.field}</strong>
                <div style={{ fontSize: 10.5, color: "#999", marginTop: 1 }}>{edu.institution}{edu.gpa ? `  ·  GPA ${edu.gpa}` : ""}</div>
              </div>
              <span style={{ fontSize: 10.5, color: "#ccc" }}>{edu.startYear}–{edu.endYear}</span>
            </div>
          ))}
        </MinimalSection>
      )}

      {skillsDict && Object.keys(skillsDict).length > 0 && (
        <MinimalSection title="Skills">
          <SkillsTable skillsDict={skillsDict} categoryColor="#666" skillColor="#888" />
        </MinimalSection>
      )}

      {projects.length > 0 && (
        <MinimalSection title="Projects">
          {projects.map((p: any, i: number) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#333" }}>{p.name}</span>
              <span style={{ fontSize: 10, color: "#bbb", marginLeft: 8 }}>{p.techStack}</span>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#666", lineHeight: 1.6, fontWeight: 300 }}>{p.description}</p>
            </div>
          ))}
        </MinimalSection>
      )}

      {certifications.length > 0 && (
        <MinimalSection title="Certifications">
          {certifications.map((c: any, i: number) => (
            <div key={i} style={{ fontSize: 11, color: "#777", marginBottom: 3, fontWeight: 300 }}>
              {c.name}{c.issuer ? ` · ${c.issuer}` : ""}{c.year ? ` · ${c.year}` : ""}
            </div>
          ))}
        </MinimalSection>
      )}
    </div>
  );
}

// ── Template: Executive ───────────────────────────────────────────────────────
// TWO-COLUMN: dark navy sidebar (36%) + white main content (64%)
// Sidebar holds: name, contact, skills, education, certifications
// Main holds: summary, experience, projects

export function ExecutiveTemplate({ data }: { data: Record<string, unknown> }) {
  const name           = (data.name           as string) || "";
  const targetRole     = (data.targetRole     as string) || "";
  const summary        = (data.summary        as string) || "";
  const experience     = (data.experience     as any[]) || [];
  const education      = (data.education      as any[]) || [];
  const skillsDict     = parseSkills(data.skills);
  const projects       = (data.projects       as any[]) || [];
  const certifications = (data.certifications as any[]) || [];

  const contactFields: Array<{ label: string; value: unknown }> = [
    { label: "✉", value: data.email },
    { label: "✆", value: data.phone },
    { label: "⌖", value: data.location },
    { label: "in", value: data.linkedin },
    { label: "gh", value: data.github },
  ].filter((f) => Boolean(f.value));

  return (
    <div style={{ display: "flex", fontFamily: "Arial, Helvetica, sans-serif", lineHeight: 1.5, fontSize: 12, minHeight: "100%" }}>
      {/* ── LEFT SIDEBAR ── */}
      <div style={{ width: "36%", background: "#0f172a", color: "#fff", padding: "20px 16px", flexShrink: 0 }}>
        {/* Name + tagline */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", lineHeight: 1.2, marginBottom: 4 }}>{name}</div>
          {targetRole && (
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{targetRole}</div>
          )}
        </div>

        {/* Contact details */}
        {contactFields.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#64748b", marginBottom: 6 }}>Contact</div>
            {contactFields.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "flex-start" }}>
                <span style={{ fontSize: 10, color: "#64748b", width: 14, flexShrink: 0, marginTop: 0.5 }}>{f.label}</span>
                <span style={{ fontSize: 10.5, color: "#cbd5e1", wordBreak: "break-all", lineHeight: 1.4 }}>{f.value as string}</span>
              </div>
            ))}
          </div>
        )}

        {/* Skills in sidebar */}
        {skillsDict && Object.keys(skillsDict).length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#64748b", marginBottom: 8 }}>Skills</div>
            {Object.entries(skillsDict).filter(([, list]) => list.length > 0).map(([category, list]) => (
              <div key={category} style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", color: "#94a3b8", letterSpacing: 0.5, marginBottom: 2 }}>{category}</div>
                <div style={{ fontSize: 11, color: "#e2e8f0", lineHeight: 1.5 }}>{list.join(", ")}</div>
              </div>
            ))}
          </div>
        )}

        {/* Education in sidebar */}
        {education.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#64748b", marginBottom: 8 }}>Education</div>
            {education.map((edu: any, i: number) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{edu.degree}</div>
                <div style={{ fontSize: 10.5, color: "#94a3b8" }}>{edu.field}</div>
                <div style={{ fontSize: 10.5, color: "#94a3b8" }}>{edu.institution}</div>
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>{edu.startYear} – {edu.endYear}{edu.gpa ? ` · GPA ${edu.gpa}` : ""}</div>
              </div>
            ))}
          </div>
        )}

        {/* Certifications in sidebar */}
        {certifications.length > 0 && (
          <div>
            <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#64748b", marginBottom: 8 }}>Certifications</div>
            {certifications.map((c: any, i: number) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 600, lineHeight: 1.3 }}>{c.name}</div>
                {c.issuer && <div style={{ fontSize: 10, color: "#94a3b8" }}>{c.issuer}</div>}
                {c.year && <div style={{ fontSize: 10, color: "#64748b" }}>{c.year}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RIGHT MAIN CONTENT ── */}
      <div style={{ width: "64%", padding: "20px 20px", background: "#fff", color: "#1e293b" }}>
        {summary && (
          <ExecSection title="Professional Summary">
            <p style={{ margin: 0, fontSize: 12, color: "#334155", lineHeight: 1.7 }}>{summary}</p>
          </ExecSection>
        )}

        {experience.length > 0 && (
          <ExecSection title="Professional Experience">
            {experience.map((exp: any, i: number) => (
              <div key={i} style={{ marginBottom: 14, paddingLeft: 10, borderLeft: "3px solid #0f172a" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <strong style={{ fontSize: 12.5, color: "#0f172a" }}>{exp.role}</strong>
                    <span style={{ fontSize: 11.5, color: "#475569", marginLeft: 8 }}>{exp.company}</span>
                    {exp.location && <span style={{ fontSize: 10.5, color: "#94a3b8", marginLeft: 6 }}>· {exp.location}</span>}
                  </div>
                  <span style={{ fontSize: 10.5, color: "#64748b", whiteSpace: "nowrap" }}>{exp.startDate} – {exp.endDate}</span>
                </div>
                {Array.isArray(exp.bullets) && exp.bullets.map((b: string, bi: number) => (
                  <div key={bi} style={{ display: "flex", gap: 7, marginTop: 3 }}>
                    <span style={{ color: "#0f172a", fontSize: 12, flexShrink: 0, lineHeight: "16px" }}>▪</span>
                    <span style={{ fontSize: 11, color: "#334155", lineHeight: 1.5 }}>{b}</span>
                  </div>
                ))}
              </div>
            ))}
          </ExecSection>
        )}

        {projects.length > 0 && (
          <ExecSection title="Key Projects">
            {projects.map((p: any, i: number) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: 12, color: "#0f172a" }}>{p.name}</strong>
                  <span style={{ fontSize: 10.5, color: "#64748b" }}>{p.techStack}</span>
                </div>
                <p style={{ margin: "3px 0 0", fontSize: 11, color: "#334155", lineHeight: 1.5 }}>{p.description}</p>
              </div>
            ))}
          </ExecSection>
        )}
      </div>
    </div>
  );
}

// ── Template renderer ─────────────────────────────────────────────────────────

export function ResumeTemplateRenderer({
  templateId,
  data,
}: {
  templateId: TemplateId;
  data: Record<string, unknown>;
}) {
  switch (templateId) {
    case "classic":   return <ClassicTemplate   data={data} />;
    case "minimal":   return <MinimalTemplate   data={data} />;
    case "executive": return <ExecutiveTemplate data={data} />;
    default:          return <ModernTemplate    data={data} />;
  }
}
