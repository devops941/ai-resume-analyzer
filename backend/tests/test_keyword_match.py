from app.services.keyword_match import extract_keywords, find_keyword_gaps

JD = (
    "We are hiring a Senior Backend Engineer. Required: Python, FastAPI, Kubernetes, "
    "Terraform, GraphQL and PostgreSQL. Experience with AWS microservices, CI/CD and "
    "observability tools like Datadog is a plus."
)

RESUME = (
    "Backend engineer. Skills: Python, FastAPI, PostgreSQL, AWS, CI/CD, "
    "Docker, Kubernetes, microservices."
)


def test_extracts_known_skills_from_job_description():
    keywords = {item["keyword"] for item in extract_keywords(JD)}
    assert {"python", "fastapi", "terraform", "graphql", "postgresql", "aws"} <= keywords


def test_does_not_emit_filler_phrases_or_fragments():
    keywords = {item["keyword"] for item in extract_keywords(JD)}
    for noise in ("required", "hiring", "like", "tools", "ci cd", "cd datadog"):
        assert noise not in keywords


def test_keyword_gaps_marks_missing_terms():
    result = find_keyword_gaps(RESUME, JD)
    missing = {item["keyword"] for item in result["missing"]}
    matched = {item["keyword"] for item in result["matched"]}

    assert "terraform" in missing
    assert "graphql" in missing
    assert "python" in matched
    assert 0 <= result["coverage"] <= 100


def test_no_job_description_yields_no_keywords():
    assert extract_keywords("") == []
    gaps = find_keyword_gaps(RESUME, "")
    assert gaps["missing"] == []
    assert gaps["coverage"] == 0
