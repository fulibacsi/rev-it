"""Act 5's shield (docs/design-notes.md, Act 5, layer 7): a hit on the war rig lands on the board's cell by where it comes
from, ahead up: the tank's shells and what you run into on the front row, what hits you from behind on the back row,
in the column it meets; a ram from beside you on that side's column, a row at random. A part there takes the whole hit
(less Armor plating's share), an empty cell lets it through to the rig; the cell flashes, amber or red. The first hit
on a part pops up the shield's tutorial. A part's health is its blocks' by its kind; worn it shows cracked; at none
the whole part blinks and falls off, gone for good, and what it did goes with it. Its wear is kept: repairs mend the rig
only, and the save keeps it. Phone and desktop."""
import json
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
LEVELS = dict(workshopTab=1, autopilotTab=1, blackTab=1, fleetTab=1, warrigTab=1, fortressTab=1, rebuild=1, lengthen=2, widen=1,
              power=10, rev=4, gears=3, tyres=4, time=6, clutch=1, gas=1, shift=1, steer=1, cruise=1, autoflash=1, engine=2, flash=5,
              grid=100, rolling=6, reckless=1, chicken=1, ecuRev=4, recklessCruise=1, cooling=3, ecuPower=4, nitro=5, fleet=80,
              bullbar=3, armour=3, spikes=1, guns=1, autogun=1, hunter=1, pack=1, dues=3, fleetPace=3)
# two lanes wide, three rows: armor across the front, the cannon behind its left, a rig's engine at the back right
BOARD = dict(parts=[dict(kind="armor", from_="rig", cells=[[0, 0], [1, 0]], x=0, y=0), dict(kind="cannon", from_="tank", cells=[[0, 0]], x=0, y=1),
                    dict(kind="engine", from_="rig", cells=[[0, 0]], x=1, y=2)], hold=[])
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
# the road cleared but for what a check puts there: the traffic oncoming far off, the racers far behind, the clocks held
CLEAR = "traffic.forEach((c, i) => { if (!c.racer && !c.fleet) Object.assign(c, { dir: -1, x: LANES.oncoming[i % 2], z: odo + 1500 + 40 * i, " \
        "rig: false, police: false, suv: false, hp: null, wreck: false, swerve: null }); else if (c.racer) c.z = odo - 3000; }); " \
        "target = quarry = null; rigClock = gangClock = copClock = 1e9; run.loot = []"
