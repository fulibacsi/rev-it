"""The fifth act, simulated (docs/design-notes.md, Act 5), as far as it is built: from the tank beaten (act4.py's car,
crew and wallets at the tank, seed 1), the bot buys the Fortress tab and the Rebuild, mounts the tank's cannon on the
board and races on: act4.py's bot (Hunter, the guns, the crew as the Foreman sends it, roles by the road's room) with
the cannon fired whenever it is loaded, has a shell and the reticle's car (a rival rig or the tank) is in reach. Between
races it repairs, turns the meters it doesn't need into fuel, buys the War Rig's guns and Racing, tuning and cars. Each
race: the place, totals (the rival gang's among them), scrap, shells (fired, hits, gained, left), the rival rigs (come,
totaled, their rams), the gang's brake checks, heat, damage, tanks beaten. The act's own targets (10-15 races to the
final fight) wait for its later layers.
Usage: act5.py [races] [seed] [overrides], the overrides JavaScript run first to try other numbers ("CANNON.damage = 300")."""
import json, sys
from playwright.sync_api import sync_playwright
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))  # tests/common.py
from common import URL, launch
# act4.py at the tank (seed 1, 30 Oct): the car, the crew, the War Rig as bought by then
START = dict(power=10, rev=4, gears=3, tyres=4, time=6, clutch=1, gas=1, shift=1, steer=1, cruise=1, engine=2, flash=5, grid=100,
             rolling=6, reckless=1, chicken=1, ecuRev=4, recklessCruise=1, cooling=3, ecuPower=4, nitro=5, fleetTab=1, fleet=82,
             harvesting=1, brewing=1, sonarRange=1, crudeTank=1, fleetPace=3, warrigTab=1, bullbar=3, armour=3, dues=3, baddrivers=4,
             hunter=1, spikes=1, pack=1, guns=1, autogun=1)
