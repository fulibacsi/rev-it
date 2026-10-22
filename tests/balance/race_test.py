"""The race layer, simulated: when the hidden #100 gets passed, then where builds finish from various grid slots."""
import json
from playwright.sync_api import sync_playwright
import sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))  # tests/common.py
from common import URL, launch
early = dict(power=2, rev=1, gears=1, time=1)
mid = dict(power=5, rev=3, gears=2, tyres=2, time=3, clutch=1, gas=1)
late = dict(power=8, rev=4, gears=3, tyres=3, time=5, clutch=1, gas=1, shift=1, steer=1, engine=1)
full = dict(power=10, rev=4, gears=3, tyres=4, time=6, clutch=1, gas=1, shift=1, steer=1, engine=2)
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); js = pg.evaluate
    js("localStorage.clear()"); pg.reload(); pg.add_script_tag(path=str(HERE / "sim.js")); js("progress.toured = TUTORIALS.map(t => t.id)"); pg.click('[data-play="distance"]'); pg.click("#drive"); pg.wait_for_timeout(1500)
    sim = lambda lv, e: js(f"simRun({json.dumps(lv)}, {e}, 1.5, {{}}, true)")
    print("before the reveal (racer #100 starts 400 m ahead at 140 km/h):")
    for name, lv, e in [("early", early, 0), ("mid", mid, 1), ("late", late, 1)]:
        js("Object.assign(progress, { racing: false, finish: 101, points: 0 })")
        r = sim(lv, e); print(f"  {name:5} {r['m']:5} m, revealed: {js('progress.racing')}, finished P{js('run.race && run.race.p')}")
    print("races (position at the bell), by build and grid slot:")
    for name, lv, e in [("mid", mid, 1), ("late", late, 1), ("full", full, 2), ("full+cruise", {**full, "cruise": 1}, 2)]:
        row = []
        for slot in (101, 80, 60, 40, 20):
            js(f"Object.assign(progress, {{ racing: true, finish: 1 }}); progress.levels.grid = {101 - slot}")
            res = [sim({**lv, "grid": 101 - slot}, e) for _ in range(2)]
            row.append(f"P{slot}->" + "/".join(str(js('run.race.p')) if False else '' for _ in [0]))
            fins = []
            for _ in range(2):
                sim({**lv, "grid": 101 - slot}, e); fins.append(js("run.race.p"))
            row[-1] = f"P{slot}->{fins}"
        print(f"  {name:11}", "  ".join(row))
    b.close(); print("ERRORS:", errs or "none")
