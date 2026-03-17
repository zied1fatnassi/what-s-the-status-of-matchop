from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from hashlib import sha256
import html
import re
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from dateutil import parser as date_parser

TRACKING_QUERY_KEYS = {
    "utm_campaign",
    "utm_content",
    "utm_medium",
    "utm_source",
    "utm_term",
    "ref",
    "referrer",
    "trk",
    "trackingid",
    "gh_jid",
}

TAG_PATTERNS = (
    (re.compile(r"\bpython\b", re.IGNORECASE), "Python"),
    (re.compile(r"\bjavascript\b", re.IGNORECASE), "JavaScript"),
    (re.compile(r"\btypescript\b", re.IGNORECASE), "TypeScript"),
    (re.compile(r"\breact\b", re.IGNORECASE), "React"),
    (re.compile(r"\bnode(?:\.js)?\b", re.IGNORECASE), "Node.js"),
    (re.compile(r"\bjava\b", re.IGNORECASE), "Java"),
    (re.compile(r"\bgolang\b|\bgo\b", re.IGNORECASE), "Go"),
    (re.compile(r"\brust\b", re.IGNORECASE), "Rust"),
    (re.compile(r"\bdata\b|\bdata science\b|\bdata engineering\b|\bdata engineer\b", re.IGNORECASE), "Data"),
    (re.compile(r"\bartificial intelligence\b|\bai\b", re.IGNORECASE), "AI"),
    (re.compile(r"\bmachine learning\b", re.IGNORECASE), "Machine Learning"),
    (re.compile(r"\bml\b", re.IGNORECASE), "ML"),
    (re.compile(r"\bbackend\b|\bback-end\b", re.IGNORECASE), "Backend"),
    (re.compile(r"\bfrontend\b|\bfront-end\b", re.IGNORECASE), "Frontend"),
    (re.compile(r"\bfull[ -]?stack\b", re.IGNORECASE), "Full Stack"),
    (re.compile(r"\bremote\b|\bwork from home\b", re.IGNORECASE), "Remote"),
    (re.compile(r"\bhybrid\b", re.IGNORECASE), "Hybrid"),
    (re.compile(r"\bonsite\b|\bon-site\b|\bon site\b", re.IGNORECASE), "Onsite"),
    (re.compile(r"\bintern(?:ship)?\b", re.IGNORECASE), "Internship"),
    (re.compile(r"\bsecurity\b|\bcybersecurity\b|\binfosec\b", re.IGNORECASE), "Security"),
    (
        re.compile(
            r"\bdevops\b|\bsite reliability\b|\bsre\b|\bplatform engineering\b|\binfrastructure\b",
            re.IGNORECASE,
        ),
        "DevOps",
    ),
)

SOURCE_JOB_ID_PATTERNS = {
    "linkedin": re.compile(r"/jobs/view/(?P<job_id>\d+)", re.IGNORECASE),
    "indeed": re.compile(r"[?&]jk=(?P<job_id>[\w-]+)", re.IGNORECASE),
    "greenhouse": re.compile(r"/jobs/(?P<job_id>\d+)", re.IGNORECASE),
    "lever": re.compile(r"/(?P<job_id>[0-9a-f-]{8,})/?$", re.IGNORECASE),
    "workable": re.compile(r"/j/(?P<job_id>[A-Za-z0-9]+)", re.IGNORECASE),
}

RELATIVE_POSTED_AT_PATTERN = re.compile(
    r"(?P<count>\d+)\s+(?P<unit>minute|hour|day|week|month|year)s?\s+ago",
    re.IGNORECASE,
)
HTML_TAG_PATTERN = re.compile(r"<[^>]+>")
WHITESPACE_PATTERN = re.compile(r"\s+")


def utcnow() -> datetime:
    return datetime.now(tz=UTC)


def to_iso8601(value: datetime) -> str:
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def normalize_whitespace(value: str | None) -> str | None:
    if value is None:
        return None
    collapsed = WHITESPACE_PATTERN.sub(" ", value).strip()
    return collapsed or None


def strip_html(value: str | None) -> str | None:
    if not value:
        return None
    text = html.unescape(value)
    text = text.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")
    text = text.replace("</p>", "\n").replace("</li>", "\n")
    text = HTML_TAG_PATTERN.sub(" ", text)
    return normalize_whitespace(text)


def canonicalize_url(url: str) -> str:
    parts = urlsplit(url.strip())
    scheme = (parts.scheme or "https").lower()
    netloc = parts.netloc.lower()

    filtered_query = []
    for key, value in parse_qsl(parts.query, keep_blank_values=True):
        if key.lower() in TRACKING_QUERY_KEYS:
            continue
        filtered_query.append((key, value))

    query = urlencode(filtered_query, doseq=True)
    path = parts.path.rstrip("/") or "/"
    return urlunsplit((scheme, netloc, path, query, ""))


def infer_source_job_id(source_website: str, url: str) -> str | None:
    source_key = source_website.strip().lower()
    pattern = SOURCE_JOB_ID_PATTERNS.get(source_key)
    if not pattern:
        return None
    match = pattern.search(url)
    if not match:
        return None
    return match.group("job_id")


