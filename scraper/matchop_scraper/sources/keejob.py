"""Keejob Tunisian Job Board Scraper."""
from __future__ import annotations

import re
from .base import BaseSourceScraper


class KeejobScraper(BaseSourceScraper):
    source_name = "Keejob"
    allowed_domains = ("keejob.com",)

    def discover_job_urls(self, response, seed_url: str) -> list[str]:
        return self.collect_job_links(
            response,
            selectors=['a[href*="/offres-emploi/"]'],
            url_pattern=r"/offres-emploi/\d+/[a-z0-9-]+",
        )

    def parse_job_page(self, response, job_url: str, seed_url: str):
        source_job_id = self.extract_with_regex(job_url, r"/offres-emploi/(?P<job_id>\d+)/")
        fallback_company = self.meta_content(response, "og:site_name") or "Entreprise en Tunisie"

        job = self.parse_json_ld_job(
            response,
            job_url,
            source_job_id=source_job_id,
            extra_tags=["Keejob", "Tunisie"],
            fallback_company=fallback_company,
            fallback_location=self.first_text(response, [".location", ".info-location", "span[itemprop='addressLocality']"]),
            fallback_description=self.first_html_text(response, [".job-description", ".content", "#description"]),
            fallback_job_type=self.first_text(response, [".contract-type", ".type-contrat"]),
            fallback_logo_url=self.first_attr(response, ['meta[property="og:image"]'], "content"),
        )
        if job:
            return job

        return self.fallback_job(
            response,
            job_url,
            source_job_id=source_job_id,
            fallback_company=fallback_company,
            extra_tags=["Keejob", "Tunisie"],
            title_selectors=["h1", ".job-title", "h1.title"],
            company_selectors=[".company-name", ".recruiter-name", "strong.company"],
            location_selectors=[".location", ".info-location", ".city"],
            description_selectors=[".job-description", ".content", "#content"],
            job_type_selectors=[".contract-type", ".type-contrat"],
            logo_selectors=['meta[property="og:image"]'],
            posted_at_selectors=["time", ".date-posted"],
        )
