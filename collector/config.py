from __future__ import annotations

from dataclasses import dataclass
import re
import unicodedata


@dataclass(frozen=True)
class FeedSpec:
    feed_id: int
    source_code: str
    source_name: str
    category_code: str
    category_name: str
    url: str


def _category_key(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value.casefold().replace("đ", "d"))
    without_marks = "".join(char for char in decomposed if unicodedata.category(char) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", without_marks).strip()


_ALIASES = {
    "vnexpress": {
        "thoi su": "thoi-su",
        "the gioi": "the-gioi",
        "kinh doanh": "kinh-te",
        "kinh te": "kinh-te",
        "khoa hoc cong nghe": "cong-nghe",
        "cong nghe": "cong-nghe",
        "the thao": "the-thao",
    },
    "tuoitre": {
        "thoi su": "thoi-su",
        "the gioi": "the-gioi",
        "kinh doanh": "kinh-te",
        "kinh te": "kinh-te",
        "nhip song so": "cong-nghe",
        "cong nghe": "cong-nghe",
        "the thao": "the-thao",
    },
    "thanhnien": {
        "thoi su": "thoi-su",
        "the gioi": "the-gioi",
        "kinh te": "kinh-te",
        "kinh doanh": "kinh-te",
        "cong nghe": "cong-nghe",
        "the thao": "the-thao",
    },
    "dantri": {
        "thoi su": "thoi-su",
        "the gioi": "the-gioi",
        "kinh doanh": "kinh-te",
        "kinh te": "kinh-te",
        "cong nghe": "cong-nghe",
        "the thao": "the-thao",
    },
}


def map_category(source_code: str, category_name: str) -> str:
    """Map a source's RSS category label to a shared category code.

    Unknown source labels raise KeyError so feeds cannot silently land in a
    guessed category. Add a verified source label to _ALIASES when needed.
    """
    source_aliases = _ALIASES[source_code]
    return source_aliases[_category_key(category_name)]


def _feed(
    feed_id: int,
    source_code: str,
    source_name: str,
    category_name: str,
    url: str,
) -> FeedSpec:
    return FeedSpec(
        feed_id=feed_id,
        source_code=source_code,
        source_name=source_name,
        category_code=map_category(source_code, category_name),
        category_name=category_name,
        url=url,
    )


FEEDS = (
    _feed(1, "vnexpress", "VnExpress", "Thời sự", "https://vnexpress.net/rss/thoi-su.rss"),
    _feed(2, "vnexpress", "VnExpress", "Thế giới", "https://vnexpress.net/rss/the-gioi.rss"),
    _feed(3, "vnexpress", "VnExpress", "Kinh doanh", "https://vnexpress.net/rss/kinh-doanh.rss"),
    _feed(4, "vnexpress", "VnExpress", "Khoa học - Công nghệ", "https://vnexpress.net/rss/khoa-hoc-cong-nghe.rss"),
    _feed(5, "vnexpress", "VnExpress", "Thể thao", "https://vnexpress.net/rss/the-thao.rss"),
    _feed(6, "tuoitre", "Tuổi Trẻ", "Thời sự", "https://tuoitre.vn/thoi-su.rss"),
    _feed(7, "tuoitre", "Tuổi Trẻ", "Thế giới", "https://tuoitre.vn/the-gioi.rss"),
    _feed(8, "tuoitre", "Tuổi Trẻ", "Kinh doanh", "https://tuoitre.vn/kinh-doanh.rss"),
    _feed(9, "tuoitre", "Tuổi Trẻ", "Nhịp sống số", "https://tuoitre.vn/nhip-song-so.rss"),
    _feed(10, "tuoitre", "Tuổi Trẻ", "Thể thao", "https://tuoitre.vn/the-thao.rss"),
    _feed(11, "thanhnien", "Thanh Niên", "Thời sự", "https://thanhnien.vn/rss/thoi-su.rss"),
    _feed(12, "thanhnien", "Thanh Niên", "Thế giới", "https://thanhnien.vn/rss/the-gioi.rss"),
    _feed(13, "thanhnien", "Thanh Niên", "Kinh tế", "https://thanhnien.vn/rss/kinh-te.rss"),
    _feed(14, "thanhnien", "Thanh Niên", "Công nghệ", "https://thanhnien.vn/rss/cong-nghe.rss"),
    _feed(15, "thanhnien", "Thanh Niên", "Thể thao", "https://thanhnien.vn/rss/the-thao.rss"),
    _feed(16, "dantri", "Dân trí", "Thời sự", "https://dantri.com.vn/rss/thoi-su.rss"),
    _feed(17, "dantri", "Dân trí", "Thế giới", "https://dantri.com.vn/rss/the-gioi.rss"),
    _feed(18, "dantri", "Dân trí", "Kinh doanh", "https://dantri.com.vn/rss/kinh-doanh.rss"),
    _feed(19, "dantri", "Dân trí", "Công nghệ", "https://dantri.com.vn/rss/cong-nghe.rss"),
    _feed(20, "dantri", "Dân trí", "Thể thao", "https://dantri.com.vn/rss/the-thao.rss"),
)


POLL_INTERVAL_SECONDS = 15 * 60
DEFAULT_TIMEOUT_SECONDS = 15