def parse_posted_at(raw: str | datetime | None, reference_time: datetime) -> str | None:
    if raw is None:
        return None

    if isinstance(raw, datetime):
        return to_iso8601(raw)

    cleaned = normalize_whitespace(raw)
    if not cleaned:
        return None

    lowered = cleaned.lower()
    if lowered == "today":
        return to_iso8601(reference_time)
    if lowered == "yesterday":
        return to_iso8601(reference_time - timedelta(days=1))

    relative_match = RELATIVE_POSTED_AT_PATTERN.search(lowered)
    if relative_match:
        count = int(relative_match.group("count"))
        unit = relative_match.group("unit").lower()
        if unit == "minute":
            delta = timedelta(minutes=count)
        elif unit == "hour":
            delta = timedelta(hours=count)
        elif unit == "day":
            delta = timedelta(days=count)
        elif unit == "week":
            delta = timedelta(weeks=count)
        elif unit == "month":
            delta = timedelta(days=count * 30)
        else:
            delta = timedelta(days=count * 365)
        return to_iso8601(reference_time - delta)

    parsed = date_parser.parse(cleaned)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return to_iso8601(parsed)


def normalize_tags(
    tags: list[str],
    title: str,
    description: str | None,
    job_type: str | None,
    location: str | None,
) -> list[str]:
    deduped: list[str] = []
    seen: set[str] = set()

    for tag in tags:
        normalized = normalize_whitespace(tag)
        if not normalized:
            continue
        marker = normalized.casefold()
        if marker in seen:
            continue
        seen.add(marker)
        deduped.append(normalized)

    haystack = " ".join(filter(None, [title, description or "", job_type or "", location or ""]))
    for pattern, label in TAG_PATTERNS:
        if pattern.search(haystack) and label.casefold() not in seen:
            seen.add(label.casefold())
            deduped.append(label)

    return deduped[:15]


def build_content_hash(
    *,
    source_website: str,
    title: str,
    company_name: str | None,
    location: str | None,
    description: str | None,
) -> str:
    payload = "||".join(
        [
            source_website.strip().lower(),
            title.strip().lower(),
            (company_name or "").strip().lower(),
            (location or "").strip().lower(),
            (description or "")[:4000].strip().lower(),
        ]
    )
    return sha256(payload.encode("utf-8")).hexdigest()


@dataclass(slots=True)
class RawJobPosting:
    source_website: str
    original_url: str
    title: str
    company_name: str | None = None
    location: str | None = None
    description: str | None = None
    salary_range: str | None = None
    job_type: str | None = None
    logo_url: str | None = None
    posted_at: str | datetime | None = None
    tags: list[str] = field(default_factory=list)
    source_job_id: str | None = None


@dataclass(slots=True)
class NormalizedJobPosting:
    source_website: str
    original_url: str
    title: str
    company_name: str | None
    location: str | None
    description: str | None
    salary_range: str | None
    job_type: str | None
    logo_url: str | None
    posted_at: str | None
    tags: list[str]
    source_job_id: str | None
    content_hash: str
    first_seen_at: str
    last_seen_at: str
    scraped_at: str

    def to_database_payload(self) -> dict[str, Any]:
        return {
            "source_website": self.source_website,
            "original_url": self.original_url,
            "title": self.title,
            "company_name": self.company_name,
            "location": self.location,
            "description": self.description,
            "salary_range": self.salary_range,
            "job_type": self.job_type,
            "logo_url": self.logo_url,
            "posted_at": self.posted_at,
            "tags": self.tags,
            "source_job_id": self.source_job_id,
            "content_hash": self.content_hash,
            "first_seen_at": self.first_seen_at,
            "last_seen_at": self.last_seen_at,
            "scraped_at": self.scraped_at,
        }


def normalize_job(raw_job: RawJobPosting, seen_at: datetime | None = None) -> NormalizedJobPosting:
    reference_time = seen_at or utcnow()
    source_website = normalize_whitespace(raw_job.source_website)
    title = normalize_whitespace(raw_job.title)
    original_url = canonicalize_url(raw_job.original_url)

    if not source_website:
        raise ValueError("source_website is required")
    if not title:
        raise ValueError("title is required")

    company_name = normalize_whitespace(raw_job.company_name)
    location = normalize_whitespace(raw_job.location)
    description = strip_html(raw_job.description)
    salary_range = normalize_whitespace(raw_job.salary_range)
    job_type = normalize_whitespace(raw_job.job_type)
    logo_url = normalize_whitespace(raw_job.logo_url)
    posted_at = parse_posted_at(raw_job.posted_at, reference_time)
    source_job_id = normalize_whitespace(raw_job.source_job_id) or infer_source_job_id(source_website, original_url)
    tags = normalize_tags(raw_job.tags, title, description, job_type, location)
    timestamp = to_iso8601(reference_time)

    return NormalizedJobPosting(
        source_website=source_website,
        original_url=original_url,
        title=title,
        company_name=company_name,
        location=location,
        description=description,
        salary_range=salary_range,
        job_type=job_type,
        logo_url=logo_url,
        posted_at=posted_at,
        tags=tags,
        source_job_id=source_job_id,
        content_hash=build_content_hash(
            source_website=source_website,
            title=title,
            company_name=company_name,
            location=location,
            description=description,
        ),
        first_seen_at=timestamp,
        last_seen_at=timestamp,
        scraped_at=timestamp,
    )
