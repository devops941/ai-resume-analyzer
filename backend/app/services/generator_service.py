"""AI-powered resume generator with PDF and DOCX export.

Flow: user form data → AI enhances content (Anthropic first, Groq fallback) → structured resume dict
      → build_pdf() returns PDF bytes  (reportlab)
      → build_docx() returns DOCX bytes (python-docx)
"""

import io
import json
import logging
import re

from groq import Groq
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)
from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

from app.config import settings

_groq_client: Groq | None = None


def _get_groq_client() -> Groq:
    global _groq_client
    if _groq_client is None:
        _groq_client = Groq(api_key=settings.GROQ_API_KEY)
    return _groq_client


def _generate_with_anthropic(user_prompt: str) -> dict:
    import anthropic as _ant
    client = _ant.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=4096,
        system=GENERATOR_SYSTEM,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return _extract_json(response.content[0].text)


def _generate_with_groq(user_prompt: str) -> dict:
    client = _get_groq_client()
    response = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": GENERATOR_SYSTEM},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.4,
        max_tokens=3500,
        response_format={"type": "json_object"},
    )
    return _extract_json(response.choices[0].message.content or "")


def _extract_json(content: str) -> dict:
    content = content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?", "", content).strip()
        content = re.sub(r"```$", "", content).strip()
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            return json.loads(match.group(0))
    raise ValueError("Model did not return valid JSON")


GENERATOR_SYSTEM = (
    "You are an expert resume writer and career coach. "
    "Transform raw user inputs into a polished, ATS-optimised resume. "
    "Use strong action verbs, quantify achievements where possible, and keep bullet points concise. "
    "NEVER invent facts not present in the input. "
    "Respond with a single valid JSON object and nothing else."
)

GENERATOR_CONTRACT = """
Return JSON with exactly this shape (all fields required):
{
  "name": string,
  "email": string,
  "phone": string,
  "location": string,
  "linkedin": string,
  "github": string,
  "summary": string (2-4 sentences, ATS-optimised professional summary),
  "experience": [
    {
      "company": string,
      "role": string,
      "startDate": string,
      "endDate": string,
      "location": string,
      "bullets": [string]  (3-5 strong action-verb bullet points per role)
    }
  ],
  "education": [
    {
      "institution": string,
      "degree": string,
      "field": string,
      "startYear": string,
      "endYear": string,
      "gpa": string or null
    }
  ],
  "skills": {
    "Languages":     [string],
    "Frontend":      [string],
    "Backend":       [string],
    "Database":      [string],
    "Cloud & DevOps":[string],
    "Tools":         [string]
  },
  "projects": [
    {
      "name": string,
      "techStack": string,
      "description": string (2-3 sentences)
    }
  ],
  "certifications": [
    { "name": string, "issuer": string or null, "year": string or null }
  ]
}
Only include skill categories that have at least one skill. Omit empty categories entirely.
"""

PROMPT_CONTRACT = """
The user has provided a free-form description. Generate a complete, polished, ATS-optimised resume from scratch based solely on this description.
Infer realistic details that are consistent with the described background. Do NOT invent employers, dates, or qualifications not implied.
""" + GENERATOR_CONTRACT


def generate_resume_content(user_data: dict) -> dict:
    """Generate polished resume dict. Tries Anthropic first, falls back to Groq."""
    prompt_text = user_data.pop("promptText", None)

    if prompt_text:
        user_prompt = f"USER DESCRIPTION:\n{prompt_text}\n\n{PROMPT_CONTRACT}"
    else:
        user_prompt = "USER INPUT:\n" + json.dumps(user_data, indent=2) + "\n\n" + GENERATOR_CONTRACT

    result: dict | None = None

    if settings.ANTHROPIC_API_KEY:
        try:
            result = _generate_with_anthropic(user_prompt)
            logging.info("Resume generated via Anthropic Claude")
        except Exception as exc:
            logging.warning("Anthropic generation failed, falling back to Groq: %s", exc)

    if result is None and settings.GROQ_API_KEY:
        try:
            result = _generate_with_groq(user_prompt)
            logging.info("Resume generated via Groq")
        except Exception as exc:
            logging.error("Groq generation also failed: %s", exc)

    if result is None:
        return user_data

    result.setdefault("experience", [])
    result.setdefault("education", [])
    result.setdefault("skills", {})
    result.setdefault("projects", [])
    result.setdefault("certifications", [])
    return result


