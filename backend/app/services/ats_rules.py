"""Deterministic ATS compatibility checks.

Each check contributes a fixed weight; scores are the weighted pass rate scaled
to 100. Checks are transparent so the UI can explain every point lost.
"""

import re

REQUIRED_SECTIONS = ["experience", "education", "skills"]
ACTION_VERBS = [
    "led", "built", "designed", "developed", "implemented", "managed", "created",
    "improved", "increased", "reduced", "launched", "delivered", "optimized",
    "automated", "architected", "spearheaded", "drove", "owned", "shipped",
    "mentored", "collaborated", "analyzed", "migrated", "scaled",
]
WEAK_PHRASES = [
    "responsible for", "duties included", "worked on", "helped with",
    "hard worker", "team player", "go-getter", "think outside the box",
]


def _has_metric(text: str) -> bool:
    return bool(re.search(r"\d+\s?(%|percent|x|users|clients|projects|\$|k\b|m\b)", text, re.I)) or bool(
        re.search(r"\b\d{2,}\b", text)
    )


def run_ats_checks(raw_text: str, parsed: dict, file_name: str, file_size: int) -> dict:
    sections = [s.lower() for s in parsed.get("sections", [])]
    lower = raw_text.lower()
    bullet_count = len(re.findall(r"^\s*[-•*]", raw_text, re.M))
    checks: list[dict] = []

    def add(cid, label, passed, weight, detail):
        checks.append(
            {"id": cid, "label": label, "passed": passed, "weight": weight, "detail": detail}
        )

    add(
        "file_type",
        "Supported file type",
        file_name.lower().endswith((".pdf", ".docx", ".txt")),
        8,
        "ATS parsers read PDF and DOCX best; avoid images or scanned pages.",
    )
    add(
        "contact_email",
        "Email address present",
        bool(parsed.get("email")),
        8,
        "A machine-readable email lets recruiters reach you automatically.",
    )
    add(
        "contact_phone",
        "Phone number present",
        bool(parsed.get("phone")),
        6,
        "Include a phone number in plain text (not inside an image).",
    )
    add(
        "name",
        "Name detected at the top",
        bool(parsed.get("name")),
        6,
        "Place your name as the first line so parsers capture it.",
    )
    add(
        "experience_section",
        "Experience section found",
        "experience" in sections,
        10,
        "Use a standard heading such as 'Experience' or 'Work Experience'.",
    )
    add(
        "education_section",
        "Education section found",
        "education" in sections,
        8,
        "Use a standard heading such as 'Education'.",
    )
    add(
        "skills_section",
        "Skills section found",
        "skills" in sections,
        10,
        "A dedicated Skills section improves keyword matching.",
    )
    add(
        "summary_section",
        "Summary/objective present",
        "summary" in sections,
        6,
        "A short professional summary frames your profile for recruiters.",
    )
    detected = [s for s in REQUIRED_SECTIONS if s in sections]
    add(
        "section_structure",
        "Standard section structure",
        len(detected) >= 3,
        8,
        f"Detected sections: {', '.join(parsed.get('sections', [])) or 'none'}.",
    )
    add(
        "bullet_points",
        "Uses bullet points",
        bullet_count >= 5,
        6,
        f"Found {bullet_count} bullet lines; ATS and recruiters favour bullets.",
    )
    add(
        "action_verbs",
        "Achievement-oriented language",
        any(v in lower for v in ACTION_VERBS),
        8,
        "Start bullets with strong action verbs (Led, Built, Optimized...).",
    )
    add(
        "quantified_results",
        "Quantified achievements",
        _has_metric(raw_text),
        8,
        "Add numbers/metrics to show measurable impact.",
    )
    add(
        "no_weak_phrases",
        "Avoids filler phrases",
        not any(p in lower for p in WEAK_PHRASES),
        4,
        "Replace phrases like 'responsible for' with action verbs.",
    )
    length_ok = 250 <= parsed.get("wordCount", 0) <= 1100
    add(
        "length",
        "Appropriate length",
        length_ok,
        4,
        f"Resume has {parsed.get('wordCount', 0)} words; aim for 400-900.",
    )

    total_weight = sum(c["weight"] for c in checks)
    earned = sum(c["weight"] for c in checks if c["passed"])
    score = round((earned / total_weight) * 100) if total_weight else 0

    if score >= 85:
        grade = "Excellent"
    elif score >= 70:
        grade = "Good"
    elif score >= 50:
        grade = "Needs Work"
    else:
        grade = "Poor"

    return {
        "score": score,
        "grade": grade,
        "checks": checks,
        "passedCount": sum(1 for c in checks if c["passed"]),
        "totalChecks": len(checks),
    }
