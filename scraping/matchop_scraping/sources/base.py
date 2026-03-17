from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
import json
import logging
import re
from typing import Any, Iterable
from urllib.parse import parse_qs, urlparse

from ..normalizers import RawJobPosting
from ..normalizers.job_normalizer import canonicalize_url


@dataclass(slots=True)
class ScrapeRunResult:
    jobs: list[RawJobPosting] = field(default_factory=list)
    expired_urls: list[str] = field(default_factory=list)


class BaseSourceScraper(ABC):
    source_name = "Unknown"
    allowed_domains: tuple[str, ...] = ()

    def __init__(
        self,
        *,
        seed_urls: list[str],
        timeout: float = 30.0,
        retries: int = 2,
        impersonate: str = "chrome",
        stealth: bool = True,
    ) -> None:
        self.seed_urls = seed_urls
        self.timeout = timeout
        self.retries = retries
        self.impersonate = impersonate
        self.stealth = stealth
        self.logger = logging.getLogger(f"matchop_scraping.sources.{self.source_name.lower()}")

    @abstractmethod
    def discover_job_urls(self, response: Any, seed_url: str) -> list[str]:
        raise NotImplementedError

    @abstractmethod
    def parse_job_page(self, response: Any, job_url: str, seed_url: str) -> RawJobPosting | None:
        raise NotImplementedError

    def scrape(self) -> ScrapeRunResult:
        result = ScrapeRunResult()
        seen_urls: set[str] = set()

        for seed_url in self.seed_urls:
            self.logger.info("Fetching seed page %s", seed_url)
            try:
                seed_response = self.fetch(seed_url)
            except Exception as exc:
                self.logger.warning("Failed to fetch seed page %s: %s", seed_url, exc)
                continue

            if seed_response.status >= 400:
                self.logger.warning("Seed page %s returned HTTP %s", seed_url, seed_response.status)
                continue

            for job_url in self.discover_job_urls(seed_response, seed_url):
                if job_url in seen_urls:
                    continue
                seen_urls.add(job_url)

                try:
                    detail_response = self.fetch(job_url, referer=seed_url)
                except Exception as exc:
                    self.logger.warning("Failed to fetch job page %s: %s", job_url, exc)
                    continue

                if detail_response.status in {404, 410} or self.redirected_to_board_index(
                    detail_response,
                    requested_url=job_url,
                    seed_url=seed_url,
                ):
                    self.logger.info("Marking %s as expired.", job_url)
                    result.expired_urls.append(canonicalize_url(job_url))
                    continue

                if detail_response.status >= 400:
                    self.logger.warning("Job page %s returned HTTP %s", job_url, detail_response.status)
                    continue

                try:
                    job = self.parse_job_page(detail_response, job_url, seed_url)
                except Exception as exc:
                    self.logger.warning("Failed to parse job page %s: %s", job_url, exc)
                    continue

                if job is not None:
                    result.jobs.append(job)

        return result

    def fetch(self, url: str, *, referer: str | None = None) -> Any:
        try:
            from scrapling import Fetcher
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "Scrapling runtime is incomplete. Install worker dependencies, including curl-cffi."
            ) from exc

        headers = {"referer": referer} if referer else None
        response = Fetcher.get(
            url,
            timeout=self.timeout,
            retries=self.retries,
            follow_redirects=True,
            impersonate=self.impersonate,
            stealthy_headers=self.stealth,
            headers=headers,
        )
        return response

    def redirected_to_board_index(self, response: Any, *, requested_url: str, seed_url: str) -> bool:
        final_url = getattr(response, "url", None)
        if not final_url:
            return False
        requested = canonicalize_url(requested_url)
        board_index = canonicalize_url(seed_url)
        final = canonicalize_url(str(final_url))
        return requested != board_index and final == board_index

    def collect_job_links(
        self,
        response: Any,
        selectors: Iterable[str],
        *,
        url_pattern: str | None = None,
    ) -> list[str]:
        pattern = re.compile(url_pattern, re.IGNORECASE) if url_pattern else None
        collected: list[str] = []
        seen: set[str] = set()

        for selector in selectors:
            for node in response.css(selector):
                href = node.attrib.get("href")
                if not href:
                    continue
                absolute_url = response.urljoin(str(href))
                if pattern and not pattern.search(absolute_url):
                    continue
                if not self.is_allowed_url(absolute_url):
                    continue
                if absolute_url in seen:
                    continue
                seen.add(absolute_url)
                collected.append(absolute_url)

        return collected

    def is_allowed_url(self, url: str) -> bool:
        if not self.allowed_domains:
            return True
        hostname = urlparse(url).hostname or ""
        return any(hostname.endswith(domain) for domain in self.allowed_domains)

    def first_text(self, response: Any, selectors: Iterable[str]) -> str | None:
        for selector in selectors:
            nodes = response.css(selector)
            node = nodes.first if hasattr(nodes, "first") else (nodes[0] if nodes else None)
            if not node:
                continue
            text = node.get_all_text(separator=" ", strip=True)
            cleaned = self.clean_text(str(text))
            if cleaned:
                return cleaned
        return None

    def first_attr(self, response: Any, selectors: Iterable[str], attribute: str) -> str | None:
        for selector in selectors:
            nodes = response.css(selector)
            node = nodes.first if hasattr(nodes, "first") else (nodes[0] if nodes else None)
            if not node:
                continue
            value = node.attrib.get(attribute)
            cleaned = self.clean_text(str(value)) if value else None
            if cleaned:
                return cleaned
        return None

    def first_html_text(self, response: Any, selectors: Iterable[str]) -> str | None:
        for selector in selectors:
            nodes = response.css(selector)
            node = nodes.first if hasattr(nodes, "first") else (nodes[0] if nodes else None)
            if not node:
                continue
            cleaned = self.clean_text(str(node.get_all_text(separator="\n", strip=True)))
            if cleaned:
                return cleaned
        return None

    def meta_content(self, response: Any, key: str, attribute: str = "property") -> str | None:
        selector = f'meta[{attribute}="{key}"]'
        nodes = response.css(selector)
        node = nodes.first if hasattr(nodes, "first") else (nodes[0] if nodes else None)
        if not node:
            return None
        content = node.attrib.get("content")
        return self.clean_text(str(content)) if content else None

    def clean_text(self, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = re.sub(r"\s+", " ", value).strip()
        return cleaned or None

    def extract_with_regex(self, value: str, pattern: str) -> str | None:
        match = re.search(pattern, value, re.IGNORECASE)
        if not match:
            return None
        if "job_id" in match.groupdict():
            return match.group("job_id")
        return match.group(1)

    def query_param(self, url: str, key: str) -> str | None:
        parsed = urlparse(url)
        values = parse_qs(parsed.query).get(key)
        if not values:
            return None
        return self.clean_text(values[0])

    def extract_json_ld_job_postings(self, response: Any) -> list[dict[str, Any]]:
        job_postings: list[dict[str, Any]] = []
        for script in response.css('script[type="application/ld+json"]'):
            raw = self.clean_text(str(script.text))
            if not raw:
                continue
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                continue
            for candidate in self.flatten_json_ld(payload):
                job_type = candidate.get("@type")
                if job_type == "JobPosting" or (isinstance(job_type, list) and "JobPosting" in job_type):
                    job_postings.append(candidate)
        return job_postings

    def flatten_json_ld(self, payload: Any) -> list[dict[str, Any]]:
        if isinstance(payload, list):
            flattened: list[dict[str, Any]] = []
            for item in payload:
                flattened.extend(self.flatten_json_ld(item))
            return flattened

        if not isinstance(payload, dict):
            return []

        flattened = [payload]
        graph = payload.get("@graph")
        if isinstance(graph, list):
            for item in graph:
                flattened.extend(self.flatten_json_ld(item))
        return flattened

    def parse_json_ld_job(
        self,
        response: Any,
        job_url: str,
        *,
        source_job_id: str | None = None,
        extra_tags: Iterable[str] = (),
        fallback_company: str | None = None,
        fallback_location: str | None = None,
        fallback_description: str | None = None,
        fallback_job_type: str | None = None,
        fallback_logo_url: str | None = None,
    ) -> RawJobPosting | None:
        job_postings = self.extract_json_ld_job_postings(response)
        if not job_postings:
            return None

        posting = job_postings[0]
        organization = posting.get("hiringOrganization") or {}
        title = self.clean_text(posting.get("title"))
        if not title:
            return None

        source_url = self.clean_text(posting.get("url")) or job_url
        company_name = self.clean_text(organization.get("name")) or fallback_company
        location = self.stringify_location(posting.get("jobLocation")) or fallback_location
        description = self.clean_text(posting.get("description")) or fallback_description
        salary_range = self.stringify_salary(posting.get("baseSalary"))
        job_type = self.clean_text(
            posting.get("employmentType")[0]
            if isinstance(posting.get("employmentType"), list) and posting.get("employmentType")
            else posting.get("employmentType")
        ) or fallback_job_type
        raw_logo = organization.get("logo")
        if isinstance(raw_logo, dict):
            raw_logo = raw_logo.get("url") or raw_logo.get("contentUrl")
        logo_url = self.clean_text(raw_logo) or fallback_logo_url
        posted_at = self.clean_text(posting.get("datePosted"))
        tags = [tag for tag in extra_tags if tag]

        identifier = posting.get("identifier")
        if isinstance(identifier, dict):
            source_job_id = source_job_id or self.clean_text(identifier.get("value"))

        return RawJobPosting(
            source_website=self.source_name,
            original_url=source_url,
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
        )

    def fallback_job(
        self,
        response: Any,
        job_url: str,
        *,
        title_selectors: Iterable[str],
        company_selectors: Iterable[str] = (),
        location_selectors: Iterable[str] = (),
        description_selectors: Iterable[str] = (),
        salary_selectors: Iterable[str] = (),
        job_type_selectors: Iterable[str] = (),
        logo_selectors: Iterable[str] = (),
        posted_at_selectors: Iterable[str] = (),
        source_job_id: str | None = None,
        fallback_company: str | None = None,
        extra_tags: Iterable[str] = (),
    ) -> RawJobPosting | None:
        title = self.first_text(response, title_selectors)
        if not title:
            return None

        company_name = self.first_text(response, company_selectors) or fallback_company
        location = self.first_text(response, location_selectors)
        description = self.first_html_text(response, description_selectors)
        salary_range = self.first_text(response, salary_selectors)
        job_type = self.first_text(response, job_type_selectors)
        logo_url = self.first_attr(response, logo_selectors, "src") or self.first_attr(
            response,
            logo_selectors,
            "content",
        )
        posted_at = self.first_attr(response, posted_at_selectors, "datetime") or self.first_text(
            response,
            posted_at_selectors,
        )

        return RawJobPosting(
            source_website=self.source_name,
            original_url=job_url,
            title=title,
            company_name=company_name,
            location=location,
            description=description,
            salary_range=salary_range,
            job_type=job_type,
            logo_url=logo_url,
            posted_at=posted_at,
            tags=[tag for tag in extra_tags if tag],
            source_job_id=source_job_id,
        )

    def stringify_location(self, raw_location: Any) -> str | None:
        if isinstance(raw_location, list):
            parts = [self.stringify_location(item) for item in raw_location]
            collapsed = [part for part in parts if part]
            return ", ".join(collapsed) if collapsed else None
        if isinstance(raw_location, dict):
            address = raw_location.get("address")
            if isinstance(address, dict):
                parts = [
                    self.clean_text(address.get("addressLocality")),
                    self.clean_text(address.get("addressRegion")),
                    self.clean_text(address.get("addressCountry")),
                ]
                collapsed = [part for part in parts if part]
                return ", ".join(collapsed) if collapsed else None
            return self.clean_text(raw_location.get("name"))
        return self.clean_text(str(raw_location)) if raw_location else None

    def stringify_salary(self, base_salary: Any) -> str | None:
        if not isinstance(base_salary, dict):
            return None

        value = base_salary.get("value")
        currency = self.clean_text(base_salary.get("currency")) or "USD"
        if isinstance(value, dict):
            minimum = value.get("minValue")
            maximum = value.get("maxValue")
            unit = self.clean_text(value.get("unitText"))
            if minimum and maximum:
                return f"{currency} {minimum}-{maximum}{f' / {unit}' if unit else ''}"
            if minimum:
                return f"{currency} {minimum}{f' / {unit}' if unit else ''}"
        return None

    def company_hint_from_url(self, url: str) -> str | None:
        path_parts = [part for part in urlparse(url).path.split("/") if part]
        if not path_parts:
            return None
        return path_parts[0].replace("-", " ").replace("_", " ").title()
