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
    Table,
    TableStyle as TS,
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


# ── Text sanitization helpers to eliminate PDF '■' black boxes and overlaps ──

def _clean_text_for_pdf(text: str) -> str:
    """Sanitize strings for ReportLab Type 1 fonts to eliminate missing glyph blocks and duplicate terms."""
    if not text or not isinstance(text, str):
        return text or ""
    s = str(text)
    # Deduplicate stuttering terms
    s = re.sub(r'\b(RESTful APIs|REST APIs|RESTful|REST)(\s+(APIs|API|RESTful APIs|REST APIs))+\b', 'RESTful APIs', s, flags=re.IGNORECASE)
    s = re.sub(r'\b(APIs|API)(\s+(APIs|API))+\b', 'APIs', s, flags=re.IGNORECASE)
    s = re.sub(r'\bNode\.js(\.js)+\b', 'Node.js', s, flags=re.IGNORECASE)
    s = re.sub(r'\bNext\.js(\.js)+\b', 'Next.js', s, flags=re.IGNORECASE)
    s = re.sub(r'\bReact\.js(\.js)+\b', 'React.js', s, flags=re.IGNORECASE)
    # Replace non-breaking hyphen and unicode dashes with standard ASCII hyphen
    for ch in ['\u2010', '\u2011', '\u2012', '\u2013', '\u2014', '\u2015', '\u2212', '\u00ad']:
        s = s.replace(ch, '-')
    # Replace smart/curly quotes with straight ASCII quotes
    for ch in ['\u2018', '\u2019', '\u201a', '\u201b']:
        s = s.replace(ch, "'")
    for ch in ['\u201c', '\u201d', '\u201e', '\u201f', '\u00ab', '\u00bb']:
        s = s.replace(ch, '"')
    # Replace unicode spaces
    for ch in ['\u00a0', '\u202f', '\u2007', '\u2009']:
        s = s.replace(ch, ' ')
    for ch in ['\u200b', '\u200c', '\u200d', '\ufeff']:
        s = s.replace(ch, '')
    # Replace unicode bullets/geometric shapes with standard safe entities
    for ch in ['\u2022', '\u25aa', '\u25b8', '\u25cf', '\u25a0', '\u2023', '\u2043', '\u00b7']:
        s = s.replace(ch, '&bull;')
    # Escape ampersands that are not already valid XML entities
    s = re.sub(r'&(?!(amp|bull|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)', '&amp;', s)
    # Ensure safe < and > handling (keep standard inline tags like <b>, <i>, <u>)
    parts = re.split(r'(</?[biu]>)', s)
    escaped_parts = []
    for part in parts:
        if part in ['<b>', '</b>', '<i>', '</i>', '<u>', '</u>']:
            escaped_parts.append(part)
        else:
            escaped_parts.append(part.replace('<', '&lt;').replace('>', '&gt;'))
    return "".join(escaped_parts).strip()


def clean_resume_dict_for_pdf(obj):
    """Recursively clean resume dictionary so all fields are safe for ReportLab."""
    if isinstance(obj, str):
        return _clean_text_for_pdf(obj)
    elif isinstance(obj, list):
        return [clean_resume_dict_for_pdf(item) for item in obj]
    elif isinstance(obj, dict):
        return {k: clean_resume_dict_for_pdf(v) for k, v in obj.items()}
    return obj


def _clean_text_for_docx(text: str) -> str:
    """Sanitize strings for Word document export."""
    if not text or not isinstance(text, str):
        return text or ""
    s = str(text)
    s = re.sub(r'\b(RESTful APIs|REST APIs|RESTful|REST)(\s+(APIs|API|RESTful APIs|REST APIs))+\b', 'RESTful APIs', s, flags=re.IGNORECASE)
    s = re.sub(r'\b(APIs|API)(\s+(APIs|API))+\b', 'APIs', s, flags=re.IGNORECASE)
    s = re.sub(r'\bNode\.js(\.js)+\b', 'Node.js', s, flags=re.IGNORECASE)
    s = re.sub(r'\bNext\.js(\.js)+\b', 'Next.js', s, flags=re.IGNORECASE)
    s = re.sub(r'\bReact\.js(\.js)+\b', 'React.js', s, flags=re.IGNORECASE)
    for ch in ['\u2010', '\u2011', '\u2012', '\u2013', '\u2014', '\u2015', '\u2212', '\u00ad']:
        s = s.replace(ch, '-')
    for ch in ['\u2018', '\u2019', '\u201a', '\u201b']:
        s = s.replace(ch, "'")
    for ch in ['\u201c', '\u201d', '\u201e', '\u201f']:
        s = s.replace(ch, '"')
    for ch in ['\u00a0', '\u202f', '\u2007', '\u2009']:
        s = s.replace(ch, ' ')
    for ch in ['\u200b', '\u200c', '\u200d', '\ufeff']:
        s = s.replace(ch, '')
    for ch in ['\u2022', '\u25aa', '\u25b8', '\u25cf', '\u25a0']:
        s = s.replace(ch, '•')
    return s.strip()


def clean_resume_dict_for_docx(obj):
    """Recursively clean resume dictionary for python-docx."""
    if isinstance(obj, str):
        return _clean_text_for_docx(obj)
    elif isinstance(obj, list):
        return [clean_resume_dict_for_docx(item) for item in obj]
    elif isinstance(obj, dict):
        return {k: clean_resume_dict_for_docx(v) for k, v in obj.items()}
    return obj


# ── AI Generation Layer ────────────────────────────────────────────────────────

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
        temperature=0.3,
        max_tokens=3800,
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
    "You are an expert executive resume writer and career coach. "
    "Transform raw user inputs into a polished, high-impact, ATS-optimised resume. "
    "CRITICAL REQUIREMENT 1 (CONTENT VOLUME): Match the content volume to the user's requested page length so it fills the target pages completely without leaving half-blank pages. "
    "CRITICAL REQUIREMENT 2 (PROFESSIONAL CASING & PREDICTION): Even if the user typed everything in lowercase (e.g. 'manoj kumar', 'full stack developer', 'bengaluru, india', 'bsc computer science', 'react, node.js, aws, mongodb', 'acme corp'), you MUST intelligently predict and apply exact professional industry-standard capitalization: "
    "Candidate Name: Proper Title Case (e.g. 'Manoj Kumar'). "
    "Job Titles: Proper Title Case (e.g. 'Full Stack Developer', 'Software Engineer'). "
    "Locations: Proper Capitalization (e.g. 'Bengaluru, India', 'San Francisco, CA'). "
    "Companies & Institutions: Canonical capitalization (e.g. 'Google', 'IBM', 'TCS', 'Stanford University'). "
    "Technical Skills: Exact canonical casing (e.g. 'React.js', 'Node.js', 'Next.js', 'FastAPI', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes', 'CI/CD', 'TypeScript', 'JavaScript', 'Python', 'C++', 'SQL', 'RESTful APIs', 'GraphQL'). "
    "Degrees: Formal academic abbreviations (e.g. 'B.Sc in Computer Science', 'M.Sc', 'B.Tech', 'B.E.'). "
    "CRITICAL REQUIREMENT 3 (STRICT CONTACT LINKS - NO FAKE URLS): NEVER invent, guess, or fabricate LinkedIn, GitHub, or portfolio URLs. If the user did not provide a LinkedIn or GitHub link in USER INPUT, you MUST return empty string \"\" for them. "
    "CRITICAL REQUIREMENT 4 (CONTENT RELEVANCE & ACCURACY): Only add content that is possible and directly relevant to the candidate's background. If the user provided specific work experience companies, expand achievements ONLY for those companies—do NOT invent extra unrelated employers. If the user did not enter any certifications, return an empty array []. DO NOT invent fake certificates. "
    "DYNAMIC PREDICTION (NO STATIC TEXT): Dynamically predict, extrapolate, and customize bullet points and achievements tailored to the candidate's target role and stack. Every bullet point must begin with a capitalized strong action verb and follow proper punctuation. "
    "Use standard ASCII hyphens (-) for hyphens and straight quotes (' and \") to ensure compatibility. "
    "Respond with a single valid JSON object and nothing else."
)

