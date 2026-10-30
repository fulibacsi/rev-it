"""The fourth act, simulated: from the gang (51 crew, the car and crew as act 3 leaves them) to beating the tank.
The bot drives like act2.py's (Reckless auto-drive) with War Rig habits on top: within 150 m of the car in the reticle
it takes the wheel, moves into that car's lane and rams it (the aids would brake or steer round), unless its own car is
past 60% damage, and once it has Hunter, the aid that does the same, it leaves that to the aid; it holds the trigger whenever the reticle's car is in reach (the tank too, which it doesn't ram).
It runs the crew as act3.py's bot does (the oil runs on through act 4: the owner, 27 Oct): sends with oil.js's
bestSpot (raiders at the car in the reticle first, once it has the Raiders card), and splits the roles before each race
by the room on the road, up to 6 raiders, the rest racing. After each race:
meters pay the repairs and the rest becomes fuel at the pump price; fuel buys Racing and tuning first, then more cars;
scrap buys the War Rig upgrades, the cheapest first (Auto gun too: it fires no more than the bot already does, but a
phone player would buy it). Usage: act4.py [races] [seed] [overrides], the overrides
some JavaScript run first to try other numbers, such as "SCRAP.car = 20; UPGRADES.guns.base = 80"."""
import json, sys
from playwright.sync_api import sync_playwright
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))  # tests/common.py
from common import URL, launch
# the car and crew as act3.py leaves them (27 Oct, seed 1): act 2's car, 51 crew, the oil's first upgrades, tuning 1
START = dict(power=10, rev=4, gears=3, tyres=4, time=6, clutch=1, gas=1, shift=1, steer=1, cruise=1, engine=2, flash=5, grid=100,
             rolling=6, reckless=1, chicken=1, ecuRev=4, recklessCruise=1, cooling=3, ecuPower=4, nitro=5,
             fleetTab=1, fleet=51, harvesting=1, brewing=1, sonarRange=1, crudeTank=1, fleetPace=1)
