"""A string of races from the reveal on: the bot buys every grid slot and rolling start it can, places per race."""
import json
from playwright.sync_api import sync_playwright
import sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))  # tests/common.py
from common import URL, launch
late = dict(power=8, rev=4, gears=3, tyres=3, time=5, clutch=1, gas=1, shift=1, steer=1, engine=1)
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); js = pg.evaluate
    js("localStorage.clear()"); pg.reload(); pg.add_script_tag(path=str(HERE / "sim.js")); js("progress.toured = TUTORIALS.map(t => t.id)"); pg.click('[data-play="distance"]'); pg.click("#drive"); pg.wait_for_timeout(1500)
    js("Object.assign(progress, { racing: false, finish: 101, points: 0 })")
    r = js(f"simRun({json.dumps(late)}, 1, 1.5, {{}}, true)")
    print("reveal run:", r["m"], "m, revealed", js("progress.racing"), "finished", js("run.race"))
    for race in range(1, 13):
        lv = js("({ ...progress.levels })"); lv.update(late)
        r = js(f"simRun({json.dumps(lv)}, 1, 1.5, {{}}, true)")
        res = js("run.race")
        bought = js("(() => { const b = []; while (buy('rolling')) b.push('rolling'); let n = 0; while (buy('grid')) n++; if (n) b.push('grid+' + n); return b; })()")
        print(f"race {race:2}: start P{res['start']:3} -> P{res['p']:3}  +{res['points']:2} pts  bank {js('progress.points'):4}  bought {bought}  rolling {js('lvl(\"rolling\")')}")
    b.close(); print("ERRORS:", errs or "none")
