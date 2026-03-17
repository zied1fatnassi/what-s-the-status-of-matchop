from __future__ import annotations

from .base import BaseSourceScraper


class GreenhouseScraper(BaseSourceScraper):
    source_name = "Greenhouse"
    allowed_domains = ("greenhouse.io",)

    def discover_job_urls(self, response, seed_url: str) -> list[str]:
        return self.collect_job_links(
            response,
            selectors=["a.opening", ".opening a", 'a[href*="/jobs/"]'],
            url_pattern=r"/jobs/",
        )

    def parse_job_page(self, response, job_url: str, seed_url: str):
        source_job_id = self.extract_with_regex(job_url, r"/jobs/(?P<job_id>\d+)")
        fallback_company = self.meta_content(response, "og:site_name") or self.company_hint_from_url(seed_url)
        job = self.parse_json_ld_job(
            response,
            job_url,
            source_job_id=source_job_id,
            extra_tags=["Greenhouse"],
            fallback_company=fallback_company,
            fallback_location=self.first_text(response, [".location", "#header .location"]),
            fallback_description=self.first_html_text(response, ["#content", ".content"]),
            fallback_job_type=self.first_text(response, [".metadata", ".opening-category"]),
            fallback_logo_url=self.first_attr(response, ['meta[property="og:image"]'], "content"),
        )
        if job:
            return job

        return self.fallback_job(
            response,
            job_url,
            source_job_id=source_job_id,
            fallback_company=fallback_company,
            extra_tags=["Greenhouse"],
            title_selectors=["h1.app-title", "h1"],
            company_selectors=[],
            location_selectors=[".location", "#header .location"],
            description_selectors=["#content", ".content"],
            job_type_selectors=[".metadata", ".opening-category"],
            logo_selectors=['meta[property="og:image"]'],
            posted_at_selectors=["time"],
        )
