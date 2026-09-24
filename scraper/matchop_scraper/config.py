"""Centralised configuration loaded from environment and YAML seed files."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv
import yaml


def _load_env() -> None:
    """Load .env files with correct precedence."""
    worker_root = Path(__file__).resolve().parents[1]
    load_dotenv(worker_root / ".env", override=False)
    load_dotenv(worker_root.parent / ".env", override=False)
    load_dotenv(worker_root.parent / ".env.local", override=False)


def _parse_bool(raw: str | None, default: bool) -> bool:
    if raw is None or not raw.strip():
        return default
    return raw.strip().lower() not in {"0", "false", "no", "off"}


def _parse_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    return float(raw)


def _parse_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    return int(raw)


def _split_csv(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [v.strip() for v in raw.split(",") if v.strip()]


@dataclass(frozen=True, slots=True)
class ScraperConfig:
    """Immutable scraper configuration."""

    # Supabase
    supabase_url: str
    supabase_service_role_key: str

    # Groq
    groq_api_key: str
    groq_model: str = "llama-3.3-70b-versatile"

    # Request behaviour
    timeout: float = 30.0
    retries: int = 2
    delay: float = 2.0
    impersonate: str = "chrome"
    stealth: bool = True

    # Seed URLs per source
    seeds: dict[str, list[str]] = field(default_factory=dict)

    @classmethod
    def from_env(cls) -> "ScraperConfig":
        """Build config from environment variables + seed YAML."""
        _load_env()

        supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or ""
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""
        groq_key = os.getenv("GROQ_API_KEY") or ""
        groq_model = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

        seeds = _load_seed_config()

        # Merge env-based URL overrides
        source_env_map = {
            "greenhouse": "MATCHOP_GREENHOUSE_URLS",
            "lever": "MATCHOP_LEVER_URLS",
            "workable": "MATCHOP_WORKABLE_URLS",
        }
        for source, env_key in source_env_map.items():
            extras = _split_csv(os.getenv(env_key))
            if extras:
                existing = seeds.get(source, [])
                for url in extras:
                    if url not in existing:
                        existing.append(url)
                seeds[source] = existing

        return cls(
            supabase_url=supabase_url,
            supabase_service_role_key=supabase_key,
            groq_api_key=groq_key,
            groq_model=groq_model,
            timeout=_parse_float("MATCHOP_SCRAPER_TIMEOUT", 30.0),
            retries=_parse_int("MATCHOP_SCRAPER_RETRIES", 2),
            delay=_parse_float("MATCHOP_SCRAPER_DELAY", 2.0),
            impersonate=os.getenv("MATCHOP_SCRAPER_IMPERSONATE", "chrome"),
            stealth=_parse_bool(os.getenv("MATCHOP_SCRAPER_STEALTH"), True),
            seeds=seeds,
        )


def _load_seed_config() -> dict[str, list[str]]:
    """Load seed URLs from YAML config file."""
    worker_root = Path(__file__).resolve().parents[1]
    raw_path = os.getenv("MATCHOP_SEED_CONFIG_PATH")
    config_path = Path(raw_path) if raw_path else worker_root / "config" / "seeds.yml"
    if not config_path.is_absolute():
        config_path = worker_root / config_path
    if not config_path.exists():
        return {}

    with config_path.open("r", encoding="utf-8") as fh:
        payload = yaml.safe_load(fh) or {}

    normalised: dict[str, list[str]] = {}
    for source_name, value in payload.items():
        if isinstance(value, list):
            normalised[source_name] = [str(v).strip() for v in value if str(v).strip()]
    return normalised
