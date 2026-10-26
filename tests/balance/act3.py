"""The third act, simulated: the crew (26 Oct). From the first win (P1), with the car and the metres act 2 leaves, race
after race until the crew is 51: the gang (act 4). The bot drives like act2.py's and runs the crew as a sensible player
would (docs/design-notes.md, Act 3 redesign), with oil.js's bestSpot: at most 4 presses of SEND a second, a spot only a
second after it shows on the tracker, the one ahead with the most to pay before you pass it that its free cars can fill
(with Overfill, the spare cars on the richest). Between races it turns the metres it doesn't need into fuel at the
converter; once the oil is on it rides as many cars as the next run's road has room for (1.3 places in reach a car)
and races the rest, with enough harvesters and brewers for the biggest spots and more brewers with crude in the tank;
it saves for the first levels of Harvesting and Sonar range, buys a bigger tank when it ended a run full, and otherwise
the cheapest of the cars and the crew's upgrades (an upgrade while it costs no more than five cars). Each race it
reports the crew and its roles, the crude and fuel made, the share of the riders' time at a spot, the fuel a car made,
the runs the next car would take to pay for itself, and oil's share of the fuel (the targets: 60-90%, 2-4 runs,
two-thirds). Usage: act3.py [races] [seed] [overrides], the overrides JavaScript run first to try other numbers
("UPGRADES.fleet.growth = 1.04")."""
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
CREW = ["fleetTab", "fleet", "harvesting", "brewing", "sonarRange", "crudeTank", "wells", "overfill", "doubleUp", "fleetPace"]
GOAL = 51        # crew: the gang
RACES = int(sys.argv[1]) if len(sys.argv) > 1 else 60
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else None
OVERRIDES = sys.argv[3] if len(sys.argv) > 3 else ""
BOT = """window.afterAids = () => { // the bot's crew, after the aids have had their say: at most 4 presses a second
  if (run.phase !== 'run' || !run.spots?.length || run.t < (window.nextPress ?? 0)) return;
  const best = bestSpot();
  if (best) { run.pick = best; send(); window.nextPress = run.t + 0.25; }
}; 0"""
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); js = pg.evaluate
    js("localStorage.clear()"); pg.reload(); pg.add_script_tag(path=str(HERE / "sim.js")); js("progress.toured = TUTORIALS.map(t => t.id); progress.runs = 1"); pg.click('[data-play="distance"]'); pg.click("#drive"); pg.wait_for_timeout(1500)  # a game under way: a new one skips the garage
    if OVERRIDES: js(OVERRIDES + "; 0")
    js(BOT)
    js(f"window.RACER_BOT = true; Object.assign(progress, {{ racing: true, finish: 1, points: 0, bank: {BANK}, fuel: 0, crude: 0, oil: 0, roles: {{ harvester: 0, brewer: 0 }}, damage: 0, broken: [], nitro: 0, levels: {json.dumps(ACT2)} }})")
    for race in range(1, RACES + 1):
        lv = {**ACT2, **js("({ ...progress.levels })")}
        # each race's traffic from a seed of its own, set in the same call: the page's own loop draws on it between calls
        js(f"{f'rng = {SEED * 1000 + race}; ' if SEED is not None else ''}window.nextPress = 0; simRun({json.dumps(lv)}, 2, 1, {{}}, true)")
        r = js("""({ p: run.race && run.race.p, dnf: run.race && run.race.dnf, m: run.gain, team: run.team, dues: run.dues, crude: run.crude, fuel: run.fuel,
                  riders: riders(), worked: run.worked, t: runTime() - run.left, oil: progress.oil, tank: progress.crude })""")
        js("while (repair() && progress.damage > 0);")  # metres pay the repairs
        got = js(f"(() => {{ const n = Math.max(0, Math.floor((progress.bank - {RESERVE}) / pumpPrice())); convert(n); return n; }})()")
        # the roles, once the oil is on (the script's until then): as many riders as the next run's road has room for (the
        # places in the tracker's reach, 1.3 a car), the rest racing; enough harvesters for the biggest oil spot and
        # brewers for the biggest refinery, more brewers with crude in the tank
        if r["oil"] >= 2: js("""(() => { const m = Math.max(30, progress.pace) * runTime(), spots = nextSpots().filter(s => s.z < m), big = biggest(), n = fleetSize();
            const room = spots.reduce((k, s) => k + cap(s), 0) * reach() / m, want = Math.min(n, Math.round(room / 1.3));
            const share = progress.crude > 0.6 * tankSize() ? 0.5 : progress.crude < 0.2 * tankSize() ? 0.25 : 0.35;
            const brew = Math.min(n - big, Math.max(Math.ceil(big * 0.6), Math.round(want * share)));
            progress.roles = { harvester: Math.min(n - brew, Math.max(big, want - brew)), brewer: brew }; plan = null; })()""")
        # buying: saving for the first levels of Harvesting and Sonar range (it needs Harvesting) once the oil is on (the room
        # it brings), a bigger tank when it
        # ended the run full, then the cheapest of the cars and the upgrades, an upgrade only while it costs no more than
        # five cars
        bought = js(f"""(() => {{ const b = [], ok = id => !whyNot(id), get = id => {{ buy(id); b.push(id + lvl(id)); }};
            for (;;) {{
              const save = progress.oil >= 2 && ['harvesting', 'sonarRange'].find(id => !lvl(id));
              if (save) {{ if (ok(save)) {{ get(save); continue; }} return b; }}
              if (progress.crude >= 0.9 * tankSize() && ok('crudeTank') && !b.some(x => x.startsWith('crudeTank'))) {{ get('crudeTank'); continue; }}
              const ids = {json.dumps(CREW)}.filter(id => ok(id) && (id === 'fleet' || id === 'fleetTab' || cost(id) <= 5 * cost('fleet')));
              if (!ids.length) return b; get(ids.sort((a, c) => cost(a) - cost(c))[0]); }} }})()""")
        crew, price = js("[lvl('fleet'), cost('fleet')]")
        use = r["worked"] / (r["riders"] * r["t"]) if r["riders"] and r["t"] else 0
        per = r["fuel"] / r["riders"] if r["riders"] else 0
        share = r["fuel"] / (r["fuel"] + got) if r["fuel"] + got else 0
        res = ("P" + str(r["p"])) if r["p"] else r["dnf"]
        print(f"race {race:2}: {res:5} {r['m']:5} m  crew {crew:2} (h{js('progress.roles.harvester'):2} b{js('progress.roles.brewer'):2})  crude +{r['crude']:5.1f} tank {r['tank']:5.1f}"
              f"  fuel +{r['fuel']:5.1f} +{got:3} conv  at work {use:4.0%}  {per:4.2f} L a car  payback {price / per if per else 0:4.1f}  oil {share:4.0%}"
              f"  bought {' '.join(bought)}")
        if crew >= GOAL: print(f"{GOAL} crew after {race} races"); break
    else: print(f"fewer than {GOAL} crew after {RACES} races")
    print("levels:", js(f"Object.fromEntries({json.dumps(CREW)}.map(id => [id, lvl(id)]))"))
    b.close(); print("ERRORS:", errs or "none")