GENERATOR_CONTRACT = """
Return JSON with exactly this shape:
{
  "name": string,
  "email": string,
  "phone": string,
  "location": string,
  "linkedin": string (empty string "" if not explicitly in USER INPUT, NEVER fabricate),
  "github": string (empty string "" if not explicitly in USER INPUT, NEVER fabricate),
  "summary": string (3-4 sentences, ATS-optimised professional summary with strong core value proposition),
  "experience": [
    {
      "company": string,
      "role": string,
      "startDate": string,
      "endDate": string,
      "location": string,
      "bullets": [string]  (4-5 strong, action-verb, metric-rich bullet points per role)
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
      "description": string (detailed 2-3 sentence overview highlighting architecture, performance, and impact)
    }
  ],
  "certifications": [
    { "name": string, "issuer": string or null, "year": string or null }
  ]
}
Only include skill categories that have at least one skill.
"""


def _build_page_volume_prompt(target_pages: int, role: str) -> str:
    return f"""
TARGET LENGTH REQUIREMENT: {target_pages} FULL PAGE(S).
The user wants a {target_pages}-page resume. You MUST calibrate, expand, and intelligently predict content so that it COMPLETELY AND ELEGANTLY fills {target_pages} page(s) without leaving empty space at the bottom (target ~90-95% vertical fill) and without overflowing onto an extra page!

Guidelines for {target_pages} Page(s):
1. Professional Summary: Write a comprehensive, compelling 3-4 sentence narrative highlighting domain mastery in {role or 'software engineering'}, architectural leadership, cloud/system scalability, and quantified business impact.
2. Experience:
   - For EACH position provided by the user, dynamically predict and generate 4-5 rigorous, quantified bullet points (metrics: %, latency ms, user scale 10k+, cost savings) covering architecture, optimization, CI/CD, and cross-functional leadership.
   - If user provided 0 bullets or brief notes, PREDICT realistic, high-impact achievements tailored specifically to their role and tech stack.
3. Key Projects (CRITICAL FOR FILLING 1 FULL PAGE):
   - Provide 2 to 3 robust project entries.
   - For any project provided by user, expand its description into a detailed 3-4 line breakdown highlighting system architecture, performance optimizations, and quantifiable outcomes.
   - If user provided only 1 project or none, predict and synthesize 1-2 complementary, production-grade projects that align directly with the candidate's target role and tech stack (e.g. an e-commerce platform, real-time analytics engine, or microservice API gateway).
4. Technical Skills:
   - Comprehensively organize all skills into 4 to 6 logical categories (e.g. Languages, Frontend, Backend, Database, Cloud & DevOps, Tools) with 4-8 relevant skills per category.
5. Education:
   - Clean degree formatting (e.g. 'B.Sc in Computer Science' instead of repeating).
6. Certifications: ONLY include certifications if user provided them in USER INPUT. If none provided, return [].
7. Links: Only include LinkedIn/GitHub if provided by user. Otherwise set to "".
"""


def _enrich_fallback_data(user_data: dict, target_pages: int = 1) -> dict:
    """Enrich user data with sensible formatting and full 1-page volume, preserving user inputs strictly."""
    role = user_data.get("targetRole") or "Full Stack Developer"
    name = user_data.get("name") or "Professional"

    summary = user_data.get("summary")
    if not summary:
        summary = (
            f"Results-driven {role} with over 3 years of experience engineering scalable web applications, "
            f"microservices, and responsive user interfaces. Proven track record of boosting application performance "
            f"by 35% and delivering resilient backend architectures with 99.9% uptime. Expert in modern JavaScript "
            f"ecosystems, server-side rendering, and automated CI/CD deployment pipelines."
        )

    experience = user_data.get("experience") or []
    if not experience:
        experience = [{
            "company": "Tech Solutions Inc.",
            "role": role,
            "startDate": "Jun 2023",
            "endDate": "Present",
            "location": user_data.get("location") or "Bengaluru, India",
            "bullets": [
                f"Architected and deployed responsive full-stack applications driving 35% improvement in user retention.",
                "Engineered RESTful APIs and database schemas, achieving sub-200ms query response times under high concurrency.",
                "Led containerization and cloud migration initiatives on AWS, reducing operational hosting overhead by 20%.",
                "Built automated CI/CD workflows using GitHub Actions and Docker, accelerating release cycle frequency.",
                "Mentored junior engineers and conducted structured code reviews to ensure top-tier code maintainability."
            ]
        }]
    else:
        for exp in experience:
            exp_role = exp.get("role") or role
            existing_bullets = exp.get("bullets") or []
            if len(existing_bullets) < 4:
                exp["bullets"] = [
                    f"Architected and deployed responsive UI solutions for {exp_role}, reducing page load latency by 35%.",
                    "Engineered robust RESTful APIs and optimized database queries, handling high concurrent traffic with 99.9% uptime.",
                    "Led microservices decomposition and cloud migration on AWS, decreasing infrastructure overhead by 20%.",
                    "Built automated CI/CD pipelines with GitHub Actions and Docker, shortening release cycles significantly.",
                    "Mentored junior developers and instituted rigorous peer code review standards, cutting defect rates by 35%."
                ]

    projects = user_data.get("projects") or []
    if not projects:
        projects = [
            {
                "name": "E-Commerce & Food Delivery Platform",
                "techStack": "Next.js, React.js, Express.js, Prisma ORM, MongoDB",
                "description": "Developed a microservice-based web application with server-side rendering and dynamic UI. Implemented robust RESTful APIs and Prisma ORM data layer, achieving sub-200ms latency for 15,000+ active users."
            },
            {
                "name": "Cloud Inventory & Order Management System",
                "techStack": "TypeScript, Node.js, Redis, Docker, AWS",
                "description": "Engineered a real-time event-driven tracking system with Redis cache and WebSocket feeds, streamlining logistics workflows and improving catalog query throughput by 40%."
            }
        ]
    elif len(projects) == 1:
        # Add a complementary project to ensure 1 full page is elegantly filled
        projects.append({
            "name": "Cloud Inventory & Order Management System",
            "techStack": "TypeScript, Node.js, Redis, Docker, AWS",
            "description": "Engineered a real-time tracking system integrating TypeScript, Redis cache, and WebSocket feeds, streamlining logistics workflows and improving catalog query throughput by 40%."
        })

    skills = user_data.get("skills") or {}
    if not skills:
        skills = {
            "Languages": ["JavaScript", "TypeScript", "PHP"],
            "Frontend": ["React.js", "Next.js", "HTML5", "CSS3", "Tailwind CSS"],
            "Backend": ["Node.js", "Express.js", "Laravel", "Microservices"],
            "Database": ["MongoDB", "Prisma ORM", "PostgreSQL"],
            "Cloud & DevOps": ["AWS", "Docker", "CI/CD (GitHub Actions)"],
            "Tools": ["Git", "VS Code", "Postman", "Npm"]
        }

    certifications = user_data.get("certifications") or []

    return {
        **user_data,
        "name": name,
        "targetRole": role,
        "linkedin": user_data.get("linkedin") or "",
        "github": user_data.get("github") or "",
        "summary": summary,
        "experience": experience,
        "projects": projects,
        "skills": skills,
        "certifications": certifications,
    }



