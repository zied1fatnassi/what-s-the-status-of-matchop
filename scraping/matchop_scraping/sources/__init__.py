"""Source-specific job scrapers."""

from .greenhouse import GreenhouseScraper
from .indeed import IndeedScraper
from .lever import LeverScraper
from .linkedin import LinkedInScraper
from .workable import WorkableScraper

SOURCE_REGISTRY = {
    "linkedin": LinkedInScraper,
    "indeed": IndeedScraper,
    "greenhouse": GreenhouseScraper,
    "lever": LeverScraper,
    "workable": WorkableScraper,
}

__all__ = ["SOURCE_REGISTRY", "GreenhouseScraper", "IndeedScraper", "LeverScraper", "LinkedInScraper", "WorkableScraper"]
