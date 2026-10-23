"""Distance per run for upgrade states, then a whole progression played by a bot that buys upgrades."""
import json, sys
from playwright.sync_api import sync_playwright
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))  # tests/common.py
from common import URL, launch
errors = []
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL); js = pg.evaluate
    js("localStorage.clear()"); pg.reload(); pg.add_script_tag(path=str(HERE / "sim.js"))
    js("progress.toured = TUTORIALS.map(t => t.id); progress.runs = 1"); pg.click('[data-play="distance"]'); pg.click("#drive"); pg.wait_for_timeout(1500)  # a game under way: a new one skips the garage
    sim = lambda lv, e=0, s=1, off={}: js(f"simRun({json.dumps(lv)}, {e}, {s}, {json.dumps(off)})")
    full = dict(power=10, rev=4, gears=3, tyres=4, time=6)
    for name, lv, e in [("stock", {}, 0), ("stock casual", {}, 0), ("auto clutch", dict(clutch=1), 0),
                        ("all aids", dict(clutch=1, gas=1, shift=1), 0), ("rev4 gears3", dict(rev=4, gears=3), 0),
                        ("power5", dict(power=5), 0), ("power10", dict(power=10), 0),
                        ("power10 manual", dict(power=10, rev=4, gears=3), 0),
                        ("power10 + gas", dict(power=10, rev=4, gears=3, gas=1), 0),
                        ("boxer full", {**full, "clutch": 1, "gas": 1, "shift": 1}, 0),
                        ("v8 stock", {"engine": 1}, 1), ("v8 full", {**full, "clutch": 1, "gas": 1, "shift": 1, "engine": 1}, 1),
                        ("v8 full no gas", {**full, "clutch": 1, "gas": 1, "shift": 1, "engine": 1}, 1),
                        ("supra stock", {"engine": 2}, 2), ("supra full", {**full, "clutch": 1, "gas": 1, "shift": 1, "engine": 2}, 2)]:
        print(f"{name:18}", sim(lv, e, 2 if "casual" in name else 1, {"gas": 1} if "no gas" in name else {}))
    b.close()
print("ERRORS:", errors or "none")