# ── Intelligent Casing & Professional Formatting ─────────────────────────────

TECH_CASE_MAP = {
    "react": "React.js",
    "react.js": "React.js",
    "reactjs": "React.js",
    "react native": "React Native",
    "node": "Node.js",
    "node.js": "Node.js",
    "nodejs": "Node.js",
    "next": "Next.js",
    "next.js": "Next.js",
    "nextjs": "Next.js",
    "vue": "Vue.js",
    "vue.js": "Vue.js",
    "angular": "Angular",
    "aws": "AWS",
    "gcp": "Google Cloud Platform (GCP)",
    "azure": "Microsoft Azure",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "fastapi": "FastAPI",
    "django": "Django",
    "flask": "Flask",
    "express": "Express.js",
    "express.js": "Express.js",
    "mongodb": "MongoDB",
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "mysql": "MySQL",
    "sql": "SQL",
    "nosql": "NoSQL",
    "redis": "Redis",
    "sqlite": "SQLite",
    "typescript": "TypeScript",
    "javascript": "JavaScript",
    "python": "Python",
    "java": "Java",
    "c++": "C++",
    "c#": "C#",
    "golang": "Go / Golang",
    "go": "Go",
    "rust": "Rust",
    "php": "PHP",
    "ruby": "Ruby",
    "html": "HTML5",
    "html5": "HTML5",
    "css": "CSS3",
    "css3": "CSS3",
    "tailwind": "Tailwind CSS",
    "tailwindcss": "Tailwind CSS",
    "bootstrap": "Bootstrap",
    "graphql": "GraphQL",
    "rest": "REST",
    "rest api": "REST APIs",
    "rest apis": "REST APIs",
    "restful": "RESTful",
    "restful api": "RESTful APIs",
    "restful apis": "RESTful APIs",
    "tailwind": "Tailwind CSS",
    "tailwindcss": "Tailwind CSS",
    "tailwind css": "Tailwind CSS",
    "tailwind css3": "Tailwind CSS",
    "ci/cd": "CI/CD",
    "cicd": "CI/CD",
    "ci/cd (github actions)": "CI/CD (GitHub Actions)",
    "github actions": "GitHub Actions",
    "vscode": "VS Code",
    "vs code": "VS Code",
    "npm": "npm",
    "yarn": "Yarn",
    "microservice": "Microservices",
    "microservices": "Microservices",
    "laravel": "Laravel",
    "cloud & devops": "Cloud & DevOps",
    "ci/cd": "CI/CD",
    "cicd": "CI/CD",
    "git": "Git",
    "github": "GitHub",
    "gitlab": "GitLab",
    "linux": "Linux",
    "unix": "Unix",
    "prisma": "Prisma ORM",
    "prisma orm": "Prisma ORM",
    "firebase": "Firebase",
    "supabase": "Supabase",
    "postman": "Postman",
    "jest": "Jest",
    "cypress": "Cypress",
    "selenium": "Selenium",
    "kafka": "Apache Kafka",
    "rabbitmq": "RabbitMQ",
    "elasticsearch": "Elasticsearch",
    "pandas": "Pandas",
    "numpy": "NumPy",
    "tensorflow": "TensorFlow",
    "pytorch": "PyTorch",
    "scikit-learn": "Scikit-Learn",
    "opencv": "OpenCV",
    "vscode": "VS Code",
    "figma": "Figma",
    "jira": "Jira",
}

DEGREE_MAP = {
    "bsc": "B.Sc",
    "b.sc": "B.Sc",
    "msc": "M.Sc",
    "m.sc": "M.Sc",
    "btech": "B.Tech",
    "b.tech": "B.Tech",
    "mtech": "M.Tech",
    "m.tech": "M.Tech",
    "be": "B.E.",
    "b.e": "B.E.",
    "me": "M.E.",
    "bca": "BCA",
    "mca": "MCA",
    "bba": "BBA",
    "mba": "MBA",
    "bcom": "B.Com",
    "mcom": "M.Com",
    "ba": "B.A.",
    "ma": "M.A.",
    "phd": "Ph.D.",
    "diploma": "Diploma",
}

_SORTED_TECH_KEYS = sorted(TECH_CASE_MAP.keys(), key=len, reverse=True)
_TECH_REGEX_PARTS = []
for _k in _SORTED_TECH_KEYS:
    _esc = re.escape(_k)
    if _k.endswith('.'):
        _TECH_REGEX_PARTS.append(rf'(?<![\w]){_esc}(?![\w\.])')
    elif any(_k.endswith(_c) for _c in ['+', '#', '/']):
        _TECH_REGEX_PARTS.append(rf'(?<![\w]){_esc}(?![\w\+#/])')
    else:
        _TECH_REGEX_PARTS.append(rf'(?<![\w]){_esc}(?![\w]|(\.(?=[a-zA-Z])))')

TECH_TERM_REGEX = re.compile('|'.join(_TECH_REGEX_PARTS), re.IGNORECASE)

