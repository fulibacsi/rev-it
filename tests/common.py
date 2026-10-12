"""Shared by the browser tests and the balance tools: the page to load, where screenshots go, a headless browser."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
URL = (ROOT / "index.html").as_uri()
OUT = ROOT / "tests" / "out"  # screenshots (gitignored)


def launch(p, **kw):
    """Headless Chrome where it's installed, otherwise Playwright's own Chromium (`playwright install chromium`)."""
    kw.setdefault("headless", True)
    try:
        return p.chromium.launch(channel="chrome", **kw)
    except Exception:
        return p.chromium.launch(**kw)
