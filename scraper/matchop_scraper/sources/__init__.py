"""Source-specific job scrapers using Scrapling."""

from .greenhouse import GreenhouseScraper
from .lever import LeverScraper
from .workable import WorkableScraper
from .keejob import KeejobScraper

SOURCE_REGISTRY = {
    "greenhouse": GreenhouseScraper,
    "lever": LeverScraper,
    "workable": WorkableScraper,
    "keejob": KeejobScraper,
}

__all__ = ["SOURCE_REGISTRY", "GreenhouseScraper", "LeverScraper", "WorkableScraper", "KeejobScraper"]
