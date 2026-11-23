from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from html.parser import HTMLParser
import ipaddress
import re
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit
import xml.etree.ElementTree as ET

from collector.config import FeedSpec
from collector.models import Article


# Tuổi Trẻ writes pubDate as "11/21/2026 11:44:00 AM": month first, 12-hour clock, no zone.
# The times match Vietnam local time (the newest items are minutes before the poll in UTC+7).
_US_STYLE_DATE = re.compile(r"(\d{1,2})/(\d{1,2})/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)", re.IGNORECASE)
_VIETNAM_TIME = timezone(timedelta(hours=7))

_TRACKING_KEYS = {"fbclid", "gclid", "dclid", "mc_cid", "mc_eid", "ref", "ref_src"}


class FeedParseError(ValueError):
    """The response body is not a valid RSS or Atom XML document."""


@dataclass(frozen=True)
class ParsedFeed:
    articles: tuple[Article, ...]
    items_missing_link: int = 0
    items_missing_title: int = 0
    rss_item_count: int = 0
    items_invalid_link: int = 0
    description_char_total: int = 0
    description_item_count: int = 0
    empty_description_count: int = 0
    oldest_item_published_at: str | None = None


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def plain_text(value: str) -> str:
    parser = _TextExtractor()
    parser.feed(unescape(value))
    parser.close()
    return re.sub(r"\s+", " ", " ".join(parser.parts)).strip()


def normalize_url(url: str) -> str:
    """Remove URL fragments and common tracking parameters without changing the article path."""
    try:
        parts = urlsplit(url.strip())
    except (ValueError, UnicodeError) as exc:
        raise ValueError(f"Malformed article URL: {url!r}") from exc
    if parts.scheme.lower() not in {"http", "https"} or not parts.hostname:
        raise ValueError(f"Unsupported article URL: {url!r}")

    hostname = parts.hostname
    try:
        address = ipaddress.ip_address(hostname)
        hostname = f"[{address.compressed.lower()}]" if address.version == 6 else address.compressed
    except ValueError:
        try:
            hostname = hostname.encode("idna").decode("ascii").lower()
        except UnicodeError as exc:
            raise ValueError(f"Malformed article hostname: {url!r}") from exc
        labels = hostname.rstrip(".").split(".")
        if (
            not hostname.rstrip(".")
            or len(hostname.rstrip(".")) > 253
            or any(
                not label
                or len(label) > 63
                or label.startswith("-")
                or label.endswith("-")
                or any(not char.isalnum() and char != "-" for char in label)
                for label in labels
            )
        ):
            raise ValueError(f"Malformed article hostname: {url!r}")
    try:
        port = parts.port
    except ValueError as exc:
        raise ValueError(f"Malformed article port: {url!r}") from exc
    default_port = (parts.scheme.lower(), port) in {("http", 80), ("https", 443)}
    host_and_port = hostname if port is None or default_port else f"{hostname}:{port}"
    userinfo = f"{parts.netloc.rsplit('@', 1)[0]}@" if "@" in parts.netloc else ""
    netloc = f"{userinfo}{host_and_port}"
    query = [
        (key, value)
        for key, value in parse_qsl(parts.query, keep_blank_values=True)
        if not key.casefold().startswith("utm_") and key.casefold() not in _TRACKING_KEYS
    ]
    query.sort()
    return urlunsplit((parts.scheme.lower(), netloc, parts.path or "/", urlencode(query, doseq=True), ""))


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].split(":")[-1].casefold()


def _child_text(item: ET.Element, *names: str) -> str:
    wanted = {name.casefold() for name in names}
    for child in item:
        if _local_name(child.tag) in wanted:
            value = " ".join(child.itertext()).strip()
            if value:
                return value
    return ""


def _item_link(item: ET.Element, feed_url: str) -> tuple[str | None, bool]:
    for child in item:
        if _local_name(child.tag) != "link":
            continue
        candidate = child.attrib.get("href", "").strip() or (child.text or "").strip()
        if candidate:
            try:
                return normalize_url(urljoin(feed_url, unescape(candidate))), False
            except (ValueError, UnicodeError):
                return None, True
    return None, False


def _parse_us_style_date(value: str) -> datetime | None:
    match = _US_STYLE_DATE.fullmatch(value.strip())
    if not match:
        return None
    month, day, year, hour, minute, second = (int(part) for part in match.groups()[:6])
    if not 1 <= hour <= 12:
        return None
    hour = hour % 12 + (12 if match.group(7).upper() == "PM" else 0)
    try:
        return datetime(year, month, day, hour, minute, second, tzinfo=_VIETNAM_TIME)
    except ValueError:
        return None


def _parse_date(value: str) -> str | None:
    if not value:
        return None
    us_style = _parse_us_style_date(value)
    if us_style is not None:
        return us_style.astimezone(timezone.utc).isoformat()
    try:
        parsed = parsedate_to_datetime(value)
    except (TypeError, ValueError, OverflowError):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat()


def parse_feed(payload: bytes | str, feed: FeedSpec) -> ParsedFeed:
    try:
        root = ET.fromstring(payload)
    except (ET.ParseError, ValueError, TypeError) as exc:
        raise FeedParseError(f"Malformed XML: {exc}") from exc

    items = [element for element in root.iter() if _local_name(element.tag) in {"item", "entry"}]
    articles: list[Article] = []
    missing_link = 0
    missing_title = 0
    invalid_link = 0
    description_char_total = 0
    empty_description_count = 0
    published_dates: list[datetime] = []

    for item in items:
        title = plain_text(_child_text(item, "title"))
        link, invalid = _item_link(item, feed.url)
        if invalid:
            invalid_link += 1
        elif link is None:
            missing_link += 1
        if not title:
            missing_title += 1

        date_value = _child_text(item, "pubDate", "published", "updated", "date")
        published_at = _parse_date(date_value)
        if published_at:
            published_dates.append(datetime.fromisoformat(published_at))
        description = plain_text(_child_text(item, "description", "summary", "encoded", "content"))
        description_char_total += len(description)
        empty_description_count += not description

        if not title:
            continue
        if not link:
            continue

        articles.append(
            Article(
                source_code=feed.source_code,
                source_name=feed.source_name,
                category_codes=(feed.category_code,),
                feed_ids=(feed.feed_id,),
                url=link,
                title=title,
                published_at=published_at,
                description=description,
            )
        )

    return ParsedFeed(
        articles=tuple(articles),
        rss_item_count=len(items),
        items_missing_link=missing_link,
        items_missing_title=missing_title,
        items_invalid_link=invalid_link,
        description_char_total=description_char_total,
        description_item_count=len(items),
        empty_description_count=empty_description_count,
        oldest_item_published_at=min(published_dates).isoformat() if published_dates else None,
    )
