from __future__ import annotations

from urllib.parse import urlparse

import httpx

from .base import BaseSourceScraper, ScrapeRunResult
from ..normalizers import RawJobPosting

TYPE_LABELS = {
    "full": "Full-time",
    "part": "Part-time",
    "contract": "Contract",
    "internship": "Internship",
    "temporary": "Temporary",
}


class WorkableScraper(BaseSourceScraper):
    source_name = "Workable"
    allowed_domains = ("workable.com",)

    def discover_job_urls(self, response, seed_url: str) -> list[str]:
        _ = (response, seed_url)
        return []

    def parse_job_page(self, response, job_url: str, seed_url: str):
        _ = (response, job_url, seed_url)
        return None

    def scrape(self) -> ScrapeRunResult:
        result = ScrapeRunResult()

        with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
            for seed_url in self.seed_urls:
                account_subdomain = self.extract_account_subdomain(seed_url)
                if not account_subdomain:
                    self.logger.warning("Could not infer Workable account from %s", seed_url)
                    continue

                company_profile = self.fetch_account_profile(client, account_subdomain)
                if company_profile is None:
                    continue

                self.logger.info("Fetching Workable API jobs for %s", account_subdomain)
                listing_response = client.post(
                    f"https://apply.workable.com/api/v3/accounts/{account_subdomain}/jobs",
                    json={},
                )
                if listing_response.status_code >= 400:
                    self.logger.warning(
                        "Workable jobs API for %s returned HTTP %s",
                        account_subdomain,
                        listing_response.status_code,
                    )
                    continue

                listing_payload = listing_response.json()
                for listing in listing_payload.get("results", []):
                    shortcode = str(listing.get("shortcode") or "").strip()
                    if not shortcode:
                        continue

                    original_url = f"https://apply.workable.com/{account_subdomain}/j/{shortcode}/"
                    detail_response = client.get(
                        f"https://apply.workable.com/api/v2/accounts/{account_subdomain}/jobs/{shortcode}",
                        params={"lng": listing.get("language") or "en"},
                    )

                    if detail_response.status_code in {404, 410}:
                        self.logger.info("Marking %s as expired.", original_url)
                        result.expired_urls.append(original_url)
                        continue

                    if detail_response.status_code >= 400:
                        self.logger.warning(
                            "Workable job detail %s returned HTTP %s",
                            original_url,
                            detail_response.status_code,
                        )
                        continue

                    job = self.parse_job_payload(
                        account_subdomain=account_subdomain,
                        seed_url=seed_url,
                        company_profile=company_profile,
                        listing=listing,
                        detail=detail_response.json(),
                    )
                    if job is not None:
                        result.jobs.append(job)

        return result

    def extract_account_subdomain(self, seed_url: str) -> str | None:
        path_parts = [part for part in urlparse(seed_url).path.split("/") if part]
        if not path_parts:
            return None
        return path_parts[0]

    def fetch_account_profile(self, client: httpx.Client, account_subdomain: str) -> dict | None:
        response = client.get(
            f"https://apply.workable.com/api/v1/accounts/{account_subdomain}",
            params={"full": "true"},
        )
        if response.status_code >= 400:
            self.logger.warning(
                "Workable account profile for %s returned HTTP %s",
                account_subdomain,
                response.status_code,
            )
            return None
        return response.json()

    def parse_job_payload(
        self,
        *,
        account_subdomain: str,
        seed_url: str,
        company_profile: dict,
        listing: dict,
        detail: dict,
    ) -> RawJobPosting | None:
        title = self.clean_text(detail.get("title"))
        shortcode = self.clean_text(detail.get("shortcode"))
        if not title or not shortcode:
            return None

        location = detail.get("location") or listing.get("location") or {}
        location_display = self.clean_text(location.get("display")) if isinstance(location, dict) else None
        if not location_display and isinstance(location, dict):
            location_display = self.clean_text(
                ", ".join(
                    part
                    for part in [
                        location.get("city"),
                        location.get("region"),
                        location.get("country"),
                    ]
                    if part
                )
            )

        logo_url = company_profile.get("logo")
        company_name = self.clean_text(company_profile.get("name")) or self.company_hint_from_url(seed_url)
        job_type = TYPE_LABELS.get(str(detail.get("type") or "").lower(), self.clean_text(detail.get("type")))
        workplace = self.clean_text(detail.get("workplace"))

        tags = [tag for tag in detail.get("department", []) if isinstance(tag, str) and tag.strip()]
        if workplace:
            tags.append(workplace.title())
        if detail.get("remote"):
            tags.append("Remote")

        return RawJobPosting(
            source_website=self.source_name,
            original_url=f"https://apply.workable.com/{account_subdomain}/j/{shortcode}/",
            title=title,
            company_name=company_name,
            location=location_display,
            description=self.clean_text(detail.get("description")),
            salary_range=None,
            job_type=job_type,
            logo_url=self.clean_text(logo_url),
            posted_at=self.clean_text(detail.get("published")),
            tags=tags,
            source_job_id=shortcode,
        )
