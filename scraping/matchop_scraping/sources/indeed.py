from __future__ import annotations

from .base import BaseSourceScraper


class IndeedScraper(BaseSourceScraper):
    source_name = "Indeed"
    allowed_domains = ("indeed.com",)

    def discover_job_urls(self, response, seed_url: str) -> list[str]:
        return self.collect_job_links(
            response,
            selectors=[
                "a.jcs-JobTitle",
                'a[href*="/viewjob"]',
                'a[href*="/pagead/clk"]',
            ],
            url_pattern=r"/(viewjob|pagead/clk)",
        )

    def parse_job_page(self, response, job_url: str, seed_url: str):
        source_job_id = self.query_param(job_url, "jk") or self.extract_with_regex(job_url, r"[?&]jk=(?P<job_id>[\w-]+)")
        job = self.parse_json_ld_job(
            response,
            job_url,
            source_job_id=source_job_id,
            extra_tags=["Indeed"],
            fallback_company=self.first_text(response, ['[data-testid="inlineHeader-companyName"]', ".jobsearch-InlineCompanyRating div"]),
            fallback_location=self.first_text(response, ['[data-testid="job-location"]', '[data-testid="jobsearch-JobInfoHeader-companyLocation"]']),
            fallback_description=self.first_html_text(response, ['#jobDescriptionText', '[data-testid="jobsearch-JobComponent-description"]']),
            fallback_job_type=self.first_text(response, ['[data-testid="jobsearch-JobMetadataHeader-item"]']),
            fallback_logo_url=self.first_attr(response, ['img[data-testid="companyAvatar-image"]'], "src"),
        )
        if job:
            return job

        return self.fallback_job(
            response,
            job_url,
            source_job_id=source_job_id,
            extra_tags=["Indeed"],
            title_selectors=['h1[data-testid="jobsearch-JobInfoHeader-title"]', "h1.jobsearch-JobInfoHeader-title"],
            company_selectors=['[data-testid="inlineHeader-companyName"]', ".jobsearch-InlineCompanyRating div"],
            location_selectors=['[data-testid="job-location"]', '[data-testid="jobsearch-JobInfoHeader-companyLocation"]'],
            description_selectors=['#jobDescriptionText', '[data-testid="jobsearch-JobComponent-description"]'],
            job_type_selectors=['[data-testid="jobsearch-JobMetadataHeader-item"]'],
            logo_selectors=['img[data-testid="companyAvatar-image"]'],
            posted_at_selectors=["time", ".jobsearch-JobMetadataFooter"],
        )
