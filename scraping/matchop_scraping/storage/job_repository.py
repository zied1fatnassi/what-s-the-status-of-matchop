from __future__ import annotations

from dataclasses import dataclass, field
import logging

from ..normalizers import NormalizedJobPosting
from ..normalizers.job_normalizer import canonicalize_url
from .supabase_client import SupabaseRestClient

BASE_EXTERNAL_JOB_COLUMNS = {
    "id",
    "source_website",
    "original_url",
    "title",
    "company_name",
    "location",
    "description",
    "salary_range",
    "job_type",
    "logo_url",
    "posted_at",
    "tags",
}

OPTIONAL_EXTERNAL_JOB_COLUMNS = (
    "source_job_id",
    "content_hash",
    "first_seen_at",
    "last_seen_at",
    "scraped_at",
)


@dataclass(slots=True)
class SaveResult:
    inserted: int = 0
    updated: int = 0
    duplicates_skipped: int = 0
    expired_marked: int = 0
    simulated: int = 0
    errors: list[str] = field(default_factory=list)


class ExternalJobRepository:
    def __init__(self, client: SupabaseRestClient) -> None:
        self.client = client
        self.logger = logging.getLogger("matchop_scraping.storage.job_repository")
        self.supported_columns = self._detect_supported_columns()

    def save_jobs(self, jobs: list[NormalizedJobPosting], *, dry_run: bool = False) -> SaveResult:
        result = SaveResult()

        for job in jobs:
            try:
                existing = self.find_existing_job(job)
                payload = self._filter_payload(job.to_database_payload())

                if existing and "first_seen_at" in payload and existing.get("first_seen_at"):
                    payload["first_seen_at"] = existing["first_seen_at"]

                if existing and existing.get("original_url") and existing["original_url"] != job.original_url:
                    payload["original_url"] = existing["original_url"]

                if dry_run:
                    result.simulated += 1
                    continue

                if existing:
                    changed = self._has_material_changes(existing, payload)
                    self.client.patch(
                        "external_jobs",
                        filters=self._existing_row_filter(existing),
                        payload=payload,
                    )
                    if changed:
                        result.updated += 1
                    else:
                        result.duplicates_skipped += 1
                else:
                    self.client.upsert("external_jobs", [payload], on_conflict="original_url")
                    result.inserted += 1
            except Exception as exc:
                result.errors.append(f"{job.source_website}::{job.original_url} -> {exc}")

        return result

    def find_existing_job(self, job: NormalizedJobPosting) -> dict | None:
        select_clause = ",".join(self._select_columns())

        exact_url_match = self.client.select_one(
            "external_jobs",
            filters={"original_url": f"eq.{job.original_url}"},
            select=select_clause,
        )
        if exact_url_match:
            return exact_url_match

        if self._supports_column("source_job_id") and job.source_job_id:
            source_id_match = self.client.select_one(
                "external_jobs",
                filters={
                    "source_website": f"eq.{job.source_website}",
                    "source_job_id": f"eq.{job.source_job_id}",
                },
                select=select_clause,
            )
            if source_id_match:
                return source_id_match

        if self._supports_column("content_hash") and job.content_hash:
            return self.client.select_one(
                "external_jobs",
                filters={"content_hash": f"eq.{job.content_hash}"},
                select=select_clause,
            )

        return None

    def mark_jobs_expired(self, urls: list[str], *, seen_at: str, dry_run: bool = False) -> int:
        payload = {}
        if self._supports_column("last_seen_at"):
            payload["last_seen_at"] = seen_at
        if self._supports_column("scraped_at"):
            payload["scraped_at"] = seen_at
        if not payload:
            self.logger.info(
                "Skipping expired job persistence because external_jobs does not expose last_seen_at/scraped_at yet."
            )
            return 0

        marked = 0
        for url in {canonicalize_url(value) for value in urls}:
            if dry_run:
                marked += 1
                continue
            updated = self.client.patch(
                "external_jobs",
                filters={"original_url": f"eq.{url}"},
                payload=payload,
            )
            if updated:
                marked += len(updated)
        return marked

    def _detect_supported_columns(self) -> set[str]:
        supported = set(BASE_EXTERNAL_JOB_COLUMNS)

        try:
            rows = self.client.select("external_jobs", select="*", limit=1)
        except Exception as exc:
            self.logger.warning("Could not introspect external_jobs schema: %s", exc)
            rows = []

        if rows and isinstance(rows[0], dict):
            supported.update(rows[0].keys())

        for column in OPTIONAL_EXTERNAL_JOB_COLUMNS:
            try:
                self.client.select("external_jobs", select=column, limit=1)
            except Exception:
                continue
            supported.add(column)

        return supported

    def _filter_payload(self, payload: dict) -> dict:
        return {key: value for key, value in payload.items() if key in self.supported_columns}

    def _supports_column(self, column: str) -> bool:
        return column in self.supported_columns

    def _select_columns(self) -> list[str]:
        preferred_order = [
            "id",
            "original_url",
            "first_seen_at",
            "title",
            "company_name",
            "location",
            "description",
            "salary_range",
            "job_type",
            "logo_url",
            "posted_at",
            "tags",
            "source_job_id",
            "content_hash",
        ]
        return [column for column in preferred_order if column in self.supported_columns]

    def _existing_row_filter(self, existing: dict) -> dict[str, str]:
        if existing.get("id") is not None:
            return {"id": f"eq.{existing['id']}"}
        return {"original_url": f"eq.{existing['original_url']}"}

    def _has_material_changes(self, existing: dict, payload: dict) -> bool:
        comparable_fields = (
            "title",
            "company_name",
            "location",
            "description",
            "salary_range",
            "job_type",
            "logo_url",
            "posted_at",
            "tags",
            "source_job_id",
            "content_hash",
        )
        for field in comparable_fields:
            if field not in payload:
                continue
            existing_value = existing.get(field)
            payload_value = payload.get(field)
            if isinstance(existing_value, list) or isinstance(payload_value, list):
                if list(existing_value or []) != list(payload_value or []):
                    return True
                continue
            if existing_value != payload_value:
                return True
        return False
