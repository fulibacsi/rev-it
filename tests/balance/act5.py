"""The fifth act, simulated (docs/design-notes.md, Act 5), as far as it is built: from the tank beaten (act4.py's car,
crew and wallets at the tank, seed 1), the bot buys the Fortress tab and the Rebuild, mounts the tank's cannon on the
board and races on: act4.py's bot (Hunter, the guns, the crew as the Foreman sends it; on the war rig nobody races, the
oil crew set by the road's room and the rest at war) with the cannon fired whenever it is loaded, has a shell and the
reticle's car is in reach (by the Auto cannon once it has it, layer 14: bought for points when 300 are left for shells).
Between races it repairs (the rig, and the crew's wrecks the free fifth left), turns the meters it doesn't need into fuel once it has bought Lengthen, Inventory and Widen as
they come (in meters, the cheapest first; it saves up for the next of them), buys the War Rig's guns, the cannon's
Autoloader and Heavy shells, the Mine picker, the Grinder and Ram plates (layer 13, the cheapest first), the Foreman (a
level of Overfill, Double up) and the War chief (from then on it leaves the oil to the one and the raids to the other,
as a player busy with the cannon and the board would) and his Dispatch, Scavengers and Gunners (layer 13, the cheapest
first) before Racing, tuning and cars, crates of shells for points while it has fewer than 20, and, with room in the
hold, the dealer's offer worth most to it (its packing's worth) that leaves a crate's points (layer 13).

As it drives (packing is the race's, never the garage's) it puts what the hold carries on the board, armor and spikes
on the end rows first (hits come from ahead and behind) and the rest on the middle rows first, or swaps one in where
it throws off the least worth; it steers over a crate within 150 m on your side of the road (widened, it shifts over a
crate's lane and back), its hand on the wheel as a player's would be. It never dodges a spike strip, a mine, an SUV head-on
or a rocket.

Each race: the place, totals (the gang's among them, and the points their ranks paid; the gang's cars that came up
behind you, those up the shoulder, its mine-layers, their mines and those run over or picked up; its harpoon trucks,
those totaled, the parts they took and those got back), scrap; shells (fired, hits, gained, left); what the ambushes
sent (rival rigs, their War Boys' grenades, the parts they knocked out and those tapped back on; police cars, their rams
and PITs; SUVs, their slams; helicopters, their spike strips and those run over; the army's jeeps and the shots they
fired, its rocket cars, their rockets and those that hit; tanks) and how many went down; the gang's brake checks;
damage; the crew's cars wrecked (by rams, mines and hits on the deck), those back free and those repaired; the loot
(dropped, picked up, the scavengers' among them), the gunners' shots, the board's blocks and the hold, the rig's weight,
the run's meters, the cars crushed and the head-ons rammed through, the crashes the Grinder ate; the shield (the hits
on parts and on the rig, the parts shot off and worn out, the health the board has left: worn parts aren't repaired);
how often the board changed (the owner's aim: about every 5 s); the fortress's strength and the
ambushes' budget, and the race's ambushes (a faction's letter and its members, the ones never sent in brackets). Under
each race, the ledger of the currencies: what the race brought in and what went out between races, and what is left. The
act's own targets (10-15 races to the final fight) wait for its later layers.
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
SHELLS_KEEP = 300  # points kept back for crates of shells when buying the Auto cannon (layer 14)
FLEET = ["dues", "fleetPace", "fleet"]
WARRIG = ["guns", "autogun", "baddrivers"]
RACES = int(sys.argv[1]) if len(sys.argv) > 1 else 10
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else None
OVERRIDES = sys.argv[3] if len(sys.argv) > 3 else ""
HABITS = """window.afterAids = () => { // act4.py's bot, and the cannon
  if (run.phase === 'run' && run.spots?.length && run.t >= (window.nextPress ?? 0)) { // what no boss sends for it yet: the
    const best = (!warChiefOn() && raidNow()) || (!foremanOn() && bestSpot(false)) || null;  // raids the War chief's, the
    if (best) { run.pick = best; send(); window.nextPress = run.t + 0.25; } }               // oil the Foreman's
  firing = false;
  if (run.phase !== 'run' || !target || target.wreck) return;
  firing = lvl('guns') > 0 && target.z - odo < RANGE;
  const t = target; // a shell that totals it moves the reticle on
  if (!autoCannon() && !reloading && progress.shells > 0 && t.seen && t.z - odo < CANNON.reach) fireCannon(); // the Auto cannon
                                                                                                                // (layer 14) fires itself
};
// the loot: steering for the nearest crate within 150 m on your side of the road, the hand on the wheel until it is
// picked up or passed (autocruise would take the lane back)
const seekLoot = () => {
  if (rigW > 1) { // a fortress: over the crate's lane if it isn't already, else home to its side of the road
    const l = run.phase === 'run' && run.loot.filter(l => !l.tried && l.z > odo + 3 && l.z - odo < 150).sort((a, b) => a.z - b.z)[0];
    const at = l ? ROAD_LANES.findIndex(x => sameLane(x, l.x)) : -1;
    const to = at < 0 ? 0 : at < lane ? at : at > lane + rigW - 1 ? at - rigW + 1 : lane;
    if (Math.abs(carX - laneX()) < 0.3 && to !== lane) changeLane(lane < to ? -1 : 1);
    return;
  }
  const l = run.phase === 'run' && lane <= 1 && run.loot.filter(l => !l.tried && l.z > odo + 3 && l.z - odo < 150 &&
    MY_LANES.some(x => sameLane(x, l.x))).sort((a, b) => a.z - b.z)[0];
  wheel.held = !!l;
  if (!l || !settled()) return;
  const to = MY_LANES.findIndex(x => sameLane(x, l.x));
  if (to >= 0 && to !== lane) changeLane(lane < to ? -1 : 1);
};
// the board, packed as you drive (the owner, 31 Oct: never in the garage): a part from the hold every half second, the
// first that fits, the shield (armor, spikes) on the end rows first and the rest in the middle; with no room, the
// first that swaps in where it throws off the least worth, if less than its own: health, weighed by what a part is to a
// player (a cannon five times armor's: health alone threw the tank's cannon away for a fresher pair of spikes)
const WORTH = { cannon: 5, gun: 2, engine: 2, armor: 1, spikes: 1 }, worth = p => hpOf(p) * WORTH[p.kind];
const pack = () => {
  const f = progress.fortress;
  if (run.phase !== 'run' || !f.hold.length || run.t < window.packAt) return;
  window.packAt = run.t + 0.5;
  const h = boardH(), w = boardW(), ends = [...Array(h).keys()].sort((a, b) => Math.min(a, h - 1 - a) - Math.min(b, h - 1 - b));
  for (const [slot, p] of f.hold.entries()) // each part in the hold in turn: the first that goes on, or swaps in
    for (const y of ['armor', 'spikes'].includes(p.kind) ? ends : [...ends].reverse())
      for (let x = 0; x < w; x++) if (fitsAt(f, p.cells, x, y)) { mount(slot, x, y); mounts++; return; }
  for (const [slot, p] of f.hold.entries()) {
    let best = null;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (onBoard(p.cells, x, y) && under(f, p.cells, x, y).every(i => live(f.parts[i]))) {
      const lost = under(f, p.cells, x, y).reduce((k, i) => k + worth(f.parts[i]), 0); // never over one knocked out
      if (!best || lost < best.lost) best = { x, y, lost };
    }
    if (best && best.lost < worth(p)) { mount(slot, best.x, best.y); swaps++; return; }
  }
};
// the War Boys' grenades (layer 11): a part knocked out is tapped back on a second later, as a player's thumb would
const untap = () => { for (const [p, t] of jammed) if (EMP.secs - t >= 1) { restart(p); taps++; } };
const habits = window.afterAids; window.afterAids = () => { habits(); seekLoot(); pack(); untap(); };
// counted for the table: the rigs that come and are totaled, their grenades, the gang's totals and its brake checks
const count = (name, f) => { const was = window[name]; window[name] = function (...a) { return f(was, ...a); }; };
count('sendRig', f => { const ok = f(); if (ok) rigs++; return ok; }); // the ambushes' (fortress.js), as they come
count('fireCannon', f => { const t = target, ok = f(); if (ok) { shells++; if (t && (t.wreck || t.hp != null)) hits++; } return ok; }); // the bot's or the Auto cannon's
count('total', (f, c, ...a) => { if (c.rig) rigsDown++; if (c.suv) suvsDown++; if (c.heli) helisDown++; if (c.racer && !c.fleet) gangDown++;
  if (c.harpoon) { harpoonsDown++; if (c.prize) recovered++; } if (c.jeep) jeepsDown++; if (c.rocket) rocketCarsDown++;
  if (a[1] === 'CRUSHED') crushed++; if (a[1] === 'RAMMED THROUGH') through++; return f(c, ...a); });
