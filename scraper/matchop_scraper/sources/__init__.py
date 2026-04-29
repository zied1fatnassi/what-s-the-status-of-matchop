"""Source-specific job scrapers using Scrapling."""

from .greenhouse import GreenhouseScraper
from .lever import LeverScraper
from .workable import WorkableScraper

SOURCE_REGISTRY = {
    "greenhouse": GreenhouseScraper,
    "lever": LeverScraper,
    "workable": WorkableScraper,
}

__all__ = ["SOURCE_REGISTRY", "GreenhouseScraper", "LeverScraper", "WorkableScraper"]
