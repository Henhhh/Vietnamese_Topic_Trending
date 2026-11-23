"""RSS collector owned by Person 2 — Data Collection."""

from collector.config import FEEDS, FeedSpec, map_category
from collector.models import Article, FeedPollMetric, PollReport
from collector.service import Collector

__all__ = ["Article", "Collector", "FEEDS", "FeedPollMetric", "FeedSpec", "PollReport", "map_category"]
