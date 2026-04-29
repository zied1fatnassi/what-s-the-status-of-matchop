"""Groq AI-powered extraction of structured job data from raw descriptions.

Flow:
  1. Receive raw HTML / text job description
  2. Send to Groq model via structured JSON schema
  3. Return enriched fields: required_skills, experience_level, summary, etc.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from .models import RawJobPosting

logger = logging.getLogger("matchop_scraper.extractors.groq")

# ---------------------------------------------------------------------------
# Groq structured output schema
# ---------------------------------------------------------------------------

_JOB_EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "job_title": {"type": "string", "description": "Cleaned, standardised job title"},
        "company_name": {"type": "string", "description": "Company name"},
        "location": {"type": "string", "description": "Normalised location (city, country or Remote)"},
        "required_skills": {
            "type": "array",
            "items": {"type": "string"},
            "description": "List of required technical and soft skills",
        },
        "experience_level": {
            "type": "string",
            "enum": ["Intern", "Entry", "Junior", "Mid", "Senior", "Lead", "Principal", "Director", "VP", "C-Level", "Unknown"],
            "description": "Seniority level of the position",
        },
        "job_type": {
            "type": "string",
            "enum": ["Full-time", "Part-time", "Contract", "Freelance", "Internship", "Temporary", "Unknown"],
            "description": "Employment type",
        },
        "salary_range": {"type": "string", "description": "Salary range if mentioned, e.g. 'USD 80000-120000 / year'"},
        "summary": {"type": "string", "description": "A 2-3 sentence summary of the role"},
    },
    "required": [
        "job_title",
        "company_name",
        "location",
        "required_skills",
        "experience_level",
        "job_type",
        "salary_range",
        "summary",
    ],
    "additionalProperties": False,
}


def _build_extraction_prompt(job: RawJobPosting) -> str:
    """Build the user prompt for Groq extraction."""
    parts = [
        f"Job Title: {job.title}",
        f"Company: {job.company_name or 'Unknown'}",
        f"Location: {job.location or 'Not specified'}",
        f"Source: {job.source_website}",
    ]
    if job.salary_range:
        parts.append(f"Salary info: {job.salary_range}")
    if job.job_type:
        parts.append(f"Job type: {job.job_type}")
    if job.description:
        # Truncate description to avoid exceeding token limits
        desc = job.description[:6000]
        parts.append(f"\nJob Description:\n{desc}")

    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Main extraction function
# ---------------------------------------------------------------------------

def extract_with_groq(
    job: RawJobPosting,
    *,
    api_key: str,
    model: str = "llama-3.3-70b-versatile",
) -> RawJobPosting:
    """Enrich a RawJobPosting using Groq AI extraction.

    Sends the job description to Groq and parses the structured response
    to populate fields like required_skills, experience_level, and summary.

    If Groq is unavailable or the call fails, the original job is returned
    unchanged — extraction is best-effort and should not block ingestion.
    """
    if not api_key:
        logger.debug("No GROQ_API_KEY set — skipping AI extraction for %s", job.original_url)
        return job

    if not job.description:
        logger.debug("No description to extract from for %s", job.original_url)
        return job

    try:
        from groq import Groq
    except ImportError:
        logger.warning("groq package not installed — skipping AI extraction")
        return job

    try:
        client = Groq(api_key=api_key)

        completion = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a job posting analyst. Extract structured information "
                        "from the provided job posting. Return accurate, concise data. "
                        "If a field is not available, use 'Unknown' for strings or an "
                        "empty array for lists."
                    ),
                },
                {
                    "role": "user",
                    "content": _build_extraction_prompt(job),
                },
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "job_extraction_schema",
                    "strict": True,
                    "schema": _JOB_EXTRACTION_SCHEMA,
                },
            },
            temperature=0.1,
            max_tokens=1024,
        )

        raw_content = completion.choices[0].message.content
        if not raw_content:
            logger.warning("Groq returned empty content for %s", job.original_url)
            return job

        extracted = json.loads(raw_content)
        return _merge_extraction(job, extracted)

    except Exception as exc:
        logger.warning("Groq extraction failed for %s: %s", job.original_url, exc)
        return job


def _merge_extraction(job: RawJobPosting, extracted: dict[str, Any]) -> RawJobPosting:
    """Merge Groq extraction results back into the RawJobPosting.

    Groq results only override fields that are currently empty/None.
    The scraper's direct extraction always takes priority.
    """
    # Enrich title only if Groq found a better one and original is very short
    groq_title = extracted.get("job_title", "").strip()
    if groq_title and groq_title.lower() != "unknown" and len(job.title) < 10:
        job.title = groq_title

    # Fill missing fields
    if not job.company_name:
        company = extracted.get("company_name", "").strip()
        if company and company.lower() != "unknown":
            job.company_name = company

    if not job.location:
        location = extracted.get("location", "").strip()
        if location and location.lower() != "unknown":
            job.location = location

    if not job.job_type:
        job_type = extracted.get("job_type", "").strip()
        if job_type and job_type.lower() != "unknown":
            job.job_type = job_type

    if not job.salary_range:
        salary = extracted.get("salary_range", "").strip()
        if salary and salary.lower() != "unknown":
            job.salary_range = salary

    # Always set AI-specific fields
    skills = extracted.get("required_skills", [])
    if skills:
        job.required_skills = [s for s in skills if s and s.lower() != "unknown"]

    exp_level = extracted.get("experience_level", "").strip()
    if exp_level and exp_level.lower() != "unknown":
        job.experience_level = exp_level

    summary = extracted.get("summary", "").strip()
    if summary and summary.lower() != "unknown":
        job.summary = summary

    # Merge skills into tags
    if job.required_skills:
        existing_tags_lower = {t.casefold() for t in job.tags}
        for skill in job.required_skills[:5]:
            if skill.casefold() not in existing_tags_lower:
                job.tags.append(skill)
                existing_tags_lower.add(skill.casefold())

    return job