RESERVE = 3000   # meters kept back for the nitro refill and repairs
FLEET = ["dues", "fleetPace", "fleet"]
WARRIG = ["warrigTab", "bullbar", "armour", "spikes", "guns", "autogun", "baddrivers", "hunter", "pack"]  # the tab first
RACES = int(sys.argv[1]) if len(sys.argv) > 1 else 60
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else None
OVERRIDES = sys.argv[3] if len(sys.argv) > 3 else ""
HABITS = """window.afterAids = () => { // the bot's War Rig habits, after the aids have had their say
  if (run.phase === 'run' && run.spots?.length && run.t >= (window.nextPress ?? 0)) { // the crew, as act3.py's bot sends it
    const best = bestSpot();                                                            // (the oil runs on: 27 Oct)
    if (best) { run.pick = best; send(); window.nextPress = run.t + 0.25; }
  }
  firing = false; wheel.held = false;
  if (run.phase !== 'run' || !target || target.wreck) return;
  const d = target.z - odo;
  firing = lvl('guns') > 0 && d < RANGE;
  if (aid('hunter') || target.tank || target.dir < 0 || d > 150 || progress.damage > 60) return; // Hunter: the aid hunts
  wheel.held = true; // its own hand on the wheel: the aids keep off the wheel and the brake
  const tl = MY_LANES.findIndex(x => sameLane(x, target.x));
  if (tl >= 0 && tl !== lane && Math.abs(carX - ROAD_LANES[lane]) < 0.3) changeLane(lane < tl ? -1 : 1);
}; 0"""
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); js = pg.evaluate
    js("localStorage.clear()"); pg.reload(); pg.add_script_tag(path=str(HERE / "sim.js")); js("progress.toured = TUTORIALS.map(t => t.id); progress.runs = 1"); pg.click('[data-play="distance"]'); pg.click("#drive"); pg.wait_for_timeout(1500)  # a game under way: a new one skips the garage
    js("window.RACER_BOT = window.CRASH_DAMAGE = window.SEE_AHEAD = true")
    js(HABITS)
    if OVERRIDES: js(OVERRIDES + "; 0")
    js(f"Object.assign(progress, {{ racing: true, finish: 1, points: 0, bank: {RESERVE}, fuel: 0, oil: 2, roles: {{ harvester: 20, brewer: 8 }}, scrap: 0, totals: 0, wanted: 0, tanks: 0, damage: 0, broken: [], nitro: 0, levels: {json.dumps(START)} }})")
    for race in range(1, RACES + 1):
        boss = js("bossRace()")
        # each race's traffic from a seed of its own, and what it did read in the same call: the page's own loop draws on
        # the seed and moves on between calls, so the results would move with the machine's load
        r = js(f"""(() => {{ {f"rng = {SEED * 1000 + race};" if SEED is not None else ""} window.nextPress = 0; simRun({{ ...progress.levels }}, 2, 1, {{}}, true);
                  return {{ p: run.race && run.race.p, dnf: run.race && run.race.dnf, totals: run.totals, scrap: run.scrap, heat: Math.round(progress.wanted * 100),
                  dmg: Math.round(progress.damage), tank: run.tank ? Math.round(Math.max(0, run.tank.hp ?? tankHealth())) : null, beat: run.beatTank,
                  hit: run.race && run.race.dnf === 'head-on' ? (impact.car.police ? 'police' : 'traffic') : '', fuel: run.fuel }}; }})()""")
        js("while (repair() && progress.damage > 0);")  # meters pay the repairs
        js(f"convert(Math.max(0, Math.floor((progress.bank - {RESERVE}) / pumpPrice())))")
        # the roles as act3.py's bot splits them: as many riders as the road has room for, the rest racing (the gang)
        js("""(() => { const m = Math.max(30, progress.pace) * runTime(), spots = nextSpots().filter(s => s.z < m), big = biggest(), n = fleetSize();
            const room = spots.reduce((k, s) => k + cap(s), 0) * reach() / m, want = Math.min(n, Math.round(room / 1.3));
            const share = progress.crude > 0.6 * tankSize() ? 0.5 : progress.crude < 0.2 * tankSize() ? 0.25 : 0.35;
            const brew = Math.min(n - big, Math.max(Math.ceil(big * 0.6), Math.round(want * share))), harv = Math.min(n - brew, Math.max(big, want - brew));
            const raid = lvl('pack') ? Math.min(n - brew - harv, 6) : 0; // raiders: three on the car, three coming and going
            progress.roles = { harvester: harv, brewer: brew, raider: raid }; plan = null; })()""")
        bought = js(f"""(() => {{ const b = [], buyAll = (ids, cheapest) => {{ for (;;) {{ const ok = ids.filter(id => !whyNot(id));
            if (!ok.length) return; const id = cheapest ? ok.sort((a, c) => cost(a) - cost(c))[0] : ok[0]; buy(id); b.push(id + lvl(id)); }} }};
            buyAll({json.dumps(WARRIG)}, true); buyAll({json.dumps(FLEET)}, false); return b.filter(x => !x.startsWith('fleet') || x.startsWith('fleetP')); }})()""")
        fleet = js("lvl('fleet')")
        res = ("P" + str(r["p"])) if r["p"] else r["dnf"] + (f" ({r['hit']})" if r["hit"] else "")
        print(f"race {race:2}: {res:18} totals {r['totals']:2} +{r['scrap']:3} scrap  heat {r['heat']:3}%  dmg {r['dmg']:3}%  fleet {fleet:2}  fuel +{r['fuel']:4.1f}"
              + (f"  TANK {'beaten' if r['beat'] else str(r['tank']) + ' left'}" if boss else "") + f"  bought {' '.join(bought)}")
        if r["beat"]: print(f"tank beaten in race {race}"); break
    else: print(f"no tank beaten in {RACES} races")
    print("levels:", js("(() => { const l = progress.levels; return { bullbar: l.bullbar, armour: l.armour, spikes: l.spikes, guns: l.guns, fleet: l.fleet }; })()"),
          "| scrap left", js("progress.scrap"), "| totals", js("progress.totals"))
    b.close(); print("ERRORS:", errs or "none")
