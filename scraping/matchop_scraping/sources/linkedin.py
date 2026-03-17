from __future__ import annotations

from .base import BaseSourceScraper


class LinkedInScraper(BaseSourceScraper):
    source_name = "LinkedIn"
    allowed_domains = ("linkedin.com",)

    def discover_job_urls(self, response, seed_url: str) -> list[str]:
        return self.collect_job_links(
            response,
            selectors=[
                "a.base-card__full-link",
                "a.job-search-card__link",
                'a[href*="/jobs/view/"]',
            ],
            url_pattern=r"/jobs/view/",
        )

    def parse_job_page(self, response, job_url: str, seed_url: str):
        source_job_id = self.extract_with_regex(job_url, r"/jobs/view/(?P<job_id>\d+)")
        job = self.parse_json_ld_job(
            response,
            job_url,
            source_job_id=source_job_id,
            extra_tags=["LinkedIn"],
            fallback_company=self.first_text(
                response,
                [".job-details-jobs-unified-top-card__company-name", ".topcard__flavor"],
            ),
            fallback_location=self.first_text(
                response,
                [".job-details-jobs-unified-top-card__bullet", ".topcard__flavor--bullet"],
            ),
            fallback_description=self.first_html_text(
                response,
                [".jobs-description-content__text", ".show-more-less-html__markup"],
            ),
            fallback_job_type=self.first_text(response, [".description__job-criteria-text"]),
            fallback_logo_url=self.first_attr(
                response,
                ["img.artdeco-entity-image", ".jobs-unified-top-card__company-logo img"],
                "src",
            ),
        )
        if job:
            return job

        return self.fallback_job(
            response,
            job_url,
            source_job_id=source_job_id,
            extra_tags=["LinkedIn"],
            title_selectors=["h1.top-card-layout__title", "h1.job-details-jobs-unified-top-card__job-title"],
            company_selectors=[".topcard__org-name-link", ".job-details-jobs-unified-top-card__company-name"],
            location_selectors=[".topcard__flavor--bullet", ".job-details-jobs-unified-top-card__bullet"],
            description_selectors=[".show-more-less-html__markup", ".jobs-description-content__text"],
            job_type_selectors=[".description__job-criteria-text"],
            logo_selectors=["img.artdeco-entity-image", ".jobs-unified-top-card__company-logo img"],
            posted_at_selectors=["time", ".posted-time-ago__text"],
        )
