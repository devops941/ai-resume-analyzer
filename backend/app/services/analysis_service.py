"""Orchestrates parsing, ATS scoring, keyword matching and Groq analysis."""

from app.services.ats_rules import run_ats_checks
from app.services.groq_service import analyze_with_groq
from app.services.keyword_match import find_keyword_gaps
from app.services.parsing import parse_resume


def build_analysis(
    raw_text: str,
    file_name: str,
    file_size: int,
    job_description: str | None = None,
) -> dict:
    parsed = parse_resume(raw_text)
    ats_result = run_ats_checks(raw_text, parsed, file_name, file_size)

    gaps = {"matched": [], "missing": [], "coverage": 0, "keywords": []}
    if job_description:
        gaps = find_keyword_gaps(raw_text, job_description)

    ai_report = analyze_with_groq(
        raw_text,
        job_description=job_description,
        ats_result=ats_result,
        keyword_gaps=gaps,
    )

    suggestions = []
    for item in ai_report.get("suggestions", []) or []:
        if isinstance(item, dict) and item.get("tip"):
            suggestions.append(
                {"section": item.get("section", "General"), "tip": item["tip"]}
            )

    # Guarantee actionable output even if the LLM omitted suggestions.
    if not suggestions:
        suggestions = _rule_based_suggestions(ats_result, gaps)

    # Rule-based score and AI quality score blended for the headline number.
    ai_scores = [
        ai_report.get("clarityScore") or 0,
        ai_report.get("impactScore") or 0,
        ai_report.get("structureScore") or 0,
    ]
    if ai_report.get("aiAvailable") and any(ai_scores):
        ai_avg = sum(ai_scores) / len(ai_scores)
        final_score = round(ats_result["score"] * 0.6 + ai_avg * 0.4)
    else:
        final_score = ats_result["score"]

    if gaps.get("coverage") and job_description:
        final_score = round(final_score * 0.8 + gaps["coverage"] * 0.2)
    final_score = max(0, min(100, final_score))

    missing_skills = [item["keyword"] for item in gaps.get("missing", [])]

    return {
        "parsed": parsed,
        "atsScore": final_score,
        "atsGrade": _grade(final_score),
        "atsChecks": ats_result["checks"],
        "aiReport": ai_report,
        "keywordGaps": gaps.get("missing", []),
        "keywordMatches": gaps.get("matched", []),
        "keywordCoverage": gaps.get("coverage", 0),
        "suggestions": suggestions,
        "missingSkills": missing_skills,
    }


def _grade(score: int) -> str:
    if score >= 85:
        return "Excellent"
    if score >= 70:
        return "Good"
    if score >= 50:
        return "Needs Work"
    return "Poor"


def _rule_based_suggestions(ats_result: dict, gaps: dict) -> list[dict]:
    tips: list[dict] = []
    section_map = {
        "summary_section": ("Summary", "Add a 2-3 line professional summary at the top."),
        "skills_section": ("Skills", "Add a dedicated Skills section listing your tools."),
        "action_verbs": ("Experience", "Start each bullet with a strong action verb."),
        "quantified_results": ("Experience", "Quantify impact with numbers and percentages."),
        "bullet_points": ("Formatting", "Convert paragraphs into concise bullet points."),
        "contact_email": ("Formatting", "Add a plain-text email address to the header."),
        "contact_phone": ("Formatting", "Add a plain-text phone number to the header."),
    }
    for check in ats_result["checks"]:
        if not check["passed"] and check["id"] in section_map:
            section, tip = section_map[check["id"]]
            tips.append({"section": section, "tip": tip})
    if gaps.get("missing"):
        top = ", ".join(item["keyword"] for item in gaps["missing"][:6])
        tips.append({"section": "Skills", "tip": f"Weave in these missing keywords: {top}."})
    return tips[:8]