def replace_tech_terms(text: str) -> str:
    """Standardize technical terms with exact canonical capitalization without suffix duplication."""
    if not text or not isinstance(text, str):
        return text or ""
    # 1. Pre-clean any existing duplicate stuttering like "RESTful APIs APIs APIs"
    s = re.sub(r'\b(RESTful APIs|REST APIs|RESTful|REST)(\s+(APIs|API|RESTful APIs|REST APIs))+\b', 'RESTful APIs', text, flags=re.IGNORECASE)
    s = re.sub(r'\b(APIs|API)(\s+(APIs|API))+\b', 'APIs', s, flags=re.IGNORECASE)
    # 2. Substitute canonical casing
    s = TECH_TERM_REGEX.sub(lambda m: TECH_CASE_MAP.get(m.group(0).lower(), m.group(0)), s)
    # 3. Post-clean duplicate suffixes
    s = re.sub(r'\b(RESTful APIs|REST APIs)(\s+(APIs|API))+\b', r'\1', s, flags=re.IGNORECASE)
    s = re.sub(r'\b(Node\.js)(\.js)+\b', r'\1', s, flags=re.IGNORECASE)
    s = re.sub(r'\b(Next\.js)(\.js)+\b', r'\1', s, flags=re.IGNORECASE)
    s = re.sub(r'\b(React\.js)(\.js)+\b', r'\1', s, flags=re.IGNORECASE)
    return s


def clean_edu_entry(degree: str, field: str) -> tuple[str, str]:
    """Clean and decouple degree from field so 'bsc in computer science' does not duplicate field."""
    deg = (degree or "").strip()
    fld = (field or "").strip()
    if not deg and not fld:
        return "", ""
    if " in " in deg.lower():
        parts = re.split(r"\s+in\s+", deg, maxsplit=1, flags=re.IGNORECASE)
        d_part = parts[0].strip().lower().rstrip(".")
        d_canonical = DEGREE_MAP.get(d_part, to_smart_title_case(parts[0].strip()))
        rest_field = to_smart_title_case(parts[1].strip()) if len(parts) > 1 else ""
        if not fld or fld.lower() == rest_field.lower():
            return d_canonical, rest_field
        else:
            return d_canonical, to_smart_title_case(fld)
    d_clean = DEGREE_MAP.get(deg.lower().rstrip("."), to_smart_title_case(deg))
    return d_clean, to_smart_title_case(fld)


def get_edu_display_title(degree: str, field: str) -> str:
    """Format education title cleanly without repeating field (e.g. 'B.Sc in Computer Science')."""
    d, f = clean_edu_entry(degree, field)
    if not d:
        return f
    if not f:
        return d
    if f.lower() in d.lower():
        return d
    return f"{d} in {f}"

def format_degree_string(deg_str: str) -> str:
    """Format academic degrees (e.g. 'bsc' -> 'B.Sc', 'bsc in computer science' -> 'B.Sc in Computer Science')."""
    if not deg_str or not isinstance(deg_str, str):
        return ""
    deg_str = deg_str.strip()
    d_low = deg_str.lower()
    if d_low in DEGREE_MAP:
        return DEGREE_MAP[d_low]
    words = deg_str.split()
    if words:
        first = words[0].lower().rstrip(".")
        if first in DEGREE_MAP:
            rest = words[1:]
            rest_words = [w.lower() if w.lower() in {"in", "of", "and", "for"} else w.capitalize() for w in rest]
            return f"{DEGREE_MAP[first]} {' '.join(rest_words)}"
    return to_smart_title_case(deg_str)

def to_smart_title_case(text: str) -> str:
    """Intelligently capitalize titles and names, keeping proper acronyms and technical terms."""
    if not text or not isinstance(text, str):
        return ""
    words = text.strip().split()
    lower_words = {"in", "of", "and", "at", "for", "the", "on", "with", "a", "an"}
    result = []
    for i, w in enumerate(words):
        clean_w = w.lower().strip(",.")
        if clean_w in TECH_CASE_MAP:
            result.append(TECH_CASE_MAP[clean_w])
        elif clean_w in DEGREE_MAP:
            result.append(DEGREE_MAP[clean_w])
        elif i > 0 and clean_w in lower_words:
            result.append(clean_w)
        else:
            result.append(w.capitalize())
    return " ".join(result)

def format_location(loc: str) -> str:
    if not loc or not isinstance(loc, str):
        return ""
    parts = [p.strip() for p in loc.split(",") if p.strip()]
    return ", ".join(p.title() for p in parts)

def format_tech_token(token: str) -> str:
    cleaned = token.strip()
    lower = cleaned.lower()
    if lower in TECH_CASE_MAP:
        return TECH_CASE_MAP[lower]
    if lower in DEGREE_MAP:
        return DEGREE_MAP[lower]
    if cleaned.isupper() and len(cleaned) <= 4:
        return cleaned
    return cleaned.title()

def enforce_professional_casing(data: dict) -> dict:
    """Enforce proper casing across all resume fields so lowercase inputs become professional."""
    if not isinstance(data, dict):
        return data

    res = dict(data)

    # 1. Candidate Name (e.g. manoj kumar -> Manoj Kumar)
    if res.get("name"):
        res["name"] = to_smart_title_case(str(res["name"]))

    # 2. Location (e.g. bengaluru, india -> Bengaluru, India)
    if res.get("location"):
        res["location"] = format_location(str(res["location"]))

    # 3. Target Role (e.g. full stack developer -> Full Stack Developer)
    if res.get("targetRole"):
        res["targetRole"] = to_smart_title_case(str(res["targetRole"]))

    # 4. Summary: Capitalize first character and standardize technical keywords
    if res.get("summary") and isinstance(res["summary"], str):
        summary = res["summary"].strip()
        if summary:
            summary = summary[0].upper() + summary[1:]
            summary = replace_tech_terms(summary)
            res["summary"] = summary

    # 5. Technical Skills
    skills = res.get("skills")
    if isinstance(skills, dict):
        new_skills = {}
        for cat, items in skills.items():
            cat_title = to_smart_title_case(cat)
            new_items = []
            if isinstance(items, list):
                for item in items:
                    if isinstance(item, str):
                        new_items.append(format_tech_token(item))
                    else:
                        new_items.append(item)
            new_skills[cat_title] = new_items
        res["skills"] = new_skills
    elif isinstance(skills, list):
        res["skills"] = [format_tech_token(x) if isinstance(x, str) else x for x in skills]

    # 6. Experience
    if isinstance(res.get("experience"), list):
        for exp in res["experience"]:
            if not isinstance(exp, dict):
                continue
            if exp.get("role"):
                exp["role"] = to_smart_title_case(str(exp["role"]))
            if exp.get("company"):
                c_low = str(exp["company"]).strip().lower()
                if c_low in {"tcs", "ibm", "cognizant", "infosys", "wipro", "hcl", "accenture", "aws", "hp"}:
                    exp["company"] = c_low.upper() if len(c_low) <= 4 else c_low.capitalize()
                else:
                    exp["company"] = to_smart_title_case(str(exp["company"]))
            if exp.get("location"):
                exp["location"] = format_location(str(exp["location"]))
            if isinstance(exp.get("bullets"), list):
                new_bullets = []
                for b in exp["bullets"]:
                    if isinstance(b, str) and b.strip():
                        b_clean = b.strip()
                        b_clean = b_clean[0].upper() + b_clean[1:]
                        if not b_clean.endswith((".", "!", "?")):
                            b_clean += "."
                        b_clean = replace_tech_terms(b_clean)
                        new_bullets.append(b_clean)
                exp["bullets"] = new_bullets

    # 7. Education
    if isinstance(res.get("education"), list):
        for edu in res["education"]:
            if not isinstance(edu, dict):
                continue
            if edu.get("institution"):
                edu["institution"] = to_smart_title_case(str(edu["institution"]))
            deg, fld = clean_edu_entry(str(edu.get("degree") or ""), str(edu.get("field") or ""))
            edu["degree"] = deg
            edu["field"] = fld

    # 8. Projects
    if isinstance(res.get("projects"), list):
        for p in res["projects"]:
            if not isinstance(p, dict):
                continue
            if p.get("name"):
                p["name"] = to_smart_title_case(str(p["name"]))
            if p.get("techStack"):
                stack_parts = [format_tech_token(part) for part in str(p["techStack"]).split(",") if part.strip()]
                p["techStack"] = ", ".join(stack_parts)
            if p.get("description") and isinstance(p["description"], str):
                desc = p["description"].strip()
                if desc:
                    desc = desc[0].upper() + desc[1:]
                    if not desc.endswith((".", "!", "?")):
                        desc += "."
                    desc = replace_tech_terms(desc)
                    p["description"] = desc

    # 9. Certifications
    if isinstance(res.get("certifications"), list):
        for cert in res["certifications"]:
            if not isinstance(cert, dict):
                continue
            if cert.get("name"):
                cert["name"] = to_smart_title_case(str(cert["name"]))
            if cert.get("issuer"):
                cert["issuer"] = to_smart_title_case(str(cert["issuer"]))

    return res


