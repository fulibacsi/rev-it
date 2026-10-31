"""Act 5's police helicopters (docs/design-notes.md, Act 5, layer 7): on the war rig, from half heat, one at a time and
never in the tank's race, a helicopter flies in from up the road and hovers ahead, over the traffic (no car brakes
behind it). It is notable: in the reticle with its tag, its tutorial popping up. Its searchlight picks one of the
fortress's lanes; a beat later a burst walks down it, dust and tracers, and its rounds hit the board's column over
that lane front to back (STRAFED), a part taking its share and an empty cell letting it through to the rig; off the
lane, they all miss (DODGED). Shot down it falls onto the road: its scrap, and its gun or its turbine as loot. A
triangle on the sonar; a mounted turbine heard. Phone and desktop."""
import json
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
LEVELS = dict(workshopTab=1, autopilotTab=1, blackTab=1, fleetTab=1, warrigTab=1, fortressTab=1, rebuild=1, lengthen=2, widen=1,
              power=10, rev=4, gears=3, tyres=4, time=6, clutch=1, gas=1, shift=1, steer=1, cruise=1, autoflash=1, engine=2, flash=5,
              grid=100, rolling=6, reckless=1, chicken=1, ecuRev=4, recklessCruise=1, cooling=3, ecuPower=4, nitro=5, fleet=80,
              bullbar=3, armour=3, spikes=1, guns=1, autogun=1, hunter=1, pack=1, dues=3, fleetPace=3)
# two lanes wide, three rows: the cannon at the left front, a line of armor down the right
BOARD = dict(parts=[dict(kind="cannon", cells=[[0, 0]], x=0, y=0), dict(kind="armor", cells=[[0, 0], [0, 1], [0, 2]], x=1, y=0)], hold=[])
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
# the road cleared but for what a check puts there: the traffic oncoming far off, the racers far behind, the clocks held
CLEAR = "traffic.forEach((c, i) => { if (!c.racer && !c.fleet) Object.assign(c, { dir: -1, x: LANES.oncoming[i % 2], z: odo + 1500 + 40 * i, " \
        "rig: false, police: false, suv: false, heli: false, alt: undefined, hp: null, wreck: false, swerve: null }); else if (c.racer) c.z = odo - 3000; }); " \
        "target = quarry = null; rigClock = gangClock = copClock = heliClock = 1e9; run.loot = []"
