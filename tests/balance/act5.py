"""The fifth act, simulated (docs/design-notes.md, Act 5), as far as it is built: from the tank beaten (act4.py's car,
crew and wallets at the tank, seed 1), the bot buys the Fortress tab and the Rebuild, mounts the tank's cannon on the
board and races on: act4.py's bot (Hunter, the guns, the crew as the Foreman sends it, roles by the road's room) with
the cannon fired whenever it is loaded, has a shell and the reticle's car (a rival rig or the tank) is in reach. Between
races it repairs, turns the meters it doesn't need into fuel, buys the War Rig's guns and Racing, tuning and cars. Each
race: the place, totals (the rival gang's among them), scrap, shells (fired, hits, gained, left), the rival rigs (come,
totaled, their rams), the police SUVs (come, totaled), the gang's brake checks, heat, damage, tanks beaten; the loot
(parts dropped, picked up: the bot steers over a crate within 150 m on your side of the road, its hand on the wheel as
a player's would be), the board's blocks and the hold, the rig's weight and the run's meters. Between races it puts what
the hold carries on the board, front rows first, and buys Lengthen and Inventory as they come. The act's own targets (10-15 races to the
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
// the loot: steering for the nearest crate within 150 m on your side of the road, the hand on the wheel until it is
// picked up or passed (autocruise would take the lane back)
const seekLoot = () => {
  const l = run.phase === 'run' && lane <= 1 && run.loot.filter(l => !l.tried && l.z > odo + 3 && l.z - odo < 150 &&
    MY_LANES.some(x => sameLane(x, l.x))).sort((a, b) => a.z - b.z)[0];
  wheel.held = !!l;
  if (!l || !settled()) return;
  const to = MY_LANES.findIndex(x => sameLane(x, l.x));
  if (to >= 0 && to !== lane) changeLane(lane < to ? -1 : 1);
};
const habits = window.afterAids; window.afterAids = () => { habits(); seekLoot(); };
// counted for the table: the rigs that come and are totaled, their rams, the gang's totals and its brake checks
const count = (name, f) => { const was = window[name]; window[name] = function (...a) { return f(was, ...a); }; };
count('updateRigs', (f, dt) => { const had = traffic.some(c => c.rig && !c.wreck); f(dt); if (!had && traffic.some(c => c.rig && !c.wreck)) rigs++; });
count('total', (f, c, ...a) => { if (c.rig) rigsDown++; if (c.suv) suvsDown++; if (c.racer && !c.fleet) gangDown++; return f(c, ...a); });
count('updatePolice', (f, dt) => { const had = traffic.some(c => c.suv && !c.wreck); f(dt); if (!had && traffic.some(c => c.suv && !c.wreck)) suvs++; });
count('rigRam', (f, c) => { rams++; f(c); });
count('makePart', (f, ...a) => { made++; return f(...a); });
count('stow', (f, p) => { const ok = f(p); if (ok) picked++; return ok; });
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
       f"roles: {{ harvester: 17, brewer: 9, raider: 6 }}, levels: {json.dumps(START)}, ...{json.dumps(WALLETS)}, fortress: {{ parts: [], hold: [] }} }})")
    bought = js("[buy('fortressTab'), buy('rebuild')]")
    js("const f = progress.fortress; f.parts.push({ ...f.hold.shift(), x: 0, y: 0 }); 0")  # the cannon on the board
    print("the Fortress tab and the Rebuild bought:", bought, "| the cannon mounted:", js("cannonOn()"), "| points left", js("progress.points"))
    tanks0 = js("progress.tanks")
    for race in range(1, RACES + 1):
        boss = js("bossRace()")
        r = js(f"""(() => {{ {f"rng = {SEED * 1000 + race};" if SEED is not None else ""} window.nextPress = 0; reloading = 0;
                  Object.assign(window, {{ shells: 0, hits: 0, rigs: 0, rigsDown: 0, rams: 0, gangDown: 0, checks: 0, suvs: 0, suvsDown: 0, made: 0, picked: 0 }});
                  simRun({{ ...progress.levels }}, 2, 1, {{}}, true);
                  return {{ p: run.race && run.race.p, dnf: run.race && run.race.dnf, totals: run.totals, scrap: run.scrap, heat: Math.round(progress.wanted * 100),
                  dmg: Math.round(progress.damage), shells, hits, got: run.shells, left: progress.shells, rigs, rigsDown, rams, gangDown, checks, suvs, suvsDown,
                  beat: run.beatTank, tank: run.tank ? Math.round(Math.max(0, run.tank.hp ?? tankHealth())) : null, made, picked, m: run.gain }}; }})()""")
        wheel = js("wheel.held = false")
        board = js("""(() => { const f = progress.fortress; // the hold onto the board, front rows first
            for (const p of [...f.hold]) for (let y = 0, done = false; y < boardH() && !done; y++) for (let x = 0; x < boardW() && !done; x++)
              if (fitsAt(f, p.cells, x, y)) { f.parts.push({ ...p, x, y }); f.hold.splice(f.hold.indexOf(p), 1); done = true; }
            applyUpgrades();
            const by = {}; for (const p of f.parts) by[p.kind] = (by[p.kind] ?? 0) + p.cells.length;
            return [Object.entries(by).map(([k, n]) => `${k} ${n}`).join(' '), f.hold.length, Math.round(rigWeight())]; })()""")
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
            buyAll({json.dumps(WARRIG)}, true); buyAll(["lengthen", "inventory"], true); buyAll({json.dumps(FLEET)}, false); return b.filter(x => !x.startsWith('fleet') || x.startsWith('fleetP')); }})()""")
        res = ("P" + str(r["p"])) if r["p"] else r["dnf"]
        print(f"race {race:2}: {res:10} totals {r['totals']:2} (gang {r['gangDown']:2}) +{r['scrap']:4} scrap  shells {r['shells']:2} hit {r['hits']:2} "
              f"+{r['got']:2} left {r['left']:3}  rigs {r['rigs']} down {r['rigsDown']} rams {r['rams']:2}  suvs {r['suvs']} down {r['suvsDown']}  checks {r['checks']:2}  heat {r['heat']:3}%  "
              f"dmg {r['dmg']:3}% ({fixed[0]}% after repairs, {fixed[1]:,} m left)  loot +{r['made']} got {r['picked']}  board [{board[0]}] "
              f"hold {board[1]}  {board[2]:,} kg  {r['m']:,} m"
              + (f"  TANK {'beaten' if r['beat'] else str(r['tank']) + ' left'}" if boss else "") + f"  bought {' '.join(got)}")
    print(f"tanks beaten in {RACES} races: {js('progress.tanks') - tanks0} | scrap {js('progress.scrap')} | points {js('progress.points')} | crew {js('fleetSize()')}")
    b.close(); print("ERRORS:", errs or "none")