def generate_resume_content(user_data: dict) -> dict:
    """Generate polished resume dict. Tries Anthropic first, falls back to Groq, then local enrichment."""
    target_pages = int(user_data.pop("targetPages", 1) or 1)
    prompt_text = user_data.pop("promptText", None)
    role = user_data.get("targetRole", "")
    user_linkedin = str(user_data.get("linkedin") or "").strip()
    user_github = str(user_data.get("github") or "").strip()
    user_has_certifications = bool(user_data.get("certifications"))

    page_guidelines = _build_page_volume_prompt(target_pages, role)

    if prompt_text:
        user_prompt = (
            f"USER DESCRIPTION:\n{prompt_text}\n\n"
            f"{page_guidelines}\n\n"
            f"The user has provided a free-form description. Generate a complete, polished, ATS-optimised resume "
            f"from scratch based on this description, structured to fill {target_pages} page(s).\n\n"
            f"{GENERATOR_CONTRACT}"
        )
    else:
        user_prompt = (
            f"USER INPUT:\n{json.dumps(user_data, indent=2)}\n\n"
            f"{page_guidelines}\n\n"
            f"CRITICAL INSTRUCTIONS FOR AI GENERATION:\n"
            f"1. DYNAMIC PREDICTION (DO NOT USE STATIC TEXT): Extrapolate and dynamically generate high-impact achievements, bullet points, and metrics tailored specifically to the candidate's target role and tech stack. Expand content so it COMPLETELY FILLS {target_pages} page(s) cleanly without leaving empty space.\n"
            f"2. CAPITALIZATION PREDICTION: If inputs are provided in all-lowercase (e.g. 'manoj kumar', 'full stack developer', 'bengaluru, india', 'bsc in computer science', 'react, node.js, aws, mongodb', 'acme corp'), you MUST intelligently capitalize every field into proper Title Case, canonical technical casing (React.js, Node.js, FastAPI, AWS, MongoDB), and standard academic degrees (B.Sc in Computer Science).\n\n"
            f"{GENERATOR_CONTRACT}"
        )

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
        result = _enrich_fallback_data(user_data, target_pages)

    result.setdefault("experience", [])
    result.setdefault("education", [])
    result.setdefault("skills", {})
    result.setdefault("projects", [])
    result.setdefault("certifications", [])

    # STRICT USER DATA PRESERVATION (No AI hallucinated links or unasked fake certificates)
    result["linkedin"] = user_linkedin
    result["github"] = user_github
    if not user_has_certifications:
        result["certifications"] = []

    result = enforce_professional_casing(result)
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
        lines.append(f"{exp.get('role')} - {exp.get('company')} ({exp.get('startDate')} - {exp.get('endDate')})")
        for b in exp.get("bullets", []):
            lines.append(f"- {b}")
        lines.append("")

    lines.append("EDUCATION")
    for edu in data.get("education", []):
        gpa = f" | GPA: {edu['gpa']}" if edu.get("gpa") else ""
        lines.append(f"{get_edu_display_title(edu.get('degree'), edu.get('field'))} - {edu.get('institution')} ({edu.get('startYear')}-{edu.get('endYear')}){gpa}")
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
                cert += f" - {c['issuer']}"
            if c.get("year"):
                cert += f" ({c['year']})"
            lines.append(cert)

    return "\n".join(lines)


# ── PDF Builder 1: Modern Template ───────────────────────────────────────────

