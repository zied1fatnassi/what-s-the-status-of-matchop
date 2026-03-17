from __future__ import annotations

from .base import BaseSourceScraper


class LeverScraper(BaseSourceScraper):
    source_name = "Lever"
    allowed_domains = ("lever.co",)

    def discover_job_urls(self, response, seed_url: str) -> list[str]:
        return self.collect_job_links(
            response,
            selectors=["a.posting-title", 'a[href*="jobs.lever.co"]', 'a[href*="/jobs.lever.co/"]'],
        )

    def parse_job_page(self, response, job_url: str, seed_url: str):
        source_job_id = self.extract_with_regex(job_url, r"/(?P<job_id>[0-9a-f-]{8,})/?$")
        fallback_company = self.meta_content(response, "og:site_name") or self.company_hint_from_url(seed_url)
        job = self.parse_json_ld_job(
            response,
            job_url,
            source_job_id=source_job_id,
            extra_tags=["Lever"],
            fallback_company=fallback_company,
            fallback_location=self.first_text(response, [".posting-categories .location", ".posting-categories"]),
            fallback_description=self.first_html_text(response, [".content-wrapper", ".section-wrapper.page-full-width"]),
            fallback_job_type=self.first_text(response, [".posting-categories .commitment", ".posting-categories"]),
            fallback_logo_url=self.first_attr(response, ['meta[property="og:image"]'], "content"),
        )
        if job:
            return job

        return self.fallback_job(
            response,
            job_url,
            source_job_id=source_job_id,
            fallback_company=fallback_company,
            extra_tags=["Lever"],
            title_selectors=[".posting-headline h2", "h2", "h1"],
            location_selectors=[".posting-categories .location", ".posting-categories"],
            description_selectors=[".content-wrapper", ".section-wrapper.page-full-width"],
            job_type_selectors=[".posting-categories .commitment", ".posting-categories"],
            logo_selectors=['meta[property="og:image"]'],
            posted_at_selectors=["time"],
        )
