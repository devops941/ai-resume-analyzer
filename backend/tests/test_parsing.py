from app.services.parsing import extract_text, parse_resume


RESUME = """JANE DOE
jane.doe@example.com | +1 415-555-0142 | linkedin.com/in/janedoe | github.com/janedoe

SUMMARY
Backend engineer with 6 years of experience.

EXPERIENCE
Senior Backend Engineer
- Led migration to microservices, reducing latency by 45%.

EDUCATION
B.S. Computer Science

SKILLS
Python, FastAPI, Docker, PostgreSQL
"""


def test_extract_text_reads_plain_text_uploads():
    assert "JANE DOE" in extract_text(RESUME.encode(), "resume.txt")


def test_extract_text_rejects_unsupported_types():
    try:
        extract_text(b"data", "resume.rtf")
    except ValueError as exc:
        assert "Unsupported file type" in str(exc)
    else:
        raise AssertionError("expected ValueError for unsupported file type")


def test_parse_resume_extracts_contact_and_sections():
    parsed = parse_resume(RESUME)
    assert parsed["name"] == "JANE DOE"
    assert parsed["email"] == "jane.doe@example.com"
    assert parsed["phone"].startswith("+1 415")
    assert "linkedin.com/in/janedoe" in parsed["linkedin"]
    assert "github.com/janedoe" in parsed["github"]
    for section in ("summary", "experience", "education", "skills"):
        assert section in parsed["sections"]


def test_parse_resume_detects_known_skills():
    parsed = parse_resume(RESUME)
    assert {"python", "fastapi", "docker", "postgresql"}.issubset(set(parsed["skills"]))


def test_parse_resume_handles_empty_input():
    parsed = parse_resume("")
    assert parsed["sections"] == []
    assert parsed["skills"] == []
    assert parsed["wordCount"] == 0