def build_pdf(raw_data: dict) -> bytes:
    data = clean_resume_dict_for_pdf(enforce_professional_casing(raw_data))
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=0.65 * inch,
        rightMargin=0.65 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
    )

    DARK = colors.HexColor("#0f172a")
    ACCENT = colors.HexColor("#2563eb")

    # Explicit leading on all styles prevents collisions
    name_style = ParagraphStyle("name", fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=DARK, spaceAfter=3)
    contact_style = ParagraphStyle("contact", fontName="Helvetica", fontSize=9, leading=12, textColor=colors.HexColor("#475569"), spaceAfter=5)
    section_style = ParagraphStyle("section", fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=ACCENT, spaceBefore=8, spaceAfter=3)
    role_style = ParagraphStyle("role", fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=DARK, spaceAfter=1)
    sub_style = ParagraphStyle("sub", fontName="Helvetica-Oblique", fontSize=9, leading=12, textColor=colors.HexColor("#64748b"), spaceAfter=3)
    body_style = ParagraphStyle("body", fontName="Helvetica", fontSize=9.5, leading=13.5, textColor=DARK, spaceAfter=2)
    bullet_style = ParagraphStyle("bullet", fontName="Helvetica", fontSize=9.5, leading=13.5, textColor=DARK, leftIndent=12, firstLineIndent=-8, spaceAfter=2)

    story = []

    # Header
    story.append(Paragraph(data.get("name", ""), name_style))
    contact_parts = [p for p in [
        data.get("email"), data.get("phone"), data.get("location"),
        data.get("linkedin"), data.get("github")
    ] if p]
    story.append(Paragraph(" &nbsp;|&nbsp; ".join(contact_parts), contact_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT, spaceBefore=3, spaceAfter=6))

    def section(title: str):
        story.append(Paragraph(title.upper(), section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceBefore=2, spaceAfter=4))

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
            date_line = f"{exp.get('company', '')}  |  {exp.get('startDate', '')} - {exp.get('endDate', '')}"
            if loc:
                date_line += f"  |  {loc}"
            story.append(Paragraph(date_line, sub_style))
            for b in exp.get("bullets", []):
                story.append(Paragraph(f"&bull; {b}", bullet_style))
            story.append(Spacer(1, 4))

    # Education
    if data.get("education"):
        section("Education")
        for edu in data["education"]:
            story.append(Paragraph(get_edu_display_title(edu.get('degree'), edu.get('field')), role_style))
            gpa = f"  |  GPA: {edu['gpa']}" if edu.get("gpa") else ""
            story.append(Paragraph(f"{edu.get('institution')}  |  {edu.get('startYear')} - {edu.get('endYear')}{gpa}", sub_style))

    # Skills — clean two-column table
    skills = data.get("skills", {})
    if skills:
        section("Technical Skills")
        if isinstance(skills, dict):
            rows = [(cat, ", ".join(items)) for cat, items in skills.items() if items]
        else:
            rows = [("Skills", ", ".join(skills))]
        tbl = Table(
            [[Paragraph(f"<b>{cat}:</b>", ParagraphStyle("sc", fontName="Helvetica-Bold", fontSize=9.5, leading=13, textColor=colors.HexColor("#0f172a"))),
              Paragraph(vals, ParagraphStyle("sv", fontName="Helvetica", fontSize=9.5, leading=13, textColor=colors.HexColor("#334155")))]
             for cat, vals in rows],
            colWidths=[1.5 * inch, 5.5 * inch],
        )
        tbl.setStyle(TS([
            ("VALIGN",      (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING",  (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 2.5),
            ("LINEBELOW",   (0, 0), (-1, -2), 0.3, colors.HexColor("#e2e8f0")),
        ]))
        story.append(tbl)

    # Projects
    if data.get("projects"):
        section("Projects")
        for p in data["projects"]:
            story.append(Paragraph(p.get("name", ""), role_style))
            if p.get("techStack"):
                story.append(Paragraph(p.get("techStack", ""), sub_style))
            story.append(Paragraph(p.get("description", ""), body_style))
            story.append(Spacer(1, 4))

    # Certifications
    if data.get("certifications"):
        section("Certifications")
        for c in data["certifications"]:
            cert = c.get("name", "")
            if c.get("issuer"):
                cert += f" - {c['issuer']}"
            if c.get("year"):
                cert += f" ({c['year']})"
            story.append(Paragraph(f"&bull; {cert}", bullet_style))

    doc.build(story)
    return buf.getvalue()


# ── PDF Builder 2: Classic Template (Traditional, Serif, Centered Header) ────

def build_pdf_classic(raw_data: dict) -> bytes:
    data = clean_resume_dict_for_pdf(enforce_professional_casing(raw_data))
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
    )

    # Explicit leading on all styles completely prevents header collision
    name_s = ParagraphStyle("cn", fontName="Times-Bold", fontSize=22, leading=26, alignment=1, spaceAfter=5, textColor=colors.black)
    cont_s = ParagraphStyle("cc", fontName="Times-Roman", fontSize=9.5, leading=13, alignment=1, spaceAfter=8, textColor=colors.HexColor("#333333"))
    head_s = ParagraphStyle("ch", fontName="Times-Bold", fontSize=10.5, leading=13.5, alignment=1, spaceBefore=10, spaceAfter=2, textColor=colors.black)
    role_s = ParagraphStyle("cr", fontName="Times-Bold", fontSize=10.5, leading=13.5, spaceAfter=1, textColor=colors.black)
    sub_s  = ParagraphStyle("cs", fontName="Times-Italic", fontSize=9.5, leading=12.5, spaceAfter=3, textColor=colors.HexColor("#444444"))
    body_s = ParagraphStyle("cb", fontName="Times-Roman", fontSize=10, leading=14, spaceAfter=2, textColor=colors.black)
    bul_s  = ParagraphStyle("cbl", fontName="Times-Roman", fontSize=10, leading=14, leftIndent=14, firstLineIndent=-8, spaceAfter=2, textColor=colors.black)

    story = []

    # Centered Header with no collision
    story.append(Paragraph(data.get("name", "").upper(), name_s))
    contact_parts = [p for p in [
        data.get("email"), data.get("phone"), data.get("location"),
        data.get("linkedin"), data.get("github")
    ] if p]
    story.append(Paragraph(" &nbsp;|&nbsp; ".join(contact_parts), cont_s))
    # Elegant double-rule
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.black, spaceBefore=3, spaceAfter=2))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.black, spaceBefore=0, spaceAfter=7))

    def csection(title):
        story.append(Paragraph(f"&mdash;&mdash; {title.upper()} &mdash;&mdash;", head_s))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#bbbbbb"), spaceBefore=2, spaceAfter=5))

    if data.get("summary"):
        csection("Professional Objective")
        story.append(Paragraph(f"<i>{data['summary']}</i>", body_s))

    if data.get("experience"):
        csection("Work Experience")
        for exp in data["experience"]:
            story.append(Paragraph(exp.get("role", ""), role_s))
            loc = f", {exp['location']}" if exp.get("location") else ""
            story.append(Paragraph(f"<i>{exp.get('company','')}{loc}</i>  -  {exp.get('startDate','')} - {exp.get('endDate','')}", sub_s))
            for b in exp.get("bullets", []):
                story.append(Paragraph(f"&bull; {b}", bul_s))
            story.append(Spacer(1, 4))

    if data.get("education"):
        csection("Education")
        for edu in data["education"]:
            story.append(Paragraph(get_edu_display_title(edu.get('degree'), edu.get('field')), role_s))
            gpa = f"  |  GPA: {edu['gpa']}" if edu.get("gpa") else ""
            story.append(Paragraph(f"<i>{edu.get('institution')}  -  {edu.get('startYear')} - {edu.get('endYear')}{gpa}</i>", sub_s))

    skills_c = data.get("skills", {})
    if skills_c:
        csection("Technical Skills")
        if isinstance(skills_c, dict):
            for cat, items in skills_c.items():
                if items:
                    story.append(Paragraph(f"<b>{cat}:</b>  {', '.join(items)}", body_s))
        else:
            story.append(Paragraph(" &bull; ".join(skills_c), body_s))

    if data.get("projects"):
        csection("Projects")
        for p in data["projects"]:
            story.append(Paragraph(f"{p.get('name','')}  <i>({p.get('techStack','')})</i>", role_s))
            story.append(Paragraph(p.get("description", ""), body_s))
            story.append(Spacer(1, 4))

    if data.get("certifications"):
        csection("Certifications")
        for c in data["certifications"]:
            cert = c.get("name", "")
            if c.get("issuer"):
                cert += f" - {c['issuer']}"
            if c.get("year"):
                cert += f" ({c['year']})"
            story.append(Paragraph(f"&bull; {cert}", bul_s))

    doc.build(story)
    return buf.getvalue()


# ── PDF Builder 3: Minimal Template (Clean Whitespace, Slate Typography) ─────

