"""Storage adapters for MatchOp scraped jobs."""

from .job_repository import ExternalJobRepository, SaveResult
from .supabase_client import SupabaseRestClient

__all__ = ["ExternalJobRepository", "SaveResult", "SupabaseRestClient"]