count('sendCop', (f, suv) => { const ok = f(suv); if (ok && suv) suvs++; if (ok && !suv) cops++; return ok; });
count('sendTank', f => { const ok = f(); if (ok) tanks++; return ok; }); count('tankDown', (f, c) => { tanksDown++; return f(c); });
count('lob', (f, c) => { lobbed++; f(c); });
count('blast', (f, at) => { const n = jammed.size; f(at); knocked += jammed.size - n; });
count('makePart', (f, ...a) => { made++; return f(...a); });
count('stow', (f, p) => { const ok = f(p); if (ok) picked++; return ok; });
count('gangDrive', (f, c, dt) => { const was = c.stage; const on = f(c, dt); if (was !== 'cut' && c.stage === 'cut') checks++; return on; });
// the shield: the hits a part took, those that reached the rig, the parts that fell off
count('hitCell', (f, ...a) => { f(...a); struck.part ? onParts++ : onRig++; });
// the police's helicopters: come, shot down, their spike strips and those run over; its cars' rams and PITs, its SUVs'
// slams (layer 10)
count('sendHeli', f => { const ok = f(); if (ok) helis++; return ok; });
count('dropStrip', (f, c) => { dropped++; return f(c); });
let mining = false; // the gang's mines (layer 11) are run over through the same runOver as the strips
count('mineTick', f => { mining = true; const r = f(); mining = false; return r; });
count('runOver', (f, ...a) => { const ok = f(...a); if (ok && !rocketing) mining ? minesHit++ : ranOver++; return ok; });
count('minerDrive', (f, c, dt) => { const d = c.dropped; const r = f(c, dt); laid += c.dropped - d; return r; });
count('sendMiner', f => { const ok = f(); if (ok) miners++; return ok; });
count('sendHarpoon', f => { const ok = f(); if (ok) harpoons++; return ok; });
count('fireHarpoon', (f, c) => { const n = progress.fortress.parts.length; f(c); if (progress.fortress.parts.length < n) stolen++; });
count('sendChaser', f => { const up = sideLane() == null; const ok = f(); if (ok) { chasers++; if (up) shoulders++; } return ok; });
count('copRam', (f, c, pit) => { pit ? pits++ : copRams++; f(c, pit); });
// the crew sent: by the Foreman or the War chief (his Dispatch, layer 13), or by the bot's SEND, and the raiders among them
count('send', (f, s, quiet) => { const t = s ?? run.pick, ok = f(s, quiet); if (ok) { sent++; if (quiet) dispatched++; if (t?.kind === 'raid') raidsSent++; } return ok; });
// the front (layer 13): mines picked up for shells; crashes at the front the Grinder ate
count('pickMine', (f, m) => { const s = progress.shells; f(m); if (progress.shells > s) minesPicked++; });
count('hurt', (f, i) => { if (ground() && (i.plow || i.headOn || !i.side)) eaten++; f(i); });
// the crew's jobs (layer 13): crates the scavengers brought in, the gunners' shots
count('scavDrive', (f, c, dt) => { const l = c.scav, was = l.tried; f(c, dt); if (!was && l.tried && l.got) fetched++; });
count('crewJobs', (f, dt) => { const g = run.gunners; f(dt); if (run.gunners === GUNNERS.every && g !== GUNNERS.every) gunShots++; });
count('slam', (f, c) => { slams++; f(c); });
count('crewHit', (f, hp, c) => { const n = run.wrecked; f(hp, c); if (run.wrecked > n) !c ? byDeck++ : hp === WRECK.hp ? byMine++ : byRam++; }); // crew wrecks
// the army (layer 12): its jeeps and their shots, its rocket cars and their rockets, those that hit (through runOver,
// as the strips: not counted there)
count('sendJeep', f => { const ok = f(); if (ok) jeeps++; return ok; });
count('jeepFire', (f, c) => { jeepShots++; f(c); });
count('sendRocket', f => { const ok = f(); if (ok) rocketCars++; return ok; });
let rocketing = false;
count('landRocket', (f, r) => { rocketing = true; const hit = f(r); rocketing = false; rocketsFired++; if (hit) rocketHits++; return hit; });
count('fallOff', (f, i, how) => { const p = progress.fortress.parts[i]; (how === 'WORN OUT' ? wornOut : fell).push(p.kind + ' ' + p.cells.length); f(i, how); }); 0"""
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
    WALLET = "({ bank: progress.bank, points: progress.points, fuel: progress.fuel, scrap: progress.scrap, crude: progress.crude })"
    for race in range(1, RACES + 1):
        amb = js("[+strength().toFixed(1), +budget().toFixed(1)]")  # what the race's ambushes are drawn from
        w0 = js(WALLET)
        r = js(f"""(() => {{ {f"rng = {SEED * 1000 + race};" if SEED is not None else ""} window.nextPress = 0; reloading = 0;
                  Object.assign(window, {{ shells: 0, hits: 0, rigs: 0, rigsDown: 0, lobbed: 0, knocked: 0, taps: 0, gangDown: 0, checks: 0, suvs: 0, suvsDown: 0, made: 0, picked: 0, crushed: 0, through: 0, onParts: 0, onRig: 0, fell: [], helis: 0, helisDown: 0, dropped: 0, ranOver: 0, copRams: 0, pits: 0, slams: 0, miners: 0, laid: 0, minesHit: 0, chasers: 0, shoulders: 0, harpoons: 0, harpoonsDown: 0, stolen: 0, recovered: 0, mounts: 0, swaps: 0, packAt: 0, wornOut: [], tanks: 0, tanksDown: 0, cops: 0, jeeps: 0, jeepsDown: 0, jeepShots: 0, rocketCars: 0, rocketCarsDown: 0, rocketsFired: 0, rocketHits: 0, minesPicked: 0, eaten: 0, fetched: 0, gunShots: 0, sent: 0, dispatched: 0, raidsSent: 0, byRam: 0, byMine: 0, byDeck: 0 }});
                  const war0 = role('raider'); simRun({{ ...progress.levels }}, 2, 1, {{}}, true);
                  return {{ p: run.race && run.race.p, dnf: run.race && run.race.dnf, totals: run.totals, scrap: run.scrap, ranks: run.ranks, ambushes: ambushes.map(a => a.faction[0] + a.members.length + (a.sent < a.members.length ? '(' + a.sent + ')' : '')).join(' '),
                  dmg: Math.round(progress.damage), shells, hits, got: run.shells, left: progress.shells, rigs, rigsDown, lobbed, knocked, taps, gangDown, checks, suvs, suvsDown,
                  tanks, tanksDown, cops, made, picked, m: run.gain, crushed, through, w: rigW, onParts, onRig, fell, wornOut, helis, helisDown, dropped, ranOver, copRams, pits, slams, miners, laid, minesHit, chasers, shoulders, harpoons, harpoonsDown, stolen, recovered, mounts, swaps, jeeps, jeepsDown, jeepShots, rocketCars, rocketCarsDown, rocketsFired, rocketHits, minesPicked, eaten, fetched, gunShots, sent, dispatched, raidsSent, secs: runTime(), wrecked: run.wrecked, byRam, byMine, byDeck, back: run.crewBack, down: progress.crewDown, war: war0,
                  worn: Math.round(100 * progress.fortress.parts.reduce((k, p) => k + hpOf(p), 0) / Math.max(1, progress.fortress.parts.reduce((k, p) => k + fullHp(p), 0))) }}; }})()""")
        w1 = js(WALLET)  # the race's takings: meters (the run's, the crew's racing, less the nitro), points, refined fuel, scrap
        wheel = js("wheel.held = false")
        js("while (repair() && progress.damage > 0);")
        crewFix = js("fixCrew() / WRECK.cost")  # the crew's wrecks the free fifth left, repaired with the rig
        fixed = js("[Math.round(progress.damage), progress.bank]")
        w2 = js(WALLET)
        sizes = js(f"""(() => {{ const b = []; for (;;) {{ // the fortress's size first, in meters (layer 13), the reserve kept: then the pump
            const ok = ["lengthen", "inventory", "widen"].filter(id => !whyNot(id) && cost(id) <= progress.bank - {RESERVE}).sort((a, c) => cost(a) - cost(c));
            if (!ok.length) return b; buy(ok[0]); b.push(ok[0] + lvl(ok[0])); }} }})()""")
        w2b = js(WALLET)
        # the rest into fuel, but for what the next size costs: saved up for it (a size dearer than a race's meters was never bought)
        js(f"""(() => {{ const next = Math.min(...["lengthen", "inventory", "widen"].filter(id => lvl(id) < maxOf(UPGRADES[id])).map(cost));
            convert(Math.max(0, Math.floor((progress.bank - {RESERVE} - (isFinite(next) ? next : 0)) / pumpPrice()))); }})()""")
        w3 = js(WALLET)
        js("""(() => { const m = Math.max(30, progress.pace) * runTime(), spots = nextSpots().filter(s => s.z < m), big = biggest(), n = fleetSize();
            const room = spots.reduce((k, s) => k + cap(s), 0) * reach() / m, want = Math.min(n, Math.round(room / 1.3));
            const share = progress.crude > 0.6 * tankSize() ? 0.5 : progress.crude < 0.2 * tankSize() ? 0.25 : 0.35;
            const brew = Math.min(n - big, Math.max(Math.ceil(big * 0.6), Math.round(want * share))), harv = Math.min(n - brew, Math.max(big, want - brew));
            progress.roles = { harvester: harv, brewer: brew, raider: 0 }; plan = null; })()""")  # the rest at war, raiders (the rig's roles)
        got = js(f"""(() => {{ const b = [], buyAll = (ids, cheapest) => {{ for (;;) {{ const ok = ids.filter(id => !whyNot(id));
            if (!ok.length) return; const id = cheapest ? ok.sort((a, c) => cost(a) - cost(c))[0] : ok[0]; buy(id); b.push(id + lvl(id)); }} }};
            buyAll({json.dumps(WARRIG)}, true); buyAll(["autoloader", "heavyShells", "minePicker", "grinder", "ramPlates"], true);
            if (!whyNot('autocannon') && progress.points - cost('autocannon') >= {SHELLS_KEEP}) {{ buy('autocannon'); b.push('autocannon1'); }} // layer 14
            if (!lvl('overfill') && !whyNot('overfill')) {{ buy('overfill'); b.push('overfill1'); }} // the Foreman's way to Dispatch (layer 13)
            buyAll(["doubleUp", "foreman", "warChief", "workRate", "scavengers", "gunners"], true); buyAll({json.dumps(FLEET)}, false);
            let crates = 0; while (progress.shells < 20 && buyShells()) crates++; // the cannon's: 20 for a race
            // the dealer (layer 13): with room in the hold, the offer worth most to it (as it packs: a cannon five times
            // armor) that leaves a crate of shells' points
            const d = dealer(), w = p => hpOf(p) * {{ cannon: 5, gun: 2, engine: 2, armor: 1, spikes: 1 }}[p.kind];
            const deal = !d.sold && progress.fortress.hold.length < holdSize() && d.offers.map((p, i) => [i, p])
              .filter(([, p]) => dealPrice(p) <= progress.points - SHELLS.price).sort((x, y) => w(y[1]) - w(x[1]))[0];
            const dealt = deal && buyDeal(deal[0]) ? [`deal:${{deal[1].kind}}${{deal[1].cells.length}}@${{dealPrice(deal[1])}}`] : [];
            return [...b.filter(x => !x.startsWith('fleet') || x.startsWith('fleetP')), ...crates ? [`shells+${{10 * crates}}`] : [], ...dealt]; }})()""")
        board = js("""(() => { const f = progress.fortress, by = {}; // the board after the race (packing is the race's)
            for (const p of f.parts) by[p.kind] = (by[p.kind] ?? 0) + p.cells.length;
            return [Object.entries(by).map(([k, n]) => `${k} ${n}`).join(' '), f.hold.length, Math.round(rigWeight())]; })()""")
        moves = r["mounts"] + r["swaps"] + len(r["fell"]) + len(r["wornOut"])
        w4 = js(WALLET)
        ledger = (f"meters +{w1['bank'] - w0['bank']:,} repairs -{w1['bank'] - w2['bank']:,} sizes -{w2['bank'] - w2b['bank']:,} to fuel -{w2b['bank'] - w3['bank']:,} "
                  f"cards -{w3['bank'] - w4['bank']:,} left {w4['bank']:,} | points +{w1['points'] - w0['points']:,} cards -{w3['points'] - w4['points']:,} "
                  f"left {w4['points']:,} | fuel +{w1['fuel'] - w0['fuel']:.1f} refined +{w3['fuel'] - w2['fuel']:.0f} bought cards -{w3['fuel'] - w4['fuel']:.1f} "
                  f"left {w4['fuel']:.1f} | scrap +{w1['scrap'] - w0['scrap']:,} cards -{w3['scrap'] - w4['scrap']:,} left {w4['scrap']:,}")
        res = ("P" + str(r["p"])) if r["p"] else r["dnf"]
        print(f"race {race:2}: {res:10} totals {r['totals']:2} (gang {r['gangDown']:2}, ranks +{r['ranks']:4} pts; gang cars {r['chasers']} ({r['shoulders']} up the shoulder), mine-layers {r['miners']}, mines {r['laid']} hit {r['minesHit']} picked {r['minesPicked']}; harpoons {r['harpoons']} down {r['harpoonsDown']}, parts taken {r['stolen']} back {r['recovered']}) +{r['scrap']:4} scrap  shells {r['shells']:2} hit {r['hits']:2} "
              f"+{r['got']:2} left {r['left']:3}  rigs {r['rigs']} down {r['rigsDown']} grenades {r['lobbed']:2} knocked out {r['knocked']:2} tapped {r['taps']:2}  suvs {r['suvs']} down {r['suvsDown']} slams {r['slams']}  helis {r['helis']} down {r['helisDown']} strips {r['dropped']} run over {r['ranOver']}  jeeps {r['jeeps']} down {r['jeepsDown']} shots {r['jeepShots']:3}  rocket cars {r['rocketCars']} down {r['rocketCarsDown']} rockets {r['rocketsFired']:2} hit {r['rocketHits']:2}  tanks {r['tanks']} down {r['tanksDown']}  cops {r['cops']} rams {r['copRams']} PITs {r['pits']}  checks {r['checks']:2}  "
              f"dmg {r['dmg']:3}% ({fixed[0]}% after repairs, {fixed[1]:,} m left)  crew wrecked {r['wrecked']:2} of {r['war']} at war (rams {r['byRam']}, mines {r['byMine']}, the deck {r['byDeck']}) back free {r['back']} repaired {crewFix:.0f}  loot +{r['made']} got {r['picked']} (scavenged {r['fetched']})  gunners' shots {r['gunShots']}  sent {r['sent']} (by the bosses {r['dispatched']}), raiders {r['raidsSent']}  board [{board[0]}] "
              f"hold {board[1]}  {board[2]:,} kg  {r['m']:,} m  {r['w']} wide, crushed {r['crushed']} through {r['through']} ground {r['eaten']}  "
              f"hits on parts {r['onParts']:2} on the rig {r['onRig']:2}, lost [{', '.join(r['fell'])}] worn out [{', '.join(r['wornOut'])}], health left {r['worn']}%  "
              f"packed: {r['mounts']} on, {r['swaps']} swapped" + (f" (the board changed every {r['secs'] / moves:.0f} s)" if moves else "")
              + f"  strength {amb[0]} budget {amb[1]}: ambushes [{r['ambushes']}]  bought {' '.join(sizes + got)}")
        print("          " + ledger)
    print(f"tanks beaten in {RACES} races: {js('progress.tanks') - tanks0} | scrap {js('progress.scrap')} | points {js('progress.points')} | crew {js('fleetSize()')}")
    b.close(); print("ERRORS:", errs or "none")