def build_pdf_minimal(raw_data: dict) -> bytes:
    data = clean_resume_dict_for_pdf(enforce_professional_casing(raw_data))
    buf = io.BytesIO()
    GRAY = colors.HexColor("#64748b")
    LGRAY = colors.HexColor("#cbd5e1")
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
    )

    name_s = ParagraphStyle("mn", fontName="Helvetica", fontSize=22, leading=26, spaceAfter=3, textColor=colors.HexColor("#111111"))
    cont_s = ParagraphStyle("mc", fontName="Helvetica", fontSize=9, leading=12, spaceAfter=7, textColor=GRAY)
    head_s = ParagraphStyle("mh", fontName="Helvetica-Bold", fontSize=9, leading=12, spaceBefore=10, spaceAfter=4, textColor=GRAY)
    role_s = ParagraphStyle("mr", fontName="Helvetica-Bold", fontSize=10.5, leading=13.5, spaceAfter=1, textColor=colors.HexColor("#111111"))
    sub_s  = ParagraphStyle("ms", fontName="Helvetica", fontSize=9.5, leading=12.5, spaceAfter=3, textColor=GRAY)
    body_s = ParagraphStyle("mb", fontName="Helvetica", fontSize=9.5, leading=13.5, spaceAfter=2, textColor=colors.HexColor("#444444"))
    bul_s  = ParagraphStyle("mbl", fontName="Helvetica", fontSize=9.5, leading=13.5, leftIndent=12, firstLineIndent=-8, spaceAfter=2, textColor=colors.HexColor("#444444"))

    story = []
    story.append(Paragraph(data.get("name", ""), name_s))
    contact_parts = [p for p in [data.get("email"), data.get("phone"), data.get("location"), data.get("linkedin"), data.get("github")] if p]
    story.append(Paragraph(" &nbsp;|&nbsp; ".join(contact_parts), cont_s))
    story.append(Spacer(1, 8))

    def msection(title):
        story.append(Paragraph(title.upper(), head_s))
        # Minimal template uses clean whitespace, NO horizontal divider rules

    if data.get("summary"):
        msection("Summary")
        story.append(Paragraph(data["summary"], body_s))

    if data.get("experience"):
        msection("Experience")
        for exp in data["experience"]:
            story.append(Paragraph(exp.get("role", ""), role_s))
            loc = f"  |  {exp['location']}" if exp.get("location") else ""
            story.append(Paragraph(f"{exp.get('company','')}{loc}  |  {exp.get('startDate','')} - {exp.get('endDate','')}", sub_s))
            for b in exp.get("bullets", []):
                story.append(Paragraph(f"&bull; {b}", bul_s))
            story.append(Spacer(1, 4))

    if data.get("education"):
        msection("Education")
        for edu in data["education"]:
            story.append(Paragraph(get_edu_display_title(edu.get('degree'), edu.get('field')), role_s))
            gpa = f"  |  GPA {edu['gpa']}" if edu.get("gpa") else ""
            story.append(Paragraph(f"{edu.get('institution')}  |  {edu.get('startYear')} - {edu.get('endYear')}{gpa}", sub_s))

    skills_m = data.get("skills", {})
    if skills_m:
        msection("Skills")
        if isinstance(skills_m, dict):
            for cat, items in skills_m.items():
                if items:
                    story.append(Paragraph(f"<b>{cat}:</b>  {', '.join(items)}", body_s))
        else:
            story.append(Paragraph(" &bull; ".join(skills_m), body_s))

    if data.get("projects"):
        msection("Projects")
        for p in data["projects"]:
            story.append(Paragraph(p.get("name", ""), role_s))
            story.append(Paragraph(p.get("techStack", ""), sub_s))
            story.append(Paragraph(p.get("description", ""), body_s))
            story.append(Spacer(1, 4))

    if data.get("certifications"):
        msection("Certifications")
        for c in data["certifications"]:
            cert = c.get("name", "")
            if c.get("issuer"):
                cert += f" - {c['issuer']}"
            if c.get("year"):
                cert += f" ({c['year']})"
            story.append(Paragraph(f"&bull; {cert}", body_s))

    doc.build(story)
    return buf.getvalue()


# ── PDF Builder 4: Executive Template (True 2-Column Sidebar Layout) ─────────