def count_pdf_pages(pdf_bytes: bytes) -> int:
    """Return the number of pages in a PDF given its raw bytes."""
    import io as _io
    from PyPDF2 import PdfReader
    try:
        reader = PdfReader(_io.BytesIO(pdf_bytes))
        return len(reader.pages)
    except Exception:
        return 1


def resume_to_text(data: dict) -> str:
    """Convert generated resume dict to plain text (for ATS analysis)."""
    lines: list[str] = [
        data.get("name", ""),
        data.get("email", "") + "  " + data.get("phone", "") + "  " + data.get("location", ""),
        data.get("linkedin", "") + "  " + data.get("github", ""),
        "",
        "PROFESSIONAL SUMMARY",
        data.get("summary", ""),
        "",
        "EXPERIENCE",
    ]
    for exp in data.get("experience", []):
        lines.append(f"{exp.get('role')} — {exp.get('company')} ({exp.get('startDate')} – {exp.get('endDate')})")
        for b in exp.get("bullets", []):
            lines.append(f"• {b}")
        lines.append("")

    lines.append("EDUCATION")
    for edu in data.get("education", []):
        gpa = f" | GPA: {edu['gpa']}" if edu.get("gpa") else ""
        lines.append(f"{edu.get('degree')} in {edu.get('field')} — {edu.get('institution')} ({edu.get('startYear')}–{edu.get('endYear')}){gpa}")
    lines.append("")

    lines.append("TECHNICAL SKILLS")
    skills = data.get("skills", {})
    if isinstance(skills, dict):
        for cat, items in skills.items():
            if items:
                lines.append(f"{cat}: {', '.join(items)}")
    else:
        lines.append(", ".join(skills))
    lines.append("")

    if data.get("projects"):
        lines.append("PROJECTS")
        for p in data["projects"]:
            lines.append(f"{p.get('name')} | {p.get('techStack')}")
            lines.append(p.get("description", ""))
        lines.append("")

    if data.get("certifications"):
        lines.append("CERTIFICATIONS")
        for c in data["certifications"]:
            cert = c.get("name", "")
            if c.get("issuer"):
                cert += f" — {c['issuer']}"
            if c.get("year"):
                cert += f" ({c['year']})"
            lines.append(cert)

    return "\n".join(lines)


# ── PDF builder (reportlab) ────────────────────────────────────────────────────

