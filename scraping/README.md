# MatchOp External Job Scraper

This worker is isolated from the React/Vercel app and writes only to `public.external_jobs`.

## Install

```bash
cd scraping
python -m venv .venv
.venv\Scripts\activate
pip install -e .
```

## Configure

Copy `.env.example` to `.env` and set the worker-only secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MATCHOP_SEED_CONFIG_PATH`

Seed URLs are defined in `config/seeds.yml`. The `MATCHOP_GREENHOUSE_URLS`, `MATCHOP_LEVER_URLS`, and `MATCHOP_WORKABLE_URLS` environment variables are optional overrides that append additional seed pages.

## Run

```bash
cd scraping
python -m matchop_scraping.scheduler.run_scrapers --sources greenhouse lever workable
```

Dry run without Supabase writes:

```bash
cd scraping
python -m matchop_scraping.scheduler.run_scrapers --dry-run --sources greenhouse lever workable
```

## Scheduling

The repository includes `.github/workflows/external-job-scraper.yml`, which runs the worker every 4 hours with GitHub Actions cron.

## Scope Guardrails

- Internal MatchOp jobs in `offers` are untouched.
- No swipe, intro, match, or chat tables are modified.
- Only ATS sources are active initially: Greenhouse, Lever, and Workable.
- External jobs remain redirect-only opportunities through `original_url`.