def build_pdf_executive(raw_data: dict) -> bytes:
    """Build Executive PDF with dark navy left sidebar (100% full-height top to bottom) and white main content (65%)."""
    data = clean_resume_dict_for_pdf(enforce_professional_casing(raw_data))
    buf = io.BytesIO()
    NAVY = colors.HexColor("#0f172a")
    SLATE = colors.HexColor("#94a3b8")
    MUTED = colors.HexColor("#64748b")
    LIGHT = colors.HexColor("#cbd5e1")
    TEXT = colors.HexColor("#334155")
    DARK = colors.HexColor("#0f172a")

    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=0,
        rightMargin=0,
        topMargin=0,
        bottomMargin=0,
    )

    # 100% Full-height navy sidebar callback (covers 0 to 11 inches on every page)
    def draw_executive_sidebar(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(NAVY)
        canvas.rect(0, 0, 2.75 * inch, 11 * inch, fill=True, stroke=False)
        canvas.restoreState()

    # ── Left sidebar styles (white & slate text on #0f172a) ──
    s_name = ParagraphStyle("s_name", fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=colors.white)
    s_role = ParagraphStyle("s_role", fontName="Helvetica", fontSize=10, leading=14, textColor=SLATE)
    s_head = ParagraphStyle("s_head", fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=MUTED, spaceBefore=16, spaceAfter=5)
    s_item = ParagraphStyle("s_item", fontName="Helvetica", fontSize=9, leading=13.5, textColor=LIGHT)
    s_bold = ParagraphStyle("s_bold", fontName="Helvetica-Bold", fontSize=9.5, leading=13.5, textColor=colors.white)
    s_sub  = ParagraphStyle("s_sub", fontName="Helvetica", fontSize=8.5, leading=12, textColor=SLATE)

    # ── Right main styles (dark text on white) ──
    m_head = ParagraphStyle("m_head", fontName="Helvetica-Bold", fontSize=10.5, leading=14, textColor=DARK, spaceBefore=12, spaceAfter=4)
    m_role = ParagraphStyle("m_role", fontName="Helvetica-Bold", fontSize=10, leading=14, textColor=DARK)
    m_sub  = ParagraphStyle("m_sub", fontName="Helvetica-Oblique", fontSize=9, leading=12.5, textColor=MUTED)
    m_body = ParagraphStyle("m_body", fontName="Helvetica", fontSize=9.5, leading=14.5, textColor=TEXT)
    m_bul  = ParagraphStyle("m_bul", fontName="Helvetica", fontSize=9.5, leading=14.5, textColor=TEXT, leftIndent=12, firstLineIndent=-8, spaceAfter=4)

    left_flowables = []
    right_flowables = []

    # ── Populate Left Sidebar ──
    left_flowables.append(Paragraph(data.get("name", "").upper(), s_name))
    if data.get("targetRole"):
        left_flowables.append(Paragraph(data["targetRole"], s_role))
    left_flowables.append(Spacer(1, 14))

    # Contact
    contact_parts = [p for p in [data.get("email"), data.get("phone"), data.get("location"), data.get("linkedin"), data.get("github")] if p]
    if contact_parts:
        left_flowables.append(Paragraph("CONTACT", s_head))
        for c in contact_parts:
            left_flowables.append(Paragraph(c, s_item))
        left_flowables.append(Spacer(1, 14))

    # Skills in sidebar
    skills_dict = data.get("skills", {})
    if skills_dict:
        left_flowables.append(Paragraph("CORE SKILLS", s_head))
        if isinstance(skills_dict, dict):
            for cat, items in skills_dict.items():
                if items:
                    left_flowables.append(Paragraph(f"<b>{cat}:</b> {', '.join(items)}", s_item))
                    left_flowables.append(Spacer(1, 5))
        else:
            left_flowables.append(Paragraph(", ".join(skills_dict), s_item))
        left_flowables.append(Spacer(1, 14))

    # Education in sidebar
    if data.get("education"):
        left_flowables.append(Paragraph("EDUCATION", s_head))
        for edu in data["education"]:
            left_flowables.append(Paragraph(f"<b>{get_edu_display_title(edu.get('degree'), edu.get('field'))}</b>", s_bold))
            if edu.get("institution"):
                left_flowables.append(Paragraph(edu["institution"], s_item))
            yr = f"{edu.get('startYear', '')} - {edu.get('endYear', '')}"
            gpa = f" | GPA: {edu['gpa']}" if edu.get("gpa") else ""
            left_flowables.append(Paragraph(f"{yr}{gpa}", s_sub))
            left_flowables.append(Spacer(1, 6))

    # Certifications in sidebar
    if data.get("certifications"):
        left_flowables.append(Paragraph("CERTIFICATIONS", s_head))
        for cert in data["certifications"]:
            cname = cert.get("name", "")
            if cert.get("year"):
                cname += f" ({cert['year']})"
            left_flowables.append(Paragraph(f"<b>{cname}</b>", s_bold))
            if cert.get("issuer"):
                left_flowables.append(Paragraph(cert["issuer"], s_sub))
            left_flowables.append(Spacer(1, 4))

    # ── Populate Right Main Content ──
    def add_right_section(title: str):
        right_flowables.append(Paragraph(title.upper(), m_head))
        right_flowables.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"), spaceBefore=2, spaceAfter=6))

    if data.get("summary"):
        add_right_section("Professional Summary")
        right_flowables.append(Paragraph(data["summary"], m_body))
        right_flowables.append(Spacer(1, 14))

    if data.get("experience"):
        add_right_section("Professional Experience")
        for exp in data["experience"]:
            right_flowables.append(Paragraph(f"<b>{exp.get('role', '')}</b> &nbsp;&mdash;&nbsp; {exp.get('company', '')}", m_role))
            dates = f"{exp.get('startDate', '')} - {exp.get('endDate', '')}"
            loc = f" | {exp['location']}" if exp.get("location") else ""
            right_flowables.append(Paragraph(f"{dates}{loc}", m_sub))
            for b in exp.get("bullets", []):
                right_flowables.append(Paragraph(f"&bull; {b}", m_bul))
            right_flowables.append(Spacer(1, 10))

    if data.get("projects"):
        add_right_section("Key Projects")
        for p in data["projects"]:
            right_flowables.append(Paragraph(f"<b>{p.get('name', '')}</b> ({p.get('techStack', '')})", m_role))
            right_flowables.append(Paragraph(p.get("description", ""), m_body))
            right_flowables.append(Spacer(1, 10))

    master_table = Table([[left_flowables, right_flowables]], colWidths=[2.75 * inch, 5.75 * inch])
    master_table.setStyle(TS([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (0, 0), 24),
        ("BOTTOMPADDING", (0, 0), (0, 0), 24),
        ("LEFTPADDING", (0, 0), (0, 0), 18),
        ("RIGHTPADDING", (0, 0), (0, 0), 16),
        ("TOPPADDING", (1, 0), (1, 0), 24),
        ("BOTTOMPADDING", (1, 0), (1, 0), 24),
        ("LEFTPADDING", (1, 0), (1, 0), 20),
        ("RIGHTPADDING", (1, 0), (1, 0), 24),
    ]))

    doc.build([master_table], onFirstPage=draw_executive_sidebar, onLaterPages=draw_executive_sidebar)
    return buf.getvalue()


# ── DOCX Builder (python-docx) ────────────────────────────────────────────────

def build_docx(raw_data: dict) -> bytes:
    data = clean_resume_dict_for_docx(enforce_professional_casing(raw_data))
    doc = Document()

    for section in doc.sections:
        section.top_margin = Pt(36)
        section.bottom_margin = Pt(36)
        section.left_margin = Pt(46)
        section.right_margin = Pt(46)

    def add_name():
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(2)
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
        p.paragraph_format.space_after = Pt(8)
        run = p.add_run("  |  ".join(parts))
        run.font.size = Pt(9.5)
        run.font.color.rgb = RGBColor(0x47, 0x55, 0x69)

    def add_section_heading(title: str):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(3)
        run = p.add_run(title.upper())
        run.bold = True
        run.font.size = Pt(11)
        run.font.color.rgb = RGBColor(0x25, 0x63, 0xeb)
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
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(1)
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(10)

    def add_sub_line(text: str):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(text)
        run.italic = True
        run.font.size = Pt(9)
        run.font.color.rgb = RGBColor(0x64, 0x74, 0x8b)

    def add_body(text: str):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(text)
        run.font.size = Pt(9.5)

    def add_bullet(text: str):
        p = doc.add_paragraph(style="List Bullet")
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(2)
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
            date_line = f"{exp.get('company', '')}  |  {exp.get('startDate', '')} - {exp.get('endDate', '')}"
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
            add_sub_line(f"{edu.get('institution')}  |  {edu.get('startYear')} - {edu.get('endYear')}{gpa}")

    skills_d = data.get("skills", {})
    if skills_d:
        add_section_heading("Technical Skills")
        if isinstance(skills_d, dict):
            for cat, items in skills_d.items():
                if items:
                    p = doc.add_paragraph()
                    p.paragraph_format.space_after = Pt(2)
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
                cert += f" - {c['issuer']}"
            if c.get("year"):
                cert += f" ({c['year']})"
            add_bullet(cert)

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


# ── Template Dispatchers ───────────────────────────────────────────────────────

def build_pdf_for_template(data: dict, template: str = "modern") -> bytes:
    builders = {
        "modern":    build_pdf,
        "classic":   build_pdf_classic,
        "minimal":   build_pdf_minimal,
        "executive": build_pdf_executive,
    }
    return builders.get(template, build_pdf)(data)


def build_docx_for_template(data: dict, template: str = "modern") -> bytes:
    return build_docx(data)
