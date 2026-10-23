"""The third act, simulated: from the first win (P1) with the car as act 2 leaves it, race after race, turning the
metres into miles (keeping some for nitro and repairs), the team's places paying miles too, and buying the Fleet's
upgrades until 51 fleet cars: the gang
(act 4). Policy "order" (the default) buys like a player who knows dues are income: the first it can afford of dues,
a car, tuning, the flash; "cheapest" buys the cheapest first. Usage: act3.py [races] [seed] [order|cheapest] [overrides],
the overrides JavaScript to try other numbers ("UPGRADES.fleet.growth = 1.04")."""
import json, sys
from playwright.sync_api import sync_playwright
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))  # tests/common.py
from common import URL, launch
# the car at P1 in act2.py's runs (13 Oct): everything but 7th gear and Daredevil
ACT2 = dict(power=10, rev=4, gears=3, tyres=4, time=6, clutch=1, gas=1, shift=1, steer=1, cruise=1, engine=2, flash=5, grid=100,
            rolling=6, reckless=1, chicken=1, ecuRev=4, recklessCruise=1, cooling=3, ecuPower=4, nitro=5)
BANK = 44000     # metres unspent at P1 in act2.py's runs (18 Oct, after the traffic and brakes fixes: 40-47k)
RESERVE = 3000   # metres kept back for the nitro refill and repairs
FLEET = ["fleetTab", "dues", "fleet", "fleetPace", "fleetFlash"]  # the tab first (the owner's graph, 23 Oct)
GOAL = 51        # fleet cars: the gang
RACES = int(sys.argv[1]) if len(sys.argv) > 1 else 80
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else None
POLICY = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "-" else "order"
OVERRIDES = sys.argv[4] if len(sys.argv) > 4 else ""
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); js = pg.evaluate
    js("localStorage.clear()"); pg.reload(); pg.add_script_tag(path=str(HERE / "sim.js")); js("progress.toured = TUTORIALS.map(t => t.id)"); pg.click('[data-play="distance"]'); pg.click("#drive"); pg.wait_for_timeout(1500)
    if OVERRIDES: js(OVERRIDES + "; 0")
    js(f"window.RACER_BOT = true; Object.assign(progress, {{ racing: true, finish: 1, points: 0, bank: {BANK}, miles: 0, damage: 0, broken: [], nitro: 0, levels: {json.dumps(ACT2)} }})")
    for race in range(1, RACES + 1):
        lv = {**ACT2, **js("({ ...progress.levels })")}
        # each race's traffic from a seed of its own, set in the same call: the page's own loop draws on it between calls
        js(f"{f'rng = {SEED * 1000 + race}; ' if SEED is not None else ''}simRun({json.dumps(lv)}, 2, 1, {{}}, true)")
        r = js("({ p: run.race && run.race.p, dnf: run.race && run.race.dnf, m: run.gain, dues: run.dues, team: run.team, dmg: Math.round(progress.damage) })")
        js("while (repair() && progress.damage > 0);")  # metres pay the repairs
        mi = js(f"(() => {{ const n = Math.max(0, Math.floor((progress.bank - {RESERVE}) / MILE)); convert(n); return n; }})()")
        bought = js(f"""(() => {{ const b = []; for (;;) {{ const ids = {json.dumps(FLEET)}.filter(id => !whyNot(id));
            if (!ids.length) return b; const id = {'ids.sort((a, c) => cost(a) - cost(c))[0]' if POLICY == 'cheapest' else 'ids[0]'};
            buy(id); b.push(id + lvl(id)); }} }})()""")
        fleet = js("lvl('fleet')")
        print(f"race {race:2}: {('P' + str(r['p'])) if r['p'] else r['dnf']:8} {r['m']:6} m  dues {r['dues']:6} m  team {r['team']:3} mi  dmg {r['dmg']:3}%  "
              f"+{mi:3} mi -> {js('progress.miles'):4} left  fleet {fleet:3}  bought {' '.join(bought)}")
        if fleet >= GOAL: print(f"{GOAL} fleet cars after {race} races"); break
    else: print(f"fewer than {GOAL} fleet cars after {RACES} races")
    print("levels:", js("(() => { const l = progress.levels; return { fleet: l.fleet, dues: l.dues, fleetPace: l.fleetPace, fleetFlash: l.fleetFlash }; })()"))
    b.close(); print("ERRORS:", errs or "none")
