"""The third act, simulated: the crew (26 Oct). From the first win (P1), with the car and the metres act 2 leaves, race
after race until the crew is 51: the gang (act 4). The bot drives like act2.py's and runs the crew as a sensible player
would (docs/design-notes.md, Act 3 redesign): a spot only a second after it shows on the tracker, at most 4 presses of
SEND a second, the spot ahead with the most to pay before you pass it that its free cars can fill (with Overfill, the
spare cars on the richest). Between races it turns the metres it doesn't need into fuel at the converter, keeps no
racers once the oil is on, splits the riders between harvesters and brewers by the crude in the tank, and buys the
first level of Sonar range as soon as it can, then the cheapest of the cars and the crew's upgrades (an upgrade while it
costs no more than five cars). Each race it reports the crew and its roles, the crude and fuel made, the
share of the riders' time at a spot, the fuel a car made, the runs the next car would take to pay for itself, and oil's
share of the fuel (the targets: 60-90%, 2-4 runs, two-thirds). Usage: act3.py [races] [seed] [overrides], the
overrides JavaScript run first to try other numbers ("UPGRADES.fleet.growth = 1.04")."""
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
BOT = """window.afterAids = () => { // the bot's crew, after the aids have had their say
  if (run.phase !== 'run' || !run.spots?.length) return;
  const list = spotsAhead();
  for (const s of list) s.shown ??= run.t;
  if (run.t < (window.nextPress ?? 0)) return;
  const v = Math.max(20, speed), worth = s => payRate(s) * Math.max(0, (s.z - odo) / v - arrive());
  const fits = s => { const want = s.count - s.crew - s.coming.length; return want > 0 ? want <= free(s.kind) : s.crew + s.coming.length < cap(s) && free(s.kind) > 0; };
  const open = list.filter(s => run.t - s.shown >= 1 && fits(s) && (s.kind === 'oil' || progress.crude > 0));
  const short = open.filter(s => s.crew + s.coming.length < s.count); // filling a spot comes before overfilling one
  const best = (short.length ? short : open).sort((a, b) => worth(b) - worth(a))[0];
  if (!best) return;
  run.pick = best; send(); window.nextPress = run.t + 0.25;
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
        js("""(() => { if (progress.oil < 1) return; const riders = fleetSize(); // no racers once the oil is on; brewers by the crude in the tank
            const share = progress.oil < 2 ? 0 : progress.crude > 0.6 * tankSize() ? 0.5 : progress.crude < 0.2 * tankSize() ? 0.25 : 0.35;
            progress.roles = { harvester: riders - Math.round(riders * share), brewer: Math.round(riders * share) }; plan = null; })()""")
        # buying: the first level of Sonar range as soon as it can (the tracker's reach is what the oil pays on), then the
        # cheapest of the cars and the upgrades, an upgrade only while it costs no more than five cars
        bought = js(f"""(() => {{ const b = []; for (;;) {{ const ids = {json.dumps(CREW)}.filter(id => !whyNot(id) &&
                (id === 'fleet' || id === 'fleetTab' || cost(id) <= 5 * cost('fleet') || id === 'sonarRange' && !lvl(id)));
            if (!ids.length) return b; const first = ids.includes('sonarRange') && !lvl('sonarRange') ? 'sonarRange' : null;
            const id = first ?? ids.sort((a, c) => cost(a) - cost(c))[0]; buy(id); b.push(id + lvl(id)); }} }})()""")
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
