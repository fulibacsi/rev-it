"""A whole progression: a bot drives each run (human-like timing) and buys upgrades in the garage between runs."""
import json, sys
from playwright.sync_api import sync_playwright
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))  # tests/common.py
from common import URL, launch
policy = sys.argv[1] if len(sys.argv) > 1 else "cheapest"
skill = float(sys.argv[2]) if len(sys.argv) > 2 else 1.5
first = float(sys.argv[3]) if len(sys.argv) > 3 else 0.6  # first runs: learning the controls, this share of the bot's distance
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(); pg.on("pageerror", lambda e: print("ERR", e))
    pg.goto(URL); js = pg.evaluate
    js("localStorage.clear()"); pg.reload(); pg.add_script_tag(path=str(HERE / "sim.js")); pg.click('[data-play="distance"]'); pg.click("#drive"); pg.wait_for_timeout(1500)
    U = js("Object.fromEntries(Object.entries(UPGRADES).map(([k, u]) => [k, { max: u.max, base: u.base, growth: u.growth ?? 1, needs: u.needs }]))")
    cost = lambda k, l: round(U[k]["base"] * U[k]["growth"] ** l / 10) * 10
    lv, bank, total, spent = {}, 0, 0, 0
    sim = lambda lv: js(f"simRun({json.dumps(lv)}, {lv.get('engine', 0)}, {skill})")["m"]
    def options():
        return [k for k in U if lv.get(k, 0) < U[k]["max"] and (not U[k]["needs"] or lv.get(U[k]["needs"])) and cost(k, lv.get(k, 0)) <= bank]
    for r in range(1, 81):
        m = sim(lv); m = int(m * first) if r <= 2 else m
        bank += m; total += m
        bought = []
        while (opts := options()):
            if policy == "cheapest": k = min(opts, key=lambda k: cost(k, lv.get(k, 0)))
            else:  # best metres gained per metre spent, by trying each
                k = max(opts, key=lambda k: (sim({**lv, k: lv.get(k, 0) + 1}) - m) / cost(k, lv.get(k, 0)))
            c = cost(k, lv.get(k, 0)); bank -= c; spent += c; lv[k] = lv.get(k, 0) + 1; bought.append(f"{k}{lv[k]}")
        print(f"run {r:2} {m:5} m  bank {bank:6}  bought {' '.join(bought)}")
        if all(lv.get(k, 0) >= U[k]["max"] for k in U): print(f"maxed after {r} runs, {total} m driven"); break
    b.close()