CAR = "() => traffic.find(c => !c.racer && !c.fleet && !c.wreck && !c.rig && !c.police && !c.suv && !c.tank)"
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
           f"points: 5000, scrap: 2000, shells: 10, damage: 0, fortress: {json.dumps(BOARD).replace('from_', 'from')}, "
           f"roles: {{ harvester: 17, brewer: 9, raider: 6 }}, levels: {json.dumps(LEVELS)}, "
           f"toured: TUTORIALS.map(t => t.id).filter(id => id !== 'shield') }}); save()")
        if phone: js("settings.layout = 'touch'; applyLayout()")
        pg.click('[data-play="distance"]'); pg.wait_for_timeout(300)
        pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=20000)
        js(CLEAR); pg.wait_for_timeout(300)
        got = js(HP)
        check(f"{layout}: health by blocks and kind: two-block armor 40, the cannon 100, an engine 10", got == ["armor 40", "cannon 100", "engine 10"], got)

        # 1. the tank's shell from ahead: on the front row's armor, the rig untouched; the shield's tutorial pops up
        got = js("""(() => { const d0 = progress.damage; strike(TANK.hit, carX + 1.75, odo + 80);
            return [...""" + HP + """, progress.damage - d0, menuOpen && screen, tour?.id]; })()""")
        check(f"{layout}: a shell from ahead: the front row's armor takes 8 less Armor plating's 75% (2), the rig nothing; the shield's tutorial",
              got == ["armor 38", "cannon 100", "engine 10", 0, "tour", "shield"], got)
        pg.screenshot(path=f"{OUT}/shield_{layout}_tour.png")
        while js("menuOpen"): js("turnTour(1)"); pg.wait_for_timeout(50)

        # 2. where each hit lands: ahead in the column it meets, behind on the back row, a side ram on that side, any row
        # (z is a car's rear, odo your eye: your bumpers 1.8 m ahead of it and 2.7 m behind, a car 4.5 m long)
        got = js("""(() => { const at = (x, z) => String(cellAt(carX + x, odo + z));
            const rows = new Set(); for (let i = 0; i < 60; i++) rows.add(cellAt(carX + 3.2, odo - 2)[1]);
            return [at(-1.75, 30), at(1.75, 2), at(-6, 30), at(1.75, -7.1), at(-3.2, -2), at(3.2, -2), at(1, 0.5), [...rows].sort().join()]; })()""")
        check(f"{layout}: ahead on the front row, left and right, a car far over the double yellow on the left column; behind on the back row; "
              "one come in from beside (overlapping you less across than along) on its side's column, every row; one cut in just "
              "ahead of you (its rear past your eye: overlapping less along than across) on the front row",
              got[:4] == ["0,0", "1,0", "0,0", "1,2"] and got[4].startswith("0,") and got[5].startswith("1,") and got[6] == "1,0"
              and got[7] == "0,1,2", got)

        # 3. an empty cell: through to the rig, the cell flashes red; a part's flashes amber
        got = js("(() => { const d0 = progress.damage; strike(10, carX - 1.75, odo - 7.1); return [+(progress.damage - d0).toFixed(2), String([struck.x, struck.y])]; })()")
        pg.wait_for_timeout(60); got.append(js("$('fort-hit').className"))
        check(f"{layout}: from behind on the left, an empty cell: through to the rig (10 less 75%), the cell flashes red", got == [2.5, "0,2", "rig"], got)
        pg.screenshot(path=f"{OUT}/shield_{layout}_through.png")
        js("strike(4, carX - 1.75, odo + 5)"); pg.wait_for_timeout(60)
        check(f"{layout}: on a part, amber", js("$('fort-hit').className") == "part")

        # 4. a car run into: on the front row in its column; a rival rig's ram from the right on the right column
        js(CLEAR)
        got = js(f"""(() => {{ speed = 60; const c = ({CAR})(); Object.assign(c, {{ dir: 1, lane: 0, x: MY_LANES[0], z: odo + 1, v: 40 }});
            const d0 = progress.damage, a0 = hpOf(progress.fortress.parts[0]); bump(c); DISTANCE.crash(impact);
            return [c.wreck, progress.damage === d0, a0 - hpOf(progress.fortress.parts[0]) > 0, String([struck.x, struck.y])]; }})()""")
        check(f"{layout}: a car crushed in the right lane: the front row's armor takes it, in the right column", got == [True, True, True, "1,0"], got)
        js(CLEAR)
        got = js(f"""(() => {{ const c = ({CAR})(); Object.assign(c, {{ dir: 1, rig: true, x: carX + 3.2, z: odo }}); const d0 = progress.damage;
            const before = {HP}.join(); rigRam(c); const after = {HP}.join(); c.rig = false;
            return [struck.x, struck.part ? after !== before && progress.damage === d0 : progress.damage - d0 === 1.5]; }})()""")
        check(f"{layout}: a rival rig's ram from the right: on the right column, a part's hit or the rig's", got == [1, True], got)

        # 5. worn: cracked under two thirds of its health, badly under a third
        js("progress.fortress.parts[0].hp = 25; progress.fortress.parts[1].hp = 30"); pg.wait_for_timeout(100)
        got = js("[...document.querySelectorAll('#fort-grid [data-part]')].map(e => e.dataset.wear)")
        check(f"{layout}: the armor at 25 of 40 cracked, the cannon at 30 of 100 badly, the engine whole", got == ["1", "2", "0"], got)
        pg.screenshot(path=f"{OUT}/shield_{layout}_worn.png")

        # 6. worn out: the whole part blinks and falls off, gone for good; what it did goes with it
        got = js("""(() => { const m0 = engine.mass, f = progress.fortress; f.parts[0].hp = 0.5; strike(4, carX - 1.75, odo + 5);
            return [f.parts.map(p => p.kind).join(), $('flash').textContent, Math.round(m0 - engine.mass)]; })()""")
        check(f"{layout}: the armor at half a point takes a hit: ARMOR 2 LOST, gone, 1,000 kg lighter", got == ["cannon,engine", "ARMOR 2 LOST", 1000], got)
        got = js("(() => { const d0 = progress.damage; strike(8, carX - 1.75, odo + 5); return +(progress.damage - d0).toFixed(2); })()")
        check(f"{layout}: its cells a hole now: the next shell through to the rig (2)", got == 2, got)
        pg.wait_for_timeout(100)
        got = js("document.querySelectorAll('#fort-grid [data-fall]').length"); pg.screenshot(path=f"{OUT}/shield_{layout}_falling.png")
        check(f"{layout}: the part lost blinks on the board", got == 1, got)
        pg.wait_for_timeout(1400)
        check(f"{layout}: ... and is gone after its blinks", js("document.querySelectorAll('#fort-grid [data-fall]').length") == 0)
        got = js("""(() => { progress.fortress.parts[0].hp = 1; for (let i = 0; i < 60 && cannonOn(); i++) strike(8, carX - 3.2, odo - 2);
            const r = [progress.fortress.parts.map(p => p.kind).join(), cannonOn(), $('flash').textContent]; progress.damage = 0; return r; })()""")
        check(f"{layout}: the cannon worn out by rams on its side: CANNON 1 LOST, no cannon", got == ["engine", False, "CANNON 1 LOST"], got)
        got = js("(() => { const p0 = engine.drive; progress.fortress.parts[0].hp = 1; strike(8, carX + 1.75, odo - 7.1); return [progress.fortress.parts.length, rigPower(), engine.drive < p0]; })()")
        check(f"{layout}: the engine worn out: its pull goes with it", got == [0, 0, True], got)

        # 7. the wear is kept: repairs mend the rig only, the save keeps it
        js("progress.fortress.parts.push({ kind: 'armor', from: 'rig', cells: [[0, 0]], x: 1, y: 0, hp: 13 }); progress.damage = 30; repair(); save()")
        pg.reload(); pg.wait_for_timeout(300)
        got = js("[Math.round(progress.damage), progress.fortress.parts.map(p => p.kind + ' ' + p.hp).join()]")
        check(f"{layout}: repaired and reloaded: the rig mended, the armor still worn", got == [0, "armor 13"], got)
        ctx.close()
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
