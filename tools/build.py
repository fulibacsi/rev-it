# /// script
# requires-python = ">=3.10"
# ///
"""Builds the itch.io release: the game's own files and nothing else, in a folder butler pushes (or to zip by hand).

    REPORT_URL=https://<project>.supabase.co/functions/v1/report uv run tools/build.py build/itch

One codebase for both releases: js/reporting.js leaves the gate's address empty in the repository, so GitHub Pages
(main, as it is) plays without feedback or gameplay data. This fills it in, so the itch.io build asks for consent on
the first visit and has FEEDBACK in SHARE's place. The address is all the page gets: no key (the gate,
supabase/functions/report, holds it). The release workflow (.github/workflows/itch.yml) runs this on a push to
release/itchio.
"""
import json
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SHIP = ["index.html", "manifest.webmanifest", "LICENSE", "CREDITS.md", "css", "js", "assets"]  # what the game needs
EMPTY = "const GATE = '';"

if __name__ == "__main__":
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "build/itch")
    url = os.environ.get("REPORT_URL", "")
    if not url.startswith("https://") or "?" in url:
        sys.exit("REPORT_URL is needed: the gate's address, https://<project>.supabase.co/functions/v1/report")
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir(parents=True)
    for name in SHIP:
        src = ROOT / name
        (shutil.copytree if src.is_dir() else shutil.copy2)(src, out / name)
    js = out / "js" / "reporting.js"
    text = js.read_text()
    if text.count(EMPTY) != 1:
        sys.exit(f"{js}: no empty GATE to fill in")
    js.write_text(text.replace(EMPTY, f"const GATE = {json.dumps(url)};"))
    files = [p for p in out.rglob("*") if p.is_file()]
    print(f"{out}: {len(files)} files, {sum(p.stat().st_size for p in files) / 1e6:.1f} MB, reporting to {url}")
