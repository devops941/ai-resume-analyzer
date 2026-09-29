from app.services.ats_rules import run_ats_checks
from app.services.parsing import parse_resume

STRONG_RESUME = """JANE DOE
jane.doe@example.com | +1 415-555-0142

SUMMARY
Backend engineer with 6 years of experience building scalable APIs.

EXPERIENCE
Senior Backend Engineer
- Led migration of a monolith to microservices, reducing p95 latency by 45%.
- Built a FastAPI service handling 2M requests per day.
- Designed CI/CD pipelines, cutting deploy time by 60%.
- Mentored 4 junior engineers and owned on-call.

Backend Engineer
- Developed REST APIs serving 300k users.

EDUCATION
B.S. Computer Science

SKILLS
Python, FastAPI, PostgreSQL, Docker, Kubernetes, AWS
"""

WEAK_RESUME = """John Smith
EXPERIENCE
Responsible for various duties. Worked on projects. Helped with tasks. Was a team player.
"""


def test_strong_resume_scores_higher_than_weak_resume():
    strong_parsed = parse_resume(STRONG_RESUME)
    weak_parsed = parse_resume(WEAK_RESUME)

    strong = run_ats_checks(STRONG_RESUME, strong_parsed, "resume.pdf", 4096)
    weak = run_ats_checks(WEAK_RESUME, weak_parsed, "resume.pdf", 4096)

    assert strong["score"] > weak["score"]
    assert 0 <= strong["score"] <= 100


def test_score_equals_weighted_pass_rate():
    parsed = parse_resume(STRONG_RESUME)
    result = run_ats_checks(STRONG_RESUME, parsed, "resume.pdf", 4096)

    total_weight = sum(c["weight"] for c in result["checks"])
    earned = sum(c["weight"] for c in result["checks"] if c["passed"])
    assert result["score"] == round((earned / total_weight) * 100)
    assert result["passedCount"] == sum(1 for c in result["checks"] if c["passed"])
    assert result["totalChecks"] == len(result["checks"])


def test_unsupported_file_type_fails_its_check():
    parsed = parse_resume(STRONG_RESUME)
    result = run_ats_checks(STRONG_RESUME, parsed, "resume.rtf", 4096)
    file_check = next(c for c in result["checks"] if c["id"] == "file_type")
    assert file_check["passed"] is False


def test_weak_resume_flags_filler_phrases():
    parsed = parse_resume(WEAK_RESUME)
    result = run_ats_checks(WEAK_RESUME, parsed, "resume.pdf", 4096)
    filler = next(c for c in result["checks"] if c["id"] == "no_weak_phrases")
    assert filler["passed"] is False


def test_every_check_has_explanatory_detail():
    parsed = parse_resume(STRONG_RESUME)
    result = run_ats_checks(STRONG_RESUME, parsed, "resume.pdf", 4096)
    for check in result["checks"]:
        assert check["detail"]
        assert check["weight"] > 0
