"""Act 5's Widen (docs/design-notes.md, Act 5, layer 6): the board a lane wider a level, to the road's four, and the war
rig with it on the road. From two lanes wide (the owner, 30 Oct): a truck's wheel (a thicker rim, a spinner knob) shifts
the whole rig a lane at a time, slower, over the double yellow too, as far as the road goes; the robot brakes for no
one and leaves the lanes to you (Autocruise's and Lane assist's plates say so); a car of the traffic's in any lane it
covers is crushed for a little speed; head-on it rams through (the car scrap, the rig 20% less its armor, the run goes
on), and an oncoming car swerves out of its way if it can; a rival rig with no lane beside you waits up the road; a
crate in any lane it covers is picked up. Its tutorial pops up as it is bought. A lane wide, a head-on is still the end
of the run. Phone and desktop."""
import json
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
LEVELS = dict(workshopTab=1, autopilotTab=1, blackTab=1, fleetTab=1, warrigTab=1, fortressTab=1, rebuild=1, lengthen=2, power=10,
              rev=4, gears=3, tyres=4, time=6, clutch=1, gas=1, shift=1, steer=1, cruise=1, autoflash=1, engine=2, flash=5, grid=100,
              rolling=6, reckless=1, chicken=1, ecuRev=4, recklessCruise=1, cooling=3, ecuPower=4, nitro=5, fleet=80, bullbar=3,
              armour=3, spikes=1, guns=1, autogun=1, hunter=1, pack=1, dues=3, fleetPace=3)
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
# the road cleared but for what a check puts there: the traffic oncoming far off, the racers far behind, the clocks held
CLEAR = "traffic.forEach((c, i) => { if (!c.racer && !c.fleet) Object.assign(c, { dir: -1, x: LANES.oncoming[i % 2], z: odo + 1500 + 40 * i, " \
        "rig: false, police: false, suv: false, hp: null, wreck: false, swerve: null }); else if (c.racer) c.z = odo - 3000; }); " \
        "target = quarry = null; rigClock = gangClock = copClock = 1e9; run.loot = []"
