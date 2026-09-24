"""Pipeline adapters for persisting scraped jobs."""

from .supabase_pipeline import SupabasePipeline

__all__ = ["SupabasePipeline"]
