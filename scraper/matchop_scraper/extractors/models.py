"""Data models for raw and normalised job postings."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(slots=True)
class RawJobPosting:
    """Minimally processed job data as scraped from source."""

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
    # Fields populated by Groq AI extraction
    required_skills: list[str] | None = None
    experience_level: str | None = None
    summary: str | None = None


@dataclass(slots=True)
class NormalizedJobPosting:
    """Fully normalised job posting ready for database insertion."""

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
        """Convert to dict suitable for Supabase upsert."""
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
