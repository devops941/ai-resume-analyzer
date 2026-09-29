"""Keyword extraction from job descriptions and gap analysis vs a resume.

Uses TF-IDF-style weighting via scikit-learn when a job description is present,
falling back to frequency counting for very short inputs.
"""

import re

from sklearn.feature_extraction.text import TfidfVectorizer

from app.services.parsing import SKILL_VOCAB

STOPWORDS = {
    "the", "and", "for", "with", "you", "your", "our", "are", "will", "have",
    "this", "that", "from", "they", "their", "been", "were", "was", "has", "not",
    "but", "can", "all", "any", "who", "how", "what", "when", "where", "which",
    "role", "job", "work", "team", "years", "year", "experience", "ability",
    "strong", "good", "must", "should", "plus", "etc", "using", "use", "new",
    "well", "also", "more", "most", "other", "into", "within", "across", "about",
    "including", "include", "includes", "such", "as", "or", "an", "of", "to",
    "in", "on", "at", "by", "is", "be", "we", "it", "a", "we're", "looking",
    "required", "requirement", "requirements", "preferred", "responsibility",
    "responsibilities", "qualification", "qualifications", "skills", "skill",
    "knowledge", "familiar", "familiarity", "proficiency", "proficient",
    "excellent", "communication", "candidate", "candidates", "join", "company",
    "position", "opportunity", "benefits", "salary", "office", "remote", "hybrid",
    "degree", "bachelor", "master", "equivalent", "related", "field", "plus",
    "environment", "fast", "paced", "collaborate", "collaboration", "tasks",
    "project", "projects", "product", "products", "services", "systems",
    "hiring", "like", "tool", "tools", "seeking", "seek", "ideal", "needed",
    "desired", "similar", "relevant", "understanding", "deep", "solid",
    "proven", "track", "record", "various", "several", "looking", "cd", "ci",
}

IMPORTANT_MARKERS = [
    "required", "must have", "requirements", "essential", "mandatory",
    "minimum", "strong", "proficient", "expert",
]


def _normalize(token: str) -> str:
    token = token.lower().strip()
    if token.endswith("ies") and len(token) > 4:
        return token[:-3] + "y"
    if token.endswith("s") and not token.endswith("ss") and len(token) > 3:
        return token[:-1]
    return token


def extract_keywords(job_description: str, top_n: int = 25) -> list[dict]:
    """Return weighted keywords; 'importance' reflects TF-IDF weight or skill match."""
    text = job_description.strip()
    if not text:
        return []

    # Known skill vocabulary present in the JD is always important.
    lower = text.lower()
    vocab_hits = {
        skill for skill in SKILL_VOCAB if re.search(rf"(?<!\w){re.escape(skill)}(?!\w)", lower)
    }

    # Keep separators that occur inside technology names ("ci/cd", "node.js")
    # so they survive as single tokens instead of splitting into "ci"/"cd".
    phrases = re.findall(r"[A-Za-z][A-Za-z0-9+#./\-]{1,}", lower)
    tokens = [_normalize(p) for p in phrases if len(p) > 2 and p not in STOPWORDS]

    weights: dict[str, float] = {}
    if len(tokens) >= 5:
        try:
            vectorizer = TfidfVectorizer(
                stop_words="english",
                ngram_range=(1, 2),
                min_df=1,
                token_pattern=r"[A-Za-z][A-Za-z0-9+#./\-]{1,}",
            )
            matrix = vectorizer.fit_transform([text])
            scores = matrix.toarray()[0]
            vocab = vectorizer.get_feature_names_out()
            for term, score in zip(vocab, scores):
                if score > 0:
                    weights[term] = float(score)
        except ValueError:
            pass

    if not weights:
        for token in tokens:
            weights[token] = weights.get(token, 0) + 1.0

    # Boost vocabulary skills so known technologies outrank generic n-grams.
    for skill in vocab_hits:
        weights[skill] = weights.get(skill, 0) + 5.0

    # Drop n-grams that merely wrap a known skill, e.g. "python fastapi" or
    # "aws experience", because the single skill is the more useful signal.
    for term in list(weights):
        words = term.split()
        if len(words) > 1 and any(w in vocab_hits for w in words):
            del weights[term]
    requirement_boost = any(m in lower for m in IMPORTANT_MARKERS)

    ranked = sorted(weights.items(), key=lambda kv: kv[1], reverse=True)
    results = []
    seen: set[str] = set()
    for term, score in ranked:
        # Strip dangling punctuation left over from sentence boundaries
        # ("node.js." -> "node.js") before deduplicating.
        clean = term.strip().strip(".,;:!?").strip()
        if not clean or clean in seen or len(clean) < 3:
            continue
        # Drop n-grams that start or end with filler words ("required python").
        words = clean.split()
        if words[0] in STOPWORDS or words[-1] in STOPWORDS:
            continue
        seen.add(clean)
        if clean in vocab_hits:
            importance = "high"
        elif requirement_boost and score > 0.15:
            importance = "high"
        elif score > 0.1:
            importance = "medium"
        else:
            importance = "low"
        results.append({"keyword": clean, "importance": importance, "weight": round(score, 4)})
        if len(results) >= top_n:
            break
    return results


def _contains(haystack: str, needle: str) -> bool:
    return bool(re.search(rf"(?<!\w){re.escape(needle)}(?!\w)", haystack))


def find_keyword_gaps(resume_text: str, job_description: str) -> dict:
    resume_lower = resume_text.lower()
    keywords = extract_keywords(job_description)
    if not keywords:
        return {"matched": [], "missing": [], "coverage": 0, "keywords": []}

    matched, missing = [], []
    for item in keywords:
        if _contains(resume_lower, item["keyword"]):
            matched.append(item)
        else:
            missing.append(item)

    coverage = round(len(matched) / len(keywords) * 100) if keywords else 0
    return {
        "matched": matched,
        "missing": missing,
        "coverage": coverage,
        "keywords": keywords,
    }