def build_pdf(data: dict) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=0.65 * inch,
        rightMargin=0.65 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
    )

    styles = getSampleStyleSheet()
    DARK = colors.HexColor("#0f172a")
    ACCENT = colors.HexColor("#2563eb")

    name_style = ParagraphStyle("name", fontName="Helvetica-Bold", fontSize=20, textColor=DARK, spaceAfter=2)
    contact_style = ParagraphStyle("contact", fontName="Helvetica", fontSize=9, textColor=colors.HexColor("#475569"), spaceAfter=4)
    section_style = ParagraphStyle("section", fontName="Helvetica-Bold", fontSize=11, textColor=ACCENT, spaceBefore=10, spaceAfter=2)
    role_style = ParagraphStyle("role", fontName="Helvetica-Bold", fontSize=10, textColor=DARK, spaceAfter=1)
    sub_style = ParagraphStyle("sub", fontName="Helvetica-Oblique", fontSize=9, textColor=colors.HexColor("#64748b"), spaceAfter=3)
    body_style = ParagraphStyle("body", fontName="Helvetica", fontSize=9.5, textColor=DARK, spaceAfter=1, leading=14)
    bullet_style = ParagraphStyle("bullet", fontName="Helvetica", fontSize=9.5, textColor=DARK, leftIndent=12, bulletIndent=0, spaceAfter=1, leading=13)

    story = []

    # Header
    story.append(Paragraph(data.get("name", ""), name_style))
    contact_parts = [p for p in [
        data.get("email"), data.get("phone"), data.get("location"),
        data.get("linkedin"), data.get("github")
    ] if p]
    story.append(Paragraph("  |  ".join(contact_parts), contact_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT, spaceAfter=6))

    def section(title: str):
        story.append(Paragraph(title.upper(), section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceAfter=4))

    # Summary
    if data.get("summary"):
        section("Professional Summary")
        story.append(Paragraph(data["summary"], body_style))

    # Experience
    if data.get("experience"):
        section("Experience")
        for exp in data["experience"]:
            story.append(Paragraph(exp.get("role", ""), role_style))
            loc = exp.get("location", "")
            date_line = f"{exp.get('company', '')}  |  {exp.get('startDate', '')} – {exp.get('endDate', '')}"
            if loc:
                date_line += f"  |  {loc}"
            story.append(Paragraph(date_line, sub_style))
            for b in exp.get("bullets", []):
                story.append(Paragraph(f"• {b}", bullet_style))
            story.append(Spacer(1, 4))

    # Education
    if data.get("education"):
        section("Education")
        for edu in data["education"]:
            story.append(Paragraph(f"{edu.get('degree')} in {edu.get('field')}", role_style))
            gpa = f"  |  GPA: {edu['gpa']}" if edu.get("gpa") else ""
            story.append(Paragraph(f"{edu.get('institution')}  |  {edu.get('startYear')} – {edu.get('endYear')}{gpa}", sub_style))

    # Skills — two-column table (category | skills)
    skills = data.get("skills", {})
    if skills:
        from reportlab.platypus import Table, TableStyle as TS
        section("Technical Skills")
        if isinstance(skills, dict):
            rows = [(cat, ", ".join(items)) for cat, items in skills.items() if items]
        else:
            rows = [("Skills", ", ".join(skills))]
        tbl = Table(
            [[Paragraph(f"<b>{cat}</b>", ParagraphStyle("sc", fontName="Helvetica-Bold", fontSize=9.5, textColor=colors.HexColor("#0f172a"))),
              Paragraph(vals, ParagraphStyle("sv", fontName="Helvetica", fontSize=9.5, textColor=colors.HexColor("#334155"), leading=13))]
             for cat, vals in rows],
            colWidths=[1.3 * inch, 5.0 * inch],
        )
        tbl.setStyle(TS([
            ("VALIGN",      (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING",  (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 3),
            ("LINEBELOW",   (0, 0), (-1, -2), 0.3, colors.HexColor("#e2e8f0")),
        ]))
        story.append(tbl)

    # Projects
    if data.get("projects"):
        section("Projects")
        for p in data["projects"]:
            story.append(Paragraph(p.get("name", ""), role_style))
            story.append(Paragraph(p.get("techStack", ""), sub_style))
            story.append(Paragraph(p.get("description", ""), body_style))
            story.append(Spacer(1, 4))

    # Certifications
    if data.get("certifications"):
        section("Certifications")
        for c in data["certifications"]:
            cert = c.get("name", "")
            if c.get("issuer"):
                cert += f" — {c['issuer']}"
            if c.get("year"):
                cert += f" ({c['year']})"
            story.append(Paragraph(f"• {cert}", bullet_style))

    doc.build(story)
    return buf.getvalue()


# ── DOCX builder (python-docx) ────────────────────────────────────────────────

def _set_run_color(run, hex_color: str):
    r = run._r
    rPr = r.get_or_add_rPr()
    color_el = OxmlElement("w:color")
    color_el.set(qn("w:val"), hex_color.lstrip("#"))
    rPr.append(color_el)


def build_docx(data: dict) -> bytes:
    doc = Document()

    # Narrow margins
    for section in doc.sections:
        section.top_margin = Pt(36)
        section.bottom_margin = Pt(36)
        section.left_margin = Pt(46)
        section.right_margin = Pt(46)

    def add_name():
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(data.get("name", ""))
        run.bold = True
        run.font.size = Pt(22)
        run.font.color.rgb = RGBColor(0x0f, 0x17, 0x2a)

    def add_contact():
        parts = [x for x in [
            data.get("email"), data.get("phone"), data.get("location"),
            data.get("linkedin"), data.get("github")
        ] if x]
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run("  |  ".join(parts))
        run.font.size = Pt(9)
        run.font.color.rgb = RGBColor(0x47, 0x55, 0x69)

    def add_section_heading(title: str):
        p = doc.add_paragraph()
        run = p.add_run(title.upper())
        run.bold = True
        run.font.size = Pt(11)
        run.font.color.rgb = RGBColor(0x25, 0x63, 0xeb)
        # bottom border
        pPr = p._p.get_or_add_pPr()
        pBdr = OxmlElement("w:pBdr")
        bottom = OxmlElement("w:bottom")
        bottom.set(qn("w:val"), "single")
        bottom.set(qn("w:sz"), "6")
        bottom.set(qn("w:space"), "1")
        bottom.set(qn("w:color"), "2563eb")
        pBdr.append(bottom)
        pPr.append(pBdr)

    def add_role_line(text: str):
        p = doc.add_paragraph()
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(10)

    def add_sub_line(text: str):
        p = doc.add_paragraph()
        run = p.add_run(text)
        run.italic = True
        run.font.size = Pt(9)
        run.font.color.rgb = RGBColor(0x64, 0x74, 0x8b)

    def add_body(text: str):
        p = doc.add_paragraph(text)
        p.runs[0].font.size = Pt(9.5) if p.runs else None

    def add_bullet(text: str):
        p = doc.add_paragraph(style="List Bullet")
        run = p.add_run(text)
        run.font.size = Pt(9.5)

    add_name()
    add_contact()

    if data.get("summary"):
        add_section_heading("Professional Summary")
        add_body(data["summary"])

    if data.get("experience"):
        add_section_heading("Experience")
        for exp in data["experience"]:
            add_role_line(exp.get("role", ""))
            loc = exp.get("location", "")
            date_line = f"{exp.get('company', '')}  |  {exp.get('startDate', '')} – {exp.get('endDate', '')}"
            if loc:
                date_line += f"  |  {loc}"
            add_sub_line(date_line)
            for b in exp.get("bullets", []):
                add_bullet(b)

    if data.get("education"):
        add_section_heading("Education")
        for edu in data["education"]:
            add_role_line(f"{edu.get('degree')} in {edu.get('field')}")
            gpa = f"  |  GPA: {edu['gpa']}" if edu.get("gpa") else ""
            add_sub_line(f"{edu.get('institution')}  |  {edu.get('startYear')} – {edu.get('endYear')}{gpa}")

    skills_d = data.get("skills", {})
    if skills_d:
        add_section_heading("Technical Skills")
        if isinstance(skills_d, dict):
            for cat, items in skills_d.items():
                if items:
                    p = doc.add_paragraph()
                    bold_run = p.add_run(f"{cat}: ")
                    bold_run.bold = True
                    bold_run.font.size = Pt(9.5)
                    val_run = p.add_run(", ".join(items))
                    val_run.font.size = Pt(9.5)
        else:
            add_body(", ".join(skills_d))

    if data.get("projects"):
        add_section_heading("Projects")
        for p in data["projects"]:
            add_role_line(p.get("name", ""))
            add_sub_line(p.get("techStack", ""))
            add_body(p.get("description", ""))

    if data.get("certifications"):
        add_section_heading("Certifications")
        for c in data["certifications"]:
            cert = c.get("name", "")
            if c.get("issuer"):
                cert += f" — {c['issuer']}"
            if c.get("year"):
                cert += f" ({c['year']})"
            add_bullet(cert)

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


# ── Classic PDF (traditional black/white, centered header) ────────────────────

def build_pdf_classic(data: dict) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter,
                            leftMargin=0.75*inch, rightMargin=0.75*inch,
                            topMargin=0.65*inch, bottomMargin=0.65*inch)
    styles = getSampleStyleSheet()

    name_s  = ParagraphStyle("cn", fontName="Times-Bold",   fontSize=20, alignment=1, spaceAfter=2, textColor=colors.black)
    cont_s  = ParagraphStyle("cc", fontName="Times-Roman",  fontSize=9,  alignment=1, spaceAfter=6, textColor=colors.HexColor("#444444"))
    head_s  = ParagraphStyle("ch", fontName="Times-Bold",   fontSize=11, spaceBefore=8, spaceAfter=3, textColor=colors.black)
    role_s  = ParagraphStyle("cr", fontName="Times-Bold",   fontSize=11, spaceAfter=1, textColor=colors.black)
    sub_s   = ParagraphStyle("cs", fontName="Times-Italic", fontSize=10, spaceAfter=2, textColor=colors.HexColor("#444444"))
    body_s  = ParagraphStyle("cb", fontName="Times-Roman",  fontSize=10.5, spaceAfter=1, leading=15, textColor=colors.black)
    bul_s   = ParagraphStyle("cbl",fontName="Times-Roman",  fontSize=10.5, leftIndent=12, spaceAfter=1, leading=14, textColor=colors.black)

    story = []
    story.append(Paragraph(data.get("name",""), name_s))

    contact_parts = [p for p in [data.get("email"), data.get("phone"), data.get("location"), data.get("linkedin"), data.get("github")] if p]
    story.append(Paragraph("  |  ".join(contact_parts), cont_s))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.black, spaceAfter=6))

    def csection(title):
        story.append(Paragraph(title.upper(), head_s))
        story.append(HRFlowable(width="100%", thickness=0.75, color=colors.black, spaceAfter=4))

    if data.get("summary"):
        csection("Objective")
        story.append(Paragraph(f"<i>{data['summary']}</i>", body_s))

    if data.get("experience"):
        csection("Work Experience")
        for exp in data["experience"]:
            story.append(Paragraph(exp.get("role",""), role_s))
            loc = f", {exp['location']}" if exp.get("location") else ""
            story.append(Paragraph(f"<i>{exp.get('company','')}{loc}</i>  —  {exp.get('startDate','')} – {exp.get('endDate','')}", sub_s))
            for b in exp.get("bullets", []):
                story.append(Paragraph(f"– {b}", bul_s))
            story.append(Spacer(1, 4))

    if data.get("education"):
        csection("Education")
        for edu in data["education"]:
            story.append(Paragraph(f"{edu.get('degree')} in {edu.get('field')}", role_s))
            gpa = f"  |  GPA: {edu['gpa']}" if edu.get("gpa") else ""
            story.append(Paragraph(f"<i>{edu.get('institution')}  —  {edu.get('startYear')} – {edu.get('endYear')}{gpa}</i>", sub_s))

    skills_c = data.get("skills", {})
    if skills_c:
        csection("Technical Skills")
        if isinstance(skills_c, dict):
            for cat, items in skills_c.items():
                if items:
                    story.append(Paragraph(f"<b>{cat}:</b>  {', '.join(items)}", body_s))
        else:
            story.append(Paragraph("  •  ".join(skills_c), body_s))

    if data.get("projects"):
        csection("Projects")
        for p in data["projects"]:
            story.append(Paragraph(f"{p.get('name','')}  <i>({p.get('techStack','')})</i>", role_s))
            story.append(Paragraph(p.get("description",""), body_s))
            story.append(Spacer(1, 4))

    if data.get("certifications"):
        csection("Certifications")
        for c in data["certifications"]:
            cert = c.get("name","")
            if c.get("issuer"): cert += f" — {c['issuer']}"
            if c.get("year"):   cert += f" ({c['year']})"
            story.append(Paragraph(f"– {cert}", bul_s))

    doc.build(story)
    return buf.getvalue()


