# /// script
# requires-python = ">=3.10"
# ///
"""Builds the itch.io release: the game's own files and nothing else, in a folder butler pushes (or to zip by hand).

    SUPABASE_URL=https://<project>.supabase.co SUPABASE_KEY=sb_publishable_... uv run tools/build.py build/itch

One codebase for both releases: js/reporting.js leaves SUPABASE empty in the repository, so GitHub Pages (main, as it
is) plays without feedback or gameplay data. This fills it in, so the itch.io build asks for consent on the first
visit and has FEEDBACK in SHARE's place. The key is the publishable one, public by design (the tables take inserts
only: tools/supabase.sql); a secret key is refused. The release workflow (.github/workflows/itch.yml) runs this on a
push to release/itchio.
"""
import base64
import json
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SHIP = ["index.html", "manifest.webmanifest", "LICENSE", "CREDITS.md", "css", "js", "assets"]  # what the game needs
EMPTY = "const SUPABASE = { url: '', key: '' };"


def publishable(key):
    """A publishable key, or a legacy anon one; never a secret or service-role key, which would open the database."""
    if key.startswith("sb_publishable_"):
        return True
    if key.count(".") == 2:  # a legacy key: a JWT, its role in the middle part
        part = key.split(".")[1]
        return json.loads(base64.urlsafe_b64decode(part + "=" * (-len(part) % 4))).get("role") == "anon"
    return False


if __name__ == "__main__":
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "build/itch")
    url, key = os.environ.get("SUPABASE_URL", "").rstrip("/"), os.environ.get("SUPABASE_KEY", "")
    if not url.startswith("https://") or not publishable(key):
        sys.exit("SUPABASE_URL (https://...) and SUPABASE_KEY (the publishable key, sb_publishable_...) are needed")
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir(parents=True)
    for name in SHIP:
        src = ROOT / name
        (shutil.copytree if src.is_dir() else shutil.copy2)(src, out / name)
    js = out / "js" / "reporting.js"
    text = js.read_text()
    if text.count(EMPTY) != 1:
        sys.exit(f"{js}: no empty SUPABASE to fill in")
    js.write_text(text.replace(EMPTY, f"const SUPABASE = {{ url: {json.dumps(url)}, key: {json.dumps(key)} }};"))
    files = [p for p in out.rglob("*") if p.is_file()]
    print(f"{out}: {len(files)} files, {sum(p.stat().st_size for p in files) / 1e6:.1f} MB, reporting to {url}")
