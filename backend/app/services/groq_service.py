"""Groq LLM integration for qualitative resume analysis.

The Groq API key lives only here (backend). The model is asked for strict JSON;
the response is parsed defensively so a chatty model cannot crash the request.
"""

import json
import re

from groq import Groq

from app.config import settings

SYSTEM_PROMPT = (
    "You are an expert ATS (Applicant Tracking System) and senior technical recruiter. "
    "Analyse the provided resume text, optionally against a job description. "
    "Score consistently, explain your reasoning briefly, and NEVER invent facts, "
    "employers, dates or skills that are not present in the resume. "
    "Respond with a single valid JSON object and nothing else."
)

JSON_CONTRACT = """
Return JSON with exactly this shape:
{
  "overallSummary": string,
  "clarityScore": integer 0-100,
  "impactScore": integer 0-100,
  "structureScore": integer 0-100,
  "strengths": string[],
  "weaknesses": string[],
  "jobFitNotes": string,
  "suggestions": [
    { "section": "Summary" | "Experience" | "Skills" | "Education" | "Formatting", "tip": string }
  ]
}
Each string must be concise (max ~30 words). Provide 3-6 strengths, 3-6 weaknesses and 4-8 suggestions.
"""

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


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
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
    raise ValueError("Model did not return valid JSON")


def _fallback_report(reason: str) -> dict:
    return {
        "overallSummary": (
            "Automated AI review was unavailable, but the rule-based ATS checks "
            "and keyword analysis above are complete."
        ),
        "clarityScore": 0,
        "impactScore": 0,
        "structureScore": 0,
        "strengths": [],
        "weaknesses": [],
        "jobFitNotes": "",
        "suggestions": [],
        "aiAvailable": False,
        "aiError": reason,
    }


def analyze_with_groq(
    resume_text: str,
    job_description: str | None = None,
    ats_result: dict | None = None,
    keyword_gaps: dict | None = None,
) -> dict:
    if not settings.GROQ_API_KEY:
        return _fallback_report("GROQ_API_KEY is not configured")

    context_parts = ["RESUME TEXT:\n" + resume_text[:6000]]
    if job_description:
        context_parts.append("JOB DESCRIPTION:\n" + job_description[:3000])
    if ats_result:
        context_parts.append(
            "RULE-BASED ATS SCORE: "
            f"{ats_result.get('score')}/100 ({ats_result.get('grade')}). "
            "Failed checks: "
            + ", ".join(c["label"] for c in ats_result.get("checks", []) if not c["passed"])
        )
    if keyword_gaps and keyword_gaps.get("missing"):
        context_parts.append(
            "MISSING KEYWORDS vs JOB DESCRIPTION: "
            + ", ".join(item["keyword"] for item in keyword_gaps["missing"][:20])
        )

    user_prompt = "\n\n".join(context_parts) + "\n\n" + JSON_CONTRACT

    try:
        client = _get_client()
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=2000,
            response_format={"type": "json_object"},
        )
        report = _extract_json(response.choices[0].message.content or "")
        report["aiAvailable"] = True
        report.setdefault("suggestions", [])
        report.setdefault("strengths", [])
        report.setdefault("weaknesses", [])
        return report
    except Exception as exc:  # noqa: BLE001 - surface any provider error gracefully
        return _fallback_report(str(exc))
