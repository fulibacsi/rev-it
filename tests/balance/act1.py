"""The first act with a perfect player: when does the white car (#100) get passed, and what does the car have then?
Usage: act1.py [cheapest|value] [head-start curve, or -] [traffic], traffic a number for another set of seeds."""
import json, sys
from playwright.sync_api import sync_playwright
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))  # tests/common.py
from common import URL, launch
policy = sys.argv[1] if len(sys.argv) > 1 else "cheapest"
TRAFFIC = int(sys.argv[3]) if len(sys.argv) > 3 else 1

with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); js = pg.evaluate
    js("localStorage.clear()"); pg.reload(); pg.add_script_tag(path=str(HERE / "sim.js")); pg.click('[data-play="distance"]'); pg.click("#drive"); pg.wait_for_timeout(1500)
    if len(sys.argv) > 2 and sys.argv[2] != "-": js(f"HEAD_START.splice(0, HEAD_START.length, ...{sys.argv[2]})")
    # what the white car's head start counts (race.js): everything paid in metres, the Autopilot page's aids too, but
    # nothing that goes on sale with the reveal, and nothing that adds no speed (the stereo)
    U = js("Object.fromEntries(Object.entries(UPGRADES).filter(([, u]) => inMetres(u) && !u.afterReveal && u.built !== 0).map(([k, u]) => [k, { max: u.max, base: u.base, growth: u.growth ?? 1, needs: u.needs ?? [] }]))")
    cost = lambda k, l: round(U[k]["base"] * U[k]["growth"] ** l / 10) * 10
    lv, bank, revealed, clock = {}, 0, None, 0
    # every run in the first act (the white car is all there is), its traffic from a seed of its own: the same for each
    # upgrade the value player tries then. The page's own loop draws on the seed between runs, so left alone the
    # results moved with the machine's load. The rest of what a run shows is read in the same call, before that loop moves
    # the white car: its gap at the bell (negative: behind you), whether it was passed and when, its head start
    seed = 1
    sim = lambda lv: js(f"""(() => {{ rng = {seed}; progress.racing = false; progress.finish = 101;
        const r = simRun({json.dumps(lv)}, {lv.get('engine', 0)}, 1, {{}}, true), c = racers().find(c => c.racer === 100);
        return {{ ...r, gap: c ? Math.round(c.z - odo) : null, passed: progress.racing, at: passedAt, head: Math.round(headStart()), rt: runTime() }};
      }})()""")
    for r in range(1, 81):
        seed = 1000 * TRAFFIC + r
        s = sim(lv); m, g, passed, at, head, rt = s["m"], s["gap"], s["passed"], s["at"], s["head"], s["rt"]
        bank += m
        bought = []
        while True:
            opts = [k for k in U if lv.get(k, 0) < U[k]["max"] and all(lv.get(n) for n in U[k]["needs"]) and cost(k, lv.get(k, 0)) <= bank]
            if not opts: break
            if policy == "cheapest": k = min(opts, key=lambda k: cost(k, lv.get(k, 0)))
            else: k = max(opts, key=lambda k: (sim({**lv, k: lv.get(k, 0) + 1})["m"] - m) / cost(k, lv.get(k, 0)))
            bank -= cost(k, lv.get(k, 0)); lv[k] = lv.get(k, 0) + 1; bought.append(f"{k}{lv[k]}")
        done = all(lv.get(k, 0) >= U[k]["max"] for k in U)
        clock += rt + 6.5  # the run, plus starting, countdown and braking at the end
        print(f"run {r:2} ({rt} s, head start {head:4} m, {clock / 60:4.1f} min): {m:5} m  #100 {f'PASSED at {at} s' if passed else f'{g:5} m ahead'}  bought {' '.join(bought)}" + ("  [car fully built]" if done else ""))
        if passed and revealed is None: revealed = (r, dict(lv))
        if done and revealed: break
    print("first passed on run", revealed[0] if revealed else None, "| car then:", revealed[1] if revealed else None)
    b.close(); print("ERRORS:", errs or "none")
