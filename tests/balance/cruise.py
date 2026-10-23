"""Autocruise at speed, simulated: the car act2.py reaches P1 with, on autocruise (or Reckless auto-drive), through
traffic over many traffic seeds. Prints the metres a run (mean and spread), the share of the run spent on the brake,
and the crashes. Usage: cruise.py [runs] [plain|reckless]"""
import json, sys
from playwright.sync_api import sync_playwright
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))  # tests/common.py
from common import URL, launch
CAR = dict(power=10, rev=4, gears=3, tyres=4, time=6, clutch=1, gas=1, shift=1, steer=1, cruise=1, engine=2, flash=5, grid=100,
           rolling=6, reckless=1, chicken=1, ecuRev=4, recklessCruise=1, cooling=3, ecuPower=4, nitro=5)
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 24
if len(sys.argv) > 2 and sys.argv[2] == "plain": CAR = {k: v for k, v in CAR.items() if k not in ("recklessCruise", "reckless", "chicken")}
with sync_playwright() as p:
    b = launch(p); pg = b.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e))); js = pg.evaluate
    pg.goto(URL); js("localStorage.clear()"); pg.reload(); pg.add_script_tag(path=str(HERE / "sim.js"))
    js("progress.toured = TUTORIALS.map(t => t.id); progress.runs = 1"); pg.click('[data-play="distance"]'); pg.click("#drive"); pg.wait_for_timeout(1500)  # a game under way: a new one skips the garage
    # time on the brake: updateAids wrapped for the run (0: or Playwright would call the function it returns)
    js("""window.brakeLog = () => { let all = 0, on = 0; const f0 = window.updateAids; window.updateAids = dt => { f0(dt);
        if (run.phase === 'run') { all += dt; if (brakePedal > 0.05) on += dt; } }; return () => { window.updateAids = f0; return on / all; }; }; 0""")
    ms, brakes, crashes = [], [], 0
    for seed in range(RUNS):
        js(f"rng = {101 + seed * 7}; Object.assign(progress, {{ racing: true, finish: 1, damage: 0, broken: [], nitro: 10 }}); window.brakeEnd = brakeLog(); 0")
        r = js(f"simRun({json.dumps(CAR)}, 2, 1, {{}}, true)")
        brakes.append(js("brakeEnd()")); ms.append(r["m"]); crashes += r["crashes"]
    mean = sum(ms) / len(ms); sd = (sum((m - mean) ** 2 for m in ms) / (len(ms) - 1)) ** 0.5
    print(f"{RUNS} runs: {mean:.0f} m a run (sd {sd:.0f}, so the mean is good to about ±{sd / len(ms) ** 0.5:.0f}) | "
          f"on the brake {100 * sum(brakes) / len(brakes):.0f}% of the run | {crashes} crashes")
    b.close(); print("ERRORS:", errs or "none")
