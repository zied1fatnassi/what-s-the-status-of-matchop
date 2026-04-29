"""MatchOp Scraper — main entry point.

Usage:
    cd scraper
    python -m matchop_scraper.main --sources greenhouse lever workable
    python -m matchop_scraper.main --dry-run --sources greenhouse
    python -m matchop_scraper.main --no-ai --sources workable
"""
from __future__ import annotations

import argparse
import logging
from datetime import UTC, datetime

from .config import ScraperConfig
from .extractors.groq_extractor import extract_with_groq
from .extractors.normalizer import normalize_job
from .pipelines.supabase_client import SupabaseRestClient
from .pipelines.supabase_pipeline import SupabasePipeline
from .sources import SOURCE_REGISTRY

ACTIVE_SOURCE_NAMES = tuple(sorted(SOURCE_REGISTRY.keys()))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run MatchOp external job scrapers with Groq AI extraction.")
    parser.add_argument(
        "--sources",
        nargs="+",
        choices=sorted(ACTIVE_SOURCE_NAMES),
        default=sorted(ACTIVE_SOURCE_NAMES),
        help="Sources to scrape.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Scrape and normalise without writing to Supabase.")
    parser.add_argument("--no-ai", action="store_true", help="Skip Groq AI extraction step.")
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


def build_scraper(source_name: str, config: ScraperConfig):
    """Construct a scraper instance for the given source."""
    scraper_class = SOURCE_REGISTRY.get(source_name)
    if not scraper_class:
        return None

    seed_urls = config.seeds.get(source_name, [])
    if not seed_urls:
        return None

    return scraper_class(
        seed_urls=seed_urls,
        timeout=config.timeout,
        retries=config.retries,
        delay=config.delay,
        impersonate=config.impersonate,
        stealth=config.stealth,
    )


def main() -> int:
    """Main scraper orchestration loop."""
    args = parse_args()
    configure_logging(args.log_level)
    logger = logging.getLogger("matchop_scraper.main")

    config = ScraperConfig.from_env()

    # Validate required env vars (unless dry run)
    if not args.dry_run:
        if not config.supabase_url or not config.supabase_service_role_key:
            logger.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for storage writes.")
            return 1

    # Build scrapers
    scrapers = []
    for source_name in args.sources:
        scraper = build_scraper(source_name, config)
        if scraper is None:
            logger.info("Skipping %s — no seed URLs configured.", source_name)
            continue
        scrapers.append((source_name, scraper))

    if not scrapers:
        logger.warning("No scrapers configured. Populate scraper/config/seeds.yml or MATCHOP_*_URLS overrides.")
        return 0

    now = datetime.now(tz=UTC)
    scrape_batches: dict[str, dict[str, object]] = {}

    # Phase 1: Scrape all sources
    for source_name, scraper in scrapers:
        logger.info("═══ Scraping %s ═══", source_name)
        scrape_result = scraper.scrape()

        # Phase 2: Groq AI extraction (optional)
        if not args.no_ai and config.groq_api_key:
            logger.info("Running Groq AI extraction on %d jobs from %s", len(scrape_result.jobs), source_name)
            for i, raw_job in enumerate(scrape_result.jobs):
                scrape_result.jobs[i] = extract_with_groq(
                    raw_job,
                    api_key=config.groq_api_key,
                    model=config.groq_model,
                )
        elif args.no_ai:
            logger.info("Groq AI extraction skipped (--no-ai flag).")
        else:
            logger.info("Groq AI extraction skipped (no GROQ_API_KEY set).")

        # Phase 3: Normalise
        normalised_jobs = []
        for raw_job in scrape_result.jobs:
            try:
                normalised_jobs.append(normalize_job(raw_job, seen_at=now))
            except Exception as exc:
                logger.warning("Normalisation failed for %s job %s: %s", source_name, raw_job.original_url, exc)

        scrape_batches[source_name] = {
            "jobs": normalised_jobs,
            "expired_urls": scrape_result.expired_urls,
            "jobs_scraped": len(scrape_result.jobs),
            "jobs_normalised": len(normalised_jobs),
        }
        logger.info(
            "%s: scraped=%d normalised=%d expired_candidates=%d",
            source_name,
            len(scrape_result.jobs),
            len(normalised_jobs),
            len(scrape_result.expired_urls),
        )

    # Phase 4: Dry run summary
    if args.dry_run:
        total_scraped = sum(int(b["jobs_scraped"]) for b in scrape_batches.values())
        total_normalised = sum(int(b["jobs_normalised"]) for b in scrape_batches.values())
        total_expired = sum(len(b["expired_urls"]) for b in scrape_batches.values())
        logger.info(
            "✓ Dry run complete — scraped=%d normalised=%d expired=%d",
            total_scraped, total_normalised, total_expired,
        )
        return 0

    # Phase 5: Persist to Supabase
    with SupabaseRestClient(
        url=config.supabase_url,
        service_role_key=config.supabase_service_role_key,
        timeout=config.timeout,
    ) as client:
        pipeline = SupabasePipeline(client)
        total_inserted = 0
        total_updated = 0
        total_duplicates = 0
        total_expired = 0
        had_errors = False

        for source_name, batch in scrape_batches.items():
            jobs = batch["jobs"]
            if not jobs:
                jobs = []

            result = pipeline.save_jobs(jobs)
            expired_marked = pipeline.mark_jobs_expired(
                batch["expired_urls"],
                seen_at=now.isoformat().replace("+00:00", "Z"),
            )

            total_inserted += result.inserted
            total_updated += result.updated
            total_duplicates += result.duplicates_skipped
            total_expired += expired_marked

            if result.errors:
                had_errors = True
                for error in result.errors:
                    logger.error("%s", error)

            logger.info(
                "%s: inserted=%d updated=%d duplicates=%d expired=%d errors=%d",
                source_name,
                result.inserted, result.updated, result.duplicates_skipped,
                expired_marked, len(result.errors),
            )

    logger.info(
        "✓ Scrape run complete — inserted=%d updated=%d duplicates=%d expired=%d",
        total_inserted, total_updated, total_duplicates, total_expired,
    )
    return 1 if had_errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
