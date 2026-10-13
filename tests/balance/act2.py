"""The second act, simulated: from the reveal with a fully built car, race after race, buying Racing upgrades."""
import json, sys
from playwright.sync_api import sync_playwright
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))  # tests/common.py
from common import URL, launch
ACT1 = dict(power=10, rev=4, gears=3, tyres=4, time=6, clutch=1, gas=1, shift=1, steer=1, cruise=1, engine=2, flash=5)
ORDER = ["rolling", "reckless", "chicken", "recklessCruise", "cooling", "ecuRev", "ecuPower", "nitro", "gear7"]
RACES = int(sys.argv[1]) if len(sys.argv) > 1 else 60
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else None  # another traffic seed: another sample of the same balance
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); js = pg.evaluate
    js("localStorage.clear()"); pg.reload(); pg.add_script_tag(path=str(HERE / "sim.js")); pg.click('[data-play="distance"]'); pg.click("#drive"); pg.wait_for_timeout(1500)
    if SEED is not None: js(f"rng = {SEED}")
    js("window.RACER_BOT = true; Object.assign(progress, { racing: true, finish: 101, points: 0, bank: 0, damage: 0, broken: [], nitro: 0 })")
    total = 0
    for race in range(1, RACES + 1):
        lv = {**ACT1, **js("({ ...progress.levels })")}
        js(f"simRun({json.dumps(lv)}, 2, 1, {{}}, true)")
        r = js("run.race"); dmg = js("Math.round(progress.damage)")
        js("while (repair() && progress.damage > 0);")  # metres pay the repairs
        bought = js(f"""(() => {{ const b = []; let n = 0; while (buy('grid')) n++; if (n) b.push('grid+' + n);
          for (let again = true; again;) {{ again = false; for (const id of {json.dumps(ORDER)}) if (buy(id)) {{ b.push(id + lvl(id)); again = true; break; }} }}
          return b; }})()""")
        total += r["points"] if r else 0
        res = f"P{r['p']}" if r and r["p"] else (r or {}).get("dnf", "?")
        print(f"race {race:2}: P{r['start']:3} -> {res:6} +{(r or {}).get('points', 0):4} pts (new {(r or {}).get('fresh', 0)})  bank {js('progress.points'):5}  "
              f"metres {js('Math.round(progress.bank)'):6}  dmg {dmg:3}%  bought {bought}")
        if js("progress.finish") == 1: print("reached P1 after", race, "races"); break
    print("points earned:", total, "| levels:", js("({ ...progress.levels })"))
    b.close(); print("ERRORS:", errs or "none")