# ── Minimal PDF (light, lots of whitespace, gray accents) ─────────────────────

def build_pdf_minimal(data: dict) -> bytes:
    buf = io.BytesIO()
    GRAY = colors.HexColor("#64748b")
    LGRAY = colors.HexColor("#cbd5e1")
    doc = SimpleDocTemplate(buf, pagesize=letter,
                            leftMargin=0.8*inch, rightMargin=0.8*inch,
                            topMargin=0.7*inch, bottomMargin=0.7*inch)

    name_s = ParagraphStyle("mn", fontName="Helvetica",      fontSize=22, spaceAfter=2, textColor=colors.HexColor("#111111"), leading=26)
    cont_s = ParagraphStyle("mc", fontName="Helvetica",      fontSize=9,  spaceAfter=8, textColor=GRAY)
    head_s = ParagraphStyle("mh", fontName="Helvetica",      fontSize=9,  spaceBefore=12, spaceAfter=6, textColor=GRAY, letterSpacing=1.5)
    role_s = ParagraphStyle("mr", fontName="Helvetica-Bold", fontSize=11, spaceAfter=1, textColor=colors.HexColor("#111111"))
    sub_s  = ParagraphStyle("ms", fontName="Helvetica",      fontSize=10, spaceAfter=3, textColor=GRAY)
    body_s = ParagraphStyle("mb", fontName="Helvetica",      fontSize=10.5, spaceAfter=1, leading=15, textColor=colors.HexColor("#444444"))
    bul_s  = ParagraphStyle("mbl",fontName="Helvetica",      fontSize=10.5, leftIndent=10, spaceAfter=1, leading=14, textColor=colors.HexColor("#444444"))

    story = []
    story.append(Paragraph(data.get("name",""), name_s))
    contact_parts = [p for p in [data.get("email"), data.get("phone"), data.get("location"), data.get("linkedin"), data.get("github")] if p]
    story.append(Paragraph("  ·  ".join(contact_parts), cont_s))

    def msection(title):
        story.append(Paragraph(title.upper(), head_s))
        story.append(HRFlowable(width="100%", thickness=0.5, color=LGRAY, spaceAfter=5))

    if data.get("summary"):
        msection("Summary")
        story.append(Paragraph(data["summary"], body_s))

    if data.get("experience"):
        msection("Experience")
        for exp in data["experience"]:
            story.append(Paragraph(exp.get("role",""), role_s))
            loc = f"  ·  {exp['location']}" if exp.get("location") else ""
            story.append(Paragraph(f"{exp.get('company','')}{loc}  ·  {exp.get('startDate','')} – {exp.get('endDate','')}", sub_s))
            for b in exp.get("bullets", []):
                story.append(Paragraph(f"▸ {b}", bul_s))
            story.append(Spacer(1, 6))

    if data.get("education"):
        msection("Education")
        for edu in data["education"]:
            story.append(Paragraph(f"{edu.get('degree')} in {edu.get('field')}", role_s))
            gpa = f"  ·  GPA {edu['gpa']}" if edu.get("gpa") else ""
            story.append(Paragraph(f"{edu.get('institution')}  ·  {edu.get('startYear')}–{edu.get('endYear')}{gpa}", sub_s))

    skills_m = data.get("skills", {})
    if skills_m:
        msection("Skills")
        if isinstance(skills_m, dict):
            for cat, items in skills_m.items():
                if items:
                    story.append(Paragraph(f"<b>{cat}</b>  ·  {', '.join(items)}", body_s))
        else:
            story.append(Paragraph("  ·  ".join(skills_m), body_s))

    if data.get("projects"):
        msection("Projects")
        for p in data["projects"]:
            story.append(Paragraph(p.get("name",""), role_s))
            story.append(Paragraph(p.get("techStack",""), sub_s))
            story.append(Paragraph(p.get("description",""), body_s))
            story.append(Spacer(1, 5))

    if data.get("certifications"):
        msection("Certifications")
        for c in data["certifications"]:
            cert = c.get("name","")
            if c.get("issuer"): cert += f" · {c['issuer']}"
            if c.get("year"):   cert += f" · {c['year']}"
            story.append(Paragraph(cert, body_s))

    doc.build(story)
    return buf.getvalue()