CAR = "() => traffic.find(c => !c.racer && !c.fleet && !c.wreck && !c.rig && !c.police && !c.suv && !c.tank)"
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    for layout in ["phone", "desktop"]:
        phone = layout == "phone"
        ctx = b.new_context(**(dict(viewport={"width": 844, "height": 390}, device_scale_factor=2, is_mobile=True, has_touch=True)
                               if phone else dict(viewport={"width": 1440, "height": 900})))
        pg = ctx.new_page(); js = pg.evaluate; pg.on("pageerror", lambda e: errors.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(URL); js("localStorage.clear()")
        js(f"Object.assign(progress, {{ racing: true, finish: 1, gang: true, totals: 60, tanks: 1, oil: 2, runs: 80, races: 60, bank: 9000, "
           f"points: 5000, scrap: 20000, shells: 10, fortress: {{ parts: [{{ kind: 'cannon', cells: [[0, 0]], x: 0, y: 0 }}], hold: [] }}, "
           f"roles: {{ harvester: 17, brewer: 9, raider: 6 }}, levels: {json.dumps(LEVELS)}, "
           f"toured: TUTORIALS.map(t => t.id).filter(id => id !== 'wide') }}); save()")
        if phone: js("settings.layout = 'touch'; applyLayout()")
        pg.click('[data-play="distance"]'); pg.wait_for_timeout(300)

        # 1. bought in the garage: two lanes wide, its tutorial, the plates; the board and the drag
        js("garageTab = 'fortress'; renderGarage()"); pg.wait_for_timeout(100)
        pg.click('[data-buy="widen"]'); pg.wait_for_timeout(300)
        got = js("[progress.scrap, boardW(), rigW, menuOpen && screen, tour.id]")
        check(f"{layout}: Widen for 800 scrap: two lanes wide, its tutorial pops up", got == [19200, 2, 2, "tour", "wide"], got)
        while js("menuOpen"): js("turnTour(1)"); pg.wait_for_timeout(50)
        js("garageTab = 'autopilot'; renderGarage()"); pg.wait_for_timeout(100)
        got = js("Object.fromEntries([...document.querySelectorAll('#cards .card.plated')].map(c => [c.querySelector('b').textContent, c.querySelector('small').textContent]))")
        check(f"{layout}: Autocruise's and Lane assist's plates: no brakes, the rig rams",
              got.get("Autocruise") == "no brakes: the rig rams" and got.get("Lane assist") == "no brakes: the rig rams"
              and got.get("Auto gas") == "the war rig drives itself", got)
        got = js("[+(CAR.drag / STOCK_DRAG).toFixed(2), Math.round(rigWeight())]")
        check(f"{layout}: twice the frontal area and three rows: 2.2 times the drag; six cells of deck and the cannon 2,400 kg", got == [2.2, 2400], got)
        pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=20000)
        js(CLEAR); pg.wait_for_timeout(600)
        got = js("[document.body.classList.contains('wide'), getComputedStyle($('wheel-knob')).display !== 'none', lane, +laneX().toFixed(2), Math.abs(carX - laneX()) < 0.3, $('sonar-you').getAttribute('transform')]")
        check(f"{layout}: on the road: a truck's wheel (its knob), across both your lanes (3.5 m from the middle), the sonar's mark two wide",
              got[:5] == [True, True, 0, 3.5, True] and got[5].endswith("scale(2, 1)"), got)
        pg.screenshot(path=f"{OUT}/widen_{layout}_road.png")

        # 2. the wheel: a lane at a time, over the double yellow, as far as the road goes; slower than a lane wide
        got = js("""(() => { const at = []; for (let i = 0; i < 4; i++) { changeLane(-1); at.push(lane); } changeLane(1); changeLane(1); at.push(lane);
            const time = w => { const was = [rigW, lane, carX, slide, speed]; rigW = w; speed = 80; lane = 0; carX = laneX(0); slide = 0; lane = 1;
              let n = 0; while (Math.abs(carX - laneX()) > 0.1 && n < 2000) { stepLane(1 / 60); n++; } [rigW, lane, carX, slide, speed] = was; return n; };
            return [...at, time(2) > time(1) * 1.3]; })()""")
        check(f"{layout}: the wheel shifts it a lane at a time to the far side (lanes 2-3), and back; slower than a lane wide",
              got == [1, 2, 2, 2, 0, True], got)
        pg.wait_for_timeout(400)

        # 3. the robot brakes for no one: a slow car ahead in your lane, and no foot on the brake
        js(f"(() => {{ const c = ({CAR})(); Object.assign(c, {{ dir: 1, lane: 0, x: MY_LANES[0], z: odo + 60, v: 20, want: 20 }}); }})()")
        pg.wait_for_timeout(300)
        check(f"{layout}: a slow car ahead: no brakes", js("brakePedal") == 0, js("brakePedal"))
        js(CLEAR)

        # 4. a car in either lane it covers: crushed, for the momentum it had; a rival rig is not
        js(CLEAR)
        got = js(f"""(() => {{ speed = 60; const c = ({CAR})(); Object.assign(c, {{ dir: 1, lane: 1, x: MY_LANES[1], z: odo + 1, v: 40 }});
            const v0 = speed, d0 = progress.damage, s0 = run.scrap, m = engine.mass; bump(c); DISTANCE.crash(impact);
            const want = (m * v0 + CAR_KG * c.v) / (m + CAR_KG), harm = Math.min(25, Math.max(2, 20 * 3.6 * 0.25)) * CAR_KG / m * (1 - armorCut());
            return [c.wreck, $('flash').textContent.startsWith('CRUSHED'), Math.abs(speed - want) < 0.01, Math.abs(progress.damage - d0 - harm) < 0.01, run.scrap - s0]; }})()""")
        check(f"{layout}: a car in your other lane, run into: crushed (+22 scrap), the speed its momentum leaves, the damage its weight against the rig's",
              got == [True, True, True, True, 22], got)
        got = js(f"""(() => {{ const c = ({CAR})(); Object.assign(c, {{ dir: 1, rig: true, lane: 0, x: MY_LANES[0], z: odo + 1, v: 30, hp: null }});
            speed = 60; bump(c); DISTANCE.crash(impact); const r = [c.wreck, Math.round(speed) <= 30]; c.rig = false; return r; }})()""")
        check(f"{layout}: a rival rig: not crushed, a bump as ever", got == [False, True], got)

        # 5. head-on: rammed through, the run goes on; an oncoming car swerves out of the way if it can
        js(CLEAR)
        got = js(f"""(() => {{ const c = ({CAR})(); Object.assign(c, {{ dir: -1, x: ROAD_LANES[2], z: odo + 1, v: 25 }});
            speed = 60; const d0 = progress.damage, m = engine.mass, want = (m * 60 - CAR_KG * 25) / (m + CAR_KG); headOn(c); DISTANCE.crash(impact);
            return [c.wreck, $('flash').textContent.startsWith('RAMMED THROUGH'), +(progress.damage - d0).toFixed(2), run.phase, Math.abs(speed - want) < 0.01]; }})()""")
        check(f"{layout}: head-on: rammed through, 20% less Armor plating's 75% (5%), the run goes on, the speed its momentum leaves",
              got == [True, True, 5, "run", True], got)
        js(CLEAR)
        got = js(f"""(() => {{ lane = 1; carX = laneX(); const c = ({CAR})(); Object.assign(c, {{ dir: -1, x: ROAD_LANES[2], z: odo + 120, v: 25, swerve: null }});
            updateTraffic(0.001, performance.now() / 1000); const r = [c.swerve === ROAD_LANES[3]]; lane = 0; carX = laneX(); return r; }})()""")
        check(f"{layout}: over the double yellow, an oncoming car in its way swerves to the far lane", got == [True], got)

        # 6. a crate in either lane it covers is picked up; a rival rig with no lane beside you waits up the road
        js(CLEAR)
        got = js("""(() => { run.loot = [{ part: { kind: 'armor', from: 'rig', cells: [[0, 0]] }, z: odo + 1, x: MY_LANES[1], v: 0 }];
            lootTick(0.001); return [run.loot.length, progress.fortress.hold.length]; })()""")
        check(f"{layout}: a crate in your other lane: picked up", got == [0, 1], got)
        got = js("""(() => { Object.assign(traffic.find(c => !c.racer && !c.fleet && !c.wreck), { z: odo + 800 }); rigClock = 0; updateRigs(0.01); rigClock = 1e9;
            const c = traffic.find(c => c.rig && !c.wreck); return [sideLane(), c?.stage, c && Math.round(c.z - odo)]; })()""")
        check(f"{layout}: no lane beside you: a rival rig waits up the road, holding", got == [None, "hold", 300], got)

        # 7. four lanes wide: across the road, nowhere to shift
        got = js("(() => { progress.levels.widen = 3; applyUpgrades(); changeLane(-1); return [rigW, lane, laneX(), +(CAR.drag / STOCK_DRAG).toFixed(1)]; })()")
        check(f"{layout}: four lanes wide: across the whole road, the wheel shifts it nowhere, four times the drag (and its rows)", got == [4, 0, 0, 4.2], got)
        pg.wait_for_timeout(600); pg.screenshot(path=f"{OUT}/widen_{layout}_four.png")

        # 8. a lane wide, a head-on is still the end of the run
        js(CLEAR)
        got = js(f"""(() => {{ progress.levels.widen = 0; applyUpgrades(); const c = ({CAR})(); Object.assign(c, {{ dir: -1, x: carX, z: odo + 1, v: 25 }});
            headOn(c); DISTANCE.crash(impact); return [rigW, run.phase, run.race?.dnf]; }})()""")
        check(f"{layout}: a lane wide: a head-on ends the run", got == [1, "finish", "head-on"], got)
        ctx.close()
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
