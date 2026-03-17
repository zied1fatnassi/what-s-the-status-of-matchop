from __future__ import annotations

import argparse
from datetime import UTC, datetime
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
import yaml

from ..normalizers import normalize_job
from ..sources import SOURCE_REGISTRY
from ..storage import ExternalJobRepository, SupabaseRestClient

ACTIVE_SOURCE_NAMES = ("greenhouse", "lever", "workable")
SOURCE_ENV_KEYS = {
    "linkedin": "MATCHOP_LINKEDIN_URLS",
    "indeed": "MATCHOP_INDEED_URLS",
    "greenhouse": "MATCHOP_GREENHOUSE_URLS",
    "lever": "MATCHOP_LEVER_URLS",
    "workable": "MATCHOP_WORKABLE_URLS",
}


def load_worker_env() -> None:
    worker_root = Path(__file__).resolve().parents[2]
    load_dotenv(worker_root / ".env", override=False)
    load_dotenv(worker_root.parent / ".env", override=False)
    load_dotenv(worker_root.parent / ".env.local", override=False)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run MatchOp external job scrapers.")
    parser.add_argument(
        "--sources",
        nargs="+",
        choices=sorted(ACTIVE_SOURCE_NAMES),
        default=sorted(ACTIVE_SOURCE_NAMES),
        help="Sources to scrape.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Scrape and normalize without writing to Supabase.")
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Python log level.",
    )
    return parser.parse_args()


def configure_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


def split_seed_urls(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [candidate.strip() for candidate in raw.split(",") if candidate.strip()]


def parse_bool(raw: str | None, default: bool) -> bool:
    if raw is None or not raw.strip():
        return default
    return raw.strip().lower() not in {"0", "false", "no", "off"}


def parse_float_env(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    return float(raw)


def parse_int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    return int(raw)


def load_seed_config() -> dict[str, list[str]]:
    worker_root = Path(__file__).resolve().parents[2]
    raw_path = os.getenv("MATCHOP_SEED_CONFIG_PATH")
    config_path = Path(raw_path) if raw_path else worker_root / "config" / "seeds.yml"
    if not config_path.is_absolute():
        config_path = worker_root / config_path
    if not config_path.exists():
        return {}

    with config_path.open("r", encoding="utf-8") as handle:
        payload = yaml.safe_load(handle) or {}

    normalized: dict[str, list[str]] = {}
    for source_name, value in payload.items():
        if isinstance(value, list):
            normalized[source_name] = [str(item).strip() for item in value if str(item).strip()]
    return normalized


def merge_seed_urls(source_name: str, seed_config: dict[str, list[str]]) -> list[str]:
    merged: list[str] = []
    for candidate in seed_config.get(source_name, []):
        if candidate not in merged:
            merged.append(candidate)
    for candidate in split_seed_urls(os.getenv(SOURCE_ENV_KEYS[source_name])):
        if candidate not in merged:
            merged.append(candidate)
    return merged


def build_scraper(source_name: str, seed_config: dict[str, list[str]]):
    scraper_class = SOURCE_REGISTRY[source_name]
    seed_urls = merge_seed_urls(source_name, seed_config)
    if not seed_urls:
        return None

    timeout = parse_float_env("MATCHOP_SCRAPER_TIMEOUT", 30.0)
    retries = parse_int_env("MATCHOP_SCRAPER_RETRIES", 2)
    impersonate = os.getenv("MATCHOP_SCRAPER_IMPERSONATE", "chrome")
    stealth = parse_bool(os.getenv("MATCHOP_SCRAPER_STEALTH"), True)

    return scraper_class(
        seed_urls=seed_urls,
        timeout=timeout,
        retries=retries,
        impersonate=impersonate,
        stealth=stealth,
    )


def main() -> int:
    load_worker_env()
    args = parse_args()
    configure_logging(args.log_level)
    logger = logging.getLogger("matchop_scraping.scheduler")
    seed_config = load_seed_config()

    scrapers = []
    for source_name in args.sources:
        scraper = build_scraper(source_name, seed_config)
        if scraper is None:
            logger.info("Skipping %s because no seeds were configured.", source_name)
            continue
        scrapers.append((source_name, scraper))

    if not scrapers:
        logger.warning("No scrapers configured. Populate scraping/config/seeds.yml or MATCHOP_*_URLS overrides.")
        return 0

    now = datetime.now(tz=UTC)
    scrape_batches: dict[str, dict[str, object]] = {}

    for source_name, scraper in scrapers:
        scrape_result = scraper.scrape()
        normalized_jobs = []
        for raw_job in scrape_result.jobs:
            try:
                normalized_jobs.append(normalize_job(raw_job, seen_at=now))
            except Exception as exc:
                logger.warning("Normalization failed for %s job %s: %s", source_name, raw_job.original_url, exc)
        scrape_batches[source_name] = {
            "jobs": normalized_jobs,
            "expired_urls": scrape_result.expired_urls,
            "jobs_scraped": len(scrape_result.jobs),
            "jobs_normalized": len(normalized_jobs),
        }
        logger.info(
            "%s jobs_scraped=%s jobs_normalized=%s expired_candidates=%s",
            source_name,
            len(scrape_result.jobs),
            len(normalized_jobs),
            len(scrape_result.expired_urls),
        )

    if args.dry_run:
        total_scraped = sum(int(batch["jobs_scraped"]) for batch in scrape_batches.values())
        total_normalized = sum(int(batch["jobs_normalized"]) for batch in scrape_batches.values())
        total_expired = sum(len(batch["expired_urls"]) for batch in scrape_batches.values())
        logger.info(
            "Dry run complete. jobs_scraped=%s jobs_normalized=%s expired_candidates=%s",
            total_scraped,
            total_normalized,
            total_expired,
        )
        return 0

    timeout = parse_float_env("MATCHOP_SCRAPER_TIMEOUT", 30.0)
    with SupabaseRestClient.from_env(timeout=timeout) as client:
        repository = ExternalJobRepository(client)
        total_inserted = 0
        total_updated = 0
        total_duplicates = 0
        total_expired = 0
        had_errors = False

        for source_name, batch in scrape_batches.items():
            jobs = batch["jobs"]
            if not jobs:
                jobs = []
            result = repository.save_jobs(jobs)
            expired_marked = repository.mark_jobs_expired(batch["expired_urls"], seen_at=now.isoformat().replace("+00:00", "Z"))
            total_inserted += result.inserted
            total_updated += result.updated
            total_duplicates += result.duplicates_skipped
            total_expired += expired_marked
            if result.errors:
                had_errors = True
                for error in result.errors:
                    logger.error("%s", error)
            logger.info(
                "%s storage summary: jobs_inserted=%s jobs_updated=%s duplicates_skipped=%s jobs_expired=%s errors=%s",
                source_name,
                result.inserted,
                result.updated,
                result.duplicates_skipped,
                expired_marked,
                len(result.errors),
            )

    logger.info(
        "Finished scrape run. jobs_inserted=%s jobs_updated=%s duplicates_skipped=%s jobs_expired=%s",
        total_inserted,
        total_updated,
        total_duplicates,
        total_expired,
    )
    return 1 if had_errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