WALLETS = dict(bank=8000, points=2800, fuel=7, scrap=300)  # act4.py at the tank, its 300 scrap in
RESERVE = 3000   # meters kept back for the nitro refill and repairs
FLEET = ["dues", "fleetPace", "fleet"]
WARRIG = ["guns", "autogun", "baddrivers"]
RACES = int(sys.argv[1]) if len(sys.argv) > 1 else 10
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else None
OVERRIDES = sys.argv[3] if len(sys.argv) > 3 else ""
HABITS = """window.afterAids = () => { // act4.py's bot, and the cannon
  if (run.phase === 'run' && run.spots?.length && run.t >= (window.nextPress ?? 0)) {
    const best = bestSpot(); if (best) { run.pick = best; send(); window.nextPress = run.t + 0.25; } }
  firing = false;
  if (run.phase !== 'run' || !target || target.wreck) return;
  firing = lvl('guns') > 0 && target.z - odo < RANGE;
  const t = target; // a shell that totals it moves the reticle on
  if (!reloading && progress.shells > 0 && t.seen && t.z - odo < CANNON.reach && fireCannon()) { shells++; if (t.wreck || t.hp != null) hits++; }
};
// counted for the table: the rigs that come and are totaled, their rams, the gang's totals and its brake checks
const count = (name, f) => { const was = window[name]; window[name] = function (...a) { return f(was, ...a); }; };
count('updateRigs', (f, dt) => { const had = traffic.some(c => c.rig && !c.wreck); f(dt); if (!had && traffic.some(c => c.rig && !c.wreck)) rigs++; });
count('total', (f, c, ...a) => { if (c.rig) rigsDown++; if (c.racer && !c.fleet) gangDown++; return f(c, ...a); });
count('rigRam', (f, c) => { rams++; f(c); });
count('gangDrive', (f, c, dt) => { const was = c.stage; const on = f(c, dt); if (was !== 'cut' && c.stage === 'cut') checks++; return on; }); 0"""
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); js = pg.evaluate
    js("localStorage.clear()"); pg.reload(); pg.add_script_tag(path=str(HERE / "sim.js"))
    js("progress.toured = TUTORIALS.map(t => t.id); progress.runs = 1"); pg.click('[data-play="distance"]'); pg.click("#drive"); pg.wait_for_timeout(1500)
    js("window.RACER_BOT = window.CRASH_DAMAGE = window.SEE_AHEAD = true")
    js(HABITS)
    if OVERRIDES: js(OVERRIDES + "; 0")
    js(f"Object.assign(progress, {{ racing: true, finish: 1, gang: true, totals: 56, tanks: 1, wanted: 0, oil: 2, damage: 0, broken: [], nitro: 0, "
       f"roles: {{ harvester: 17, brewer: 9, raider: 6 }}, levels: {json.dumps(START)}, ...{json.dumps(WALLETS)}, fortress: {{ w: 1, h: 1, parts: [], hold: [] }} }})")
    bought = js("[buy('fortressTab'), buy('rebuild')]")
    js("const f = progress.fortress; f.parts.push({ ...f.hold.shift(), x: 0, y: 0 }); 0")  # the cannon on the board
    print("the Fortress tab and the Rebuild bought:", bought, "| the cannon mounted:", js("cannonOn()"), "| points left", js("progress.points"))
    tanks0 = js("progress.tanks")
    for race in range(1, RACES + 1):
        boss = js("bossRace()")
        r = js(f"""(() => {{ {f"rng = {SEED * 1000 + race};" if SEED is not None else ""} window.nextPress = 0; reloading = 0;
                  Object.assign(window, {{ shells: 0, hits: 0, rigs: 0, rigsDown: 0, rams: 0, gangDown: 0, checks: 0 }});
                  simRun({{ ...progress.levels }}, 2, 1, {{}}, true);
                  return {{ p: run.race && run.race.p, dnf: run.race && run.race.dnf, totals: run.totals, scrap: run.scrap, heat: Math.round(progress.wanted * 100),
                  dmg: Math.round(progress.damage), shells, hits, got: run.shells, left: progress.shells, rigs, rigsDown, rams, gangDown, checks,
                  beat: run.beatTank, tank: run.tank ? Math.round(Math.max(0, run.tank.hp ?? tankHealth())) : null }}; }})()""")
        js("while (repair() && progress.damage > 0);")
        fixed = js("[Math.round(progress.damage), progress.bank]")
        js(f"convert(Math.max(0, Math.floor((progress.bank - {RESERVE}) / pumpPrice())))")
        js("""(() => { const m = Math.max(30, progress.pace) * runTime(), spots = nextSpots().filter(s => s.z < m), big = biggest(), n = fleetSize();
            const room = spots.reduce((k, s) => k + cap(s), 0) * reach() / m, want = Math.min(n, Math.round(room / 1.3));
            const share = progress.crude > 0.6 * tankSize() ? 0.5 : progress.crude < 0.2 * tankSize() ? 0.25 : 0.35;
            const brew = Math.min(n - big, Math.max(Math.ceil(big * 0.6), Math.round(want * share))), harv = Math.min(n - brew, Math.max(big, want - brew));
            progress.roles = { harvester: harv, brewer: brew, raider: Math.min(n - brew - harv, 6) }; plan = null; })()""")
        got = js(f"""(() => {{ const b = [], buyAll = (ids, cheapest) => {{ for (;;) {{ const ok = ids.filter(id => !whyNot(id));
            if (!ok.length) return; const id = cheapest ? ok.sort((a, c) => cost(a) - cost(c))[0] : ok[0]; buy(id); b.push(id + lvl(id)); }} }};
            buyAll({json.dumps(WARRIG)}, true); buyAll({json.dumps(FLEET)}, false); return b.filter(x => !x.startsWith('fleet') || x.startsWith('fleetP')); }})()""")
        res = ("P" + str(r["p"])) if r["p"] else r["dnf"]
        print(f"race {race:2}: {res:10} totals {r['totals']:2} (gang {r['gangDown']:2}) +{r['scrap']:4} scrap  shells {r['shells']:2} hit {r['hits']:2} "
              f"+{r['got']:2} left {r['left']:3}  rigs {r['rigs']} down {r['rigsDown']} rams {r['rams']:2}  checks {r['checks']:2}  heat {r['heat']:3}%  "
              f"dmg {r['dmg']:3}% ({fixed[0]}% after repairs, {fixed[1]:,} m left)"
              + (f"  TANK {'beaten' if r['beat'] else str(r['tank']) + ' left'}" if boss else "") + f"  bought {' '.join(got)}")
    print(f"tanks beaten in {RACES} races: {js('progress.tanks') - tanks0} | scrap {js('progress.scrap')} | points {js('progress.points')} | crew {js('fleetSize()')}")
    b.close(); print("ERRORS:", errs or "none")