# ── Executive PDF (dark navy header bar) ──────────────────────────────────────

def build_pdf_executive(data: dict) -> bytes:
    from reportlab.platypus import Table, TableStyle

    buf = io.BytesIO()
    NAVY = colors.HexColor("#0f172a")
    SLATE = colors.HexColor("#475569")
    doc = SimpleDocTemplate(buf, pagesize=letter,
                            leftMargin=0, rightMargin=0,
                            topMargin=0, bottomMargin=0.55*inch)

    name_s = ParagraphStyle("en", fontName="Helvetica-Bold", fontSize=22, textColor=colors.white, leading=26)
    cont_s = ParagraphStyle("ec", fontName="Helvetica",      fontSize=9.5, textColor=colors.HexColor("#94a3b8"))
    head_s = ParagraphStyle("eh", fontName="Helvetica-Bold", fontSize=10.5, spaceBefore=2, spaceAfter=4, textColor=NAVY, letterSpacing=0.5)
    role_s = ParagraphStyle("er", fontName="Helvetica-Bold", fontSize=11, spaceAfter=1, textColor=NAVY)
    sub_s  = ParagraphStyle("es", fontName="Helvetica-Oblique", fontSize=9.5, spaceAfter=3, textColor=SLATE)
    body_s = ParagraphStyle("eb", fontName="Helvetica",      fontSize=10.5, spaceAfter=1, leading=15, textColor=colors.HexColor("#334155"))
    bul_s  = ParagraphStyle("ebl",fontName="Helvetica",      fontSize=10.5, leftIndent=12, spaceAfter=1, leading=14, textColor=colors.HexColor("#334155"))

    header_name = Paragraph(data.get("name",""), name_s)
    contact_parts = [p for p in [data.get("email"), data.get("phone"), data.get("location"), data.get("linkedin"), data.get("github")] if p]
    header_contact = Paragraph("  |  ".join(contact_parts), cont_s)

    # Header table spanning full width
    header_table = Table([[header_name], [header_contact]],
                         colWidths=[8.5*inch])
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), NAVY),
        ("TOPPADDING",    (0,0), (-1,-1), 18),
        ("BOTTOMPADDING", (0,0), (-1,-1), 14),
        ("LEFTPADDING",   (0,0), (-1,-1), 36),
        ("RIGHTPADDING",  (0,0), (-1,-1), 36),
    ]))

    story = [header_table, Spacer(1, 10)]

    M = 0.65*inch  # body left/right margin

    body_style_wrapper = ParagraphStyle("bw", leftIndent=M*72/inch, rightIndent=M*72/inch)

    def esection(title):
        p = Paragraph(title.upper(), ParagraphStyle("esh", fontName="Helvetica-Bold", fontSize=10,
                                                    spaceBefore=8, spaceAfter=2, textColor=NAVY,
                                                    letterSpacing=0.8, leftIndent=int(M*72/inch)))
        story.append(p)
        story.append(HRFlowable(width=f"{100 - int(M*72/inch*2/72*100/8.5)}%",
                                x=int(M*72/inch), thickness=2, color=NAVY, spaceAfter=5))

    def body(text, style=body_s):
        p = Paragraph(text, ParagraphStyle(
            style.name + "_m", parent=style,
            leftIndent=int(M*72/inch), rightIndent=int(M*72/inch)))
        story.append(p)

    def bullet(text):
        p = Paragraph(f"▪ {text}", ParagraphStyle(
            "ebm", parent=bul_s,
            leftIndent=int(M*72/inch)+12, rightIndent=int(M*72/inch)))
        story.append(p)

    def role(text):
        p = Paragraph(text, ParagraphStyle("erm", parent=role_s, leftIndent=int(M*72/inch), rightIndent=int(M*72/inch)))
        story.append(p)

    def sub(text):
        p = Paragraph(text, ParagraphStyle("esm", parent=sub_s, leftIndent=int(M*72/inch), rightIndent=int(M*72/inch)))
        story.append(p)

    if data.get("summary"):
        esection("Executive Summary")
        body(data["summary"])

    if data.get("experience"):
        esection("Professional Experience")
        for exp in data["experience"]:
            role(exp.get("role",""))
            loc = f"  ·  {exp['location']}" if exp.get("location") else ""
            sub(f"{exp.get('company','')}{loc}  —  {exp.get('startDate','')} – {exp.get('endDate','')}")
            for b in exp.get("bullets", []):
                bullet(b)
            story.append(Spacer(1, 5))

    if data.get("education"):
        esection("Education")
        for edu in data["education"]:
            role(f"{edu.get('degree')} in {edu.get('field')}")
            gpa = f"  |  GPA: {edu['gpa']}" if edu.get("gpa") else ""
            sub(f"{edu.get('institution')}  |  {edu.get('startYear')} – {edu.get('endYear')}{gpa}")

    skills_e = data.get("skills", {})
    if skills_e:
        esection("Core Competencies")
        if isinstance(skills_e, dict):
            for cat, items in skills_e.items():
                if items:
                    body(f"<b>{cat}:</b>  {', '.join(items)}")
        else:
            body(", ".join(skills_e))

    if data.get("projects"):
        esection("Key Projects")
        for p in data["projects"]:
            role(f"{p.get('name','')}  ({p.get('techStack','')})")
            body(p.get("description",""))
            story.append(Spacer(1, 4))

    if data.get("certifications"):
        esection("Certifications")
        for c in data["certifications"]:
            cert = c.get("name","")
            if c.get("issuer"): cert += f" — {c['issuer']}"
            if c.get("year"):   cert += f" ({c['year']})"
            bullet(cert)

    doc.build(story)
    return buf.getvalue()


# ── Template dispatcher ────────────────────────────────────────────────────────

def build_pdf_for_template(data: dict, template: str = "modern") -> bytes:
    builders = {
        "modern":    build_pdf,
        "classic":   build_pdf_classic,
        "minimal":   build_pdf_minimal,
        "executive": build_pdf_executive,
    }
    return builders.get(template, build_pdf)(data)


def build_docx_for_template(data: dict, template: str = "modern") -> bytes:
    # DOCX uses a single clean builder; template styling is primarily for PDF
    return build_docx(data)