HELI = "traffic.find(c => c.heli && !c.wreck)"
# a burst, frame by frame within one call (the page's own loop can't step in between): from the searchlight on
BURST = "(x => { const c = " + HELI + "; Object.assign(c, { stage: 'aim', t: 0.01, aim: x }); for (let i = 0; i < 120; i++) heliDrive(c, 1 / 60); return c; })"
HP = "progress.fortress.parts.map(p => p.kind + ' ' + hpOf(p))"
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    for layout in ["phone", "desktop"]:
        phone = layout == "phone"
        ctx = b.new_context(**(dict(viewport={"width": 844, "height": 390}, device_scale_factor=2, is_mobile=True, has_touch=True)
                               if phone else dict(viewport={"width": 1440, "height": 900})))
        pg = ctx.new_page(); js = pg.evaluate; pg.on("pageerror", lambda e: errors.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(URL); js("localStorage.clear()")
        js(f"Object.assign(progress, {{ racing: true, finish: 1, gang: true, totals: 60, tanks: 1, oil: 2, runs: 80, races: 60, bank: 9000, "
           f"points: 5000, scrap: 2000, shells: 10, damage: 0, wanted: 0.4, fortress: {json.dumps(BOARD)}, "
           f"roles: {{ harvester: 17, brewer: 9, raider: 6 }}, levels: {json.dumps(LEVELS)}, "
           f"toured: TUTORIALS.map(t => t.id).filter(id => id !== 'heli') }}); save()")
        if phone: js("settings.layout = 'touch'; applyLayout()")
        pg.click('[data-play="distance"]'); pg.wait_for_timeout(300)
        pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=20000)
        js(CLEAR); pg.wait_for_timeout(200)

        # 1. when one comes: from half heat, one at a time, not in the tank's race
        got = js("""(() => { const at = []; heliClock = 0; updateHeli(0.01); at.push(traffic.some(c => c.heli));
            progress.wanted = 0.6; run.boss = true; heliClock = 0; updateHeli(0.01); at.push(traffic.some(c => c.heli)); run.boss = false;
            heliClock = 0; updateHeli(0.01); const c = """ + HELI + """; at.push(!!c, c && [c.dir, Math.round(c.z - odo), c.alt > 10], $('flash').textContent);
            heliClock = 0; updateHeli(0.01); at.push(traffic.filter(c => c.heli).length); heliClock = 1e9; return at; })()""")
        check(f"{layout}: none at 40% heat, nor in the tank's race; at 60% one flies in (over the traffic, 400 m ahead, high up), "
              "HELICOPTER!; one at a time", got == [False, False, True, [0, 400, True], "HELICOPTER!", 1], got)

        # 2. notable: once in reach, in the reticle with its tag; its tutorial pops up
        pg.wait_for_function("menuOpen", timeout=15000)
        got = js("[target?.heli, menuOpen && screen, tour?.id]")
        check(f"{layout}: in the reticle; its tutorial pops up", got == [True, "tour", "heli"], got)
        pg.screenshot(path=f"{OUT}/heli_{layout}_tour.png")
        while js("menuOpen"): js("turnTour(1)"); pg.wait_for_timeout(50)
        pg.wait_for_timeout(200)
        got = js("$('ar-label').textContent")
        check(f"{layout}: its tag (HELI, its health, the shells, how far)", got.startswith("HELI · 100% · ") and got.endswith(" m"), got)

        # 3. it comes down ahead of you and hovers there; the traffic goes on under it
        pg.wait_for_function(HELI + ".stage !== 'come'", timeout=15000)
        js("(() => { const c = " + HELI + "; Object.assign(c, { stage: 'wait', t: 1e9 }); })()")
        pg.wait_for_timeout(2500)
        got = js("""(() => { const c = """ + HELI + """, car = traffic.find(o => !o.racer && !o.fleet && !o.heli && !o.wreck);
            Object.assign(car, { dir: 1, x: c.x, z: c.z - 20, v: speed }); const lead = leader(car); car.dir = -1; car.z = odo + 1500;
            return [Math.abs(c.z - odo - HELI.ahead) < 10, Math.abs(c.alt - HELI.alt) < 1, lead !== c]; })()""")
        check(f"{layout}: it hovers 60 m ahead, 7 m up; a car under it doesn't brake for it", got == [True, True, True], got)
        got = js("[...document.querySelectorAll('#sonar-blips path')].length")
        check(f"{layout}: a triangle on the sonar", got == 1, got)

        # 4. its searchlight on a lane, then a burst down it: the armor's column, front to back
        js("(() => { const c = " + HELI + "; Object.assign(c, { stage: 'aim', t: 1e9, aim: ROAD_LANES[lane] }); })()")
        pg.wait_for_timeout(700)
        got = js("heliMarks().map(m => m.kind)")
        check(f"{layout}: its searchlight on the lane", got == ["spot"], got)
        pg.screenshot(path=f"{OUT}/heli_{layout}_aim.png")
        got = js("""(() => { const d0 = progress.damage, puffs0 = []; const c = """ + HELI + """; Object.assign(c, { stage: 'aim', t: 0.01, aim: ROAD_LANES[lane] });
            let dust = 0; for (let i = 0; i < 120; i++) { heliDrive(c, 1 / 60); dust = Math.max(dust, puffs.length); }
            return [...""" + HP + """, progress.damage - d0, $('flash').textContent, dust > 5, c.stage]; })()""")
        check(f"{layout}: a burst down the right lane: its dust walking at you, six rounds down the armor's column (5 less 75% each: 7.5), "
              "the rig untouched, STRAFED; then it waits", got == ["cannon 100", "armor 52.5", 0, "STRAFED", True, "wait"], got)

        # 5. down the left lane: the cannon takes the front row's rounds, the empty cells let the rest through
        got = js("(() => { const d0 = progress.damage; " + BURST + "(ROAD_LANES[lane + 1]); return [..." + HP + ", +(progress.damage - d0).toFixed(2)]; })()")
        check(f"{layout}: down the left lane: two rounds on the cannon (2.5), four through to the rig (5)", got == ["cannon 97.5", "armor 52.5", 5], got)

        # 6. off the fortress's lanes: all miss
        got = js("(() => { const d0 = progress.damage, h = " + HP + ".join(); " + BURST + "(ROAD_LANES[lane + 2]); return [" + HP + ".join() === h, progress.damage - d0, $('flash').textContent]; })()")
        check(f"{layout}: a lane the fortress isn't on: every round misses, DODGED", got == [True, 0, "DODGED"], got)
        js("(() => { const c = " + HELI + "; Object.assign(c, { stage: 'fire', t: 0.3, shot: 0, puffed: 0, hits: 0, aim: ROAD_LANES[lane] }); })()")
        pg.wait_for_timeout(120); pg.screenshot(path=f"{OUT}/heli_{layout}_strafe.png")

        # 7. shot down: it falls onto the road, its scrap, its gun or turbine on the road
        got = js("""(() => { const c = """ + HELI + """, s0 = progress.scrap; run.loot = []; hurtCar(c, 5000);
            return [c.wreck, progress.scrap - s0, run.loot.length, run.loot[0] && ['gun', 'engine'].includes(run.loot[0].part.kind), run.loot[0]?.part.from]; })()""")
        check(f"{layout}: shot down: 160 scrap, a crate of its gun or its turbine", got == [True, 160, 1, True, "heli"], got)
        pg.wait_for_timeout(1200)
        got = js("traffic.filter(c => c.heli && c.wreck).map(c => [c.alt, c.dir])")
        check(f"{layout}: it falls onto the road", got == [[0, 1]], got)

        # 8. its turbine, mounted: the gas turbine heard over your engine
        js("progress.fortress.parts.push({ kind: 'engine', from: 'heli', cells: [[0, 0]], x: 0, y: 2 }); applyUpgrades()")
        pg.wait_for_function("voices.some(v => v.name === 'turbine')", timeout=10000)
        check(f"{layout}: a turbine on the board: its voice heard", True)
        ctx.close()
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
