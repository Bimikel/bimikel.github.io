"""Fail if any page links to a local file or page that doesn't exist.

Checks every href/src in every .html file. External links (https://...)
are skipped, since sites like LinkedIn block automated checks.
Run locally with:  python3 .github/scripts/check_links.py
"""
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote

ROOT = Path(__file__).resolve().parents[2]


class LinkCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []  # (line, url)

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in ("href", "src") and value:
                self.links.append((self.getpos()[0], value))


def target_exists(page: Path, url: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme or url.startswith("#") or url.startswith("//"):
        return True  # external, mailto:, or same-page anchor
    path = unquote(parsed.path)
    if not path:
        return True
    # "/blog" is relative to the site root; "../blog" is relative to this page.
    base = ROOT if path.startswith("/") else page.parent
    target = (base / path.lstrip("/")).resolve()
    # GitHub Pages serves folder/index.html for "folder" and "folder/".
    return target.is_file() or (target / "index.html").is_file()


def main() -> int:
    broken = 0
    pages = sorted(p for p in ROOT.rglob("*.html") if ".git" not in p.parts)
    for page in pages:
        collector = LinkCollector()
        collector.feed(page.read_text(encoding="utf-8"))
        for line, url in collector.links:
            if not target_exists(page, url):
                broken += 1
                print(f"BROKEN  {page.relative_to(ROOT)}:{line}  ->  {url}")
    print(f"Checked {len(pages)} pages: {broken} broken link(s).")
    return 1 if broken else 0


if __name__ == "__main__":
    sys.exit(main())
