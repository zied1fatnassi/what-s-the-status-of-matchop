# MatchOp External Job Scraper v2

> **Scrapling + Groq AI** powered scraper replacing the legacy `scraping/` subsystem.

## Architecture

```
scraper/
├── config/
│   └── seeds.yml              # Seed URLs for each ATS source
├── docker/
│   ├── Dockerfile.cron        # Cron-based container image
│   └── matchop-scraper.cron   # Cron schedule (every 4h)
├── matchop_scraper/
│   ├── __init__.py
│   ├── config.py              # Centralised env/YAML config
│   ├── main.py                # Entry point and orchestration
│   ├── sources/               # Scrapling-based ATS scrapers
│   │   ├── base.py            # Base class with rate limiting
│   │   ├── greenhouse.py
│   │   ├── lever.py
│   │   └── workable.py
│   ├── extractors/            # Data models + AI extraction
│   │   ├── models.py          # RawJobPosting, NormalizedJobPosting
│   │   ├── normalizer.py      # Title/location/company cleaning
│   │   └── groq_extractor.py  # Groq AI structured extraction
│   └── pipelines/             # Supabase ingestion
│       ├── supabase_client.py # REST client (service role)
│       └── supabase_pipeline.py # Dedup + upsert logic
├── docker-compose.cron.yml
├── pyproject.toml
├── run_worker.py
├── .env.example
└── README.md
```

## Install

```bash
cd scraper
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Linux/macOS
pip install -e .
```

## Configure

Copy `.env.example` to `.env` and set:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (server-side only) |
| `GROQ_API_KEY` | Optional | Groq API key for AI extraction |
| `GROQ_MODEL` | No | Groq model (default: `llama-3.3-70b-versatile`) |
| `MATCHOP_SCRAPER_TIMEOUT` | No | Request timeout in seconds (default: 30) |
| `MATCHOP_SCRAPER_RETRIES` | No | Retry count per request (default: 2) |
| `MATCHOP_SCRAPER_DELAY` | No | Delay between requests in seconds (default: 2.0) |
| `MATCHOP_SCRAPER_IMPERSONATE` | No | Browser TLS fingerprint to mimic (default: chrome) |
| `MATCHOP_SCRAPER_STEALTH` | No | Use stealthy headers (default: true) |

Seed URLs are defined in `config/seeds.yml`.

## Run

```bash
# Full scrape with Groq AI extraction
python -m matchop_scraper.main --sources greenhouse lever workable

# Dry run (no Supabase writes)
python -m matchop_scraper.main --dry-run --sources greenhouse

# Without AI extraction
python -m matchop_scraper.main --no-ai --sources lever workable

# Debug logging
python -m matchop_scraper.main --log-level DEBUG
```

## Pipeline Flow

```
1. Scrapling fetches seed pages
2. Source scrapers discover + parse job pages
3. Groq AI extracts structured fields (skills, experience, summary)
4. Normalizer cleans titles, locations, companies, salaries
5. Pipeline deduplicates by URL/source_job_id/content_hash
6. Upsert into Supabase external_jobs table
```

## Scheduling

### GitHub Actions (Recommended)
The workflow at `.github/workflows/external-job-scraper.yml` runs the worker every 4 hours.

### Docker Cron
```bash
cd scraper
docker compose -f docker-compose.cron.yml up -d
```

## Scope Guardrails

- Writes only to `external_jobs` — **no** MatchOp internal offers, swipes, intros, matches, or chat.
- Groq AI extraction is **best-effort** — failures don't block ingestion.
- Rate limiting with configurable delay between requests.
- Rotating user agents for HTTP requests.
