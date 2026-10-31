"""Act 5's loot (docs/design-notes.md, Act 5, layer 6): on the war rig a totaled notable enemy (and, rarely, a rival gang
car) drops a part by its drop table: a crate on the road, a gold diamond on the sonar, no wider than the board; steered
over, it goes into the hold, a full hold leaves it; the tank's goes straight into the hold. Its tutorial pops up at the
first. The parts by blocks: a cannon adds to every shell, a gun to the guns, armor cuts the damage, spikes add to a ram,
an engine pulls; every block weighs, and the board's length drags. Lengthen grows the board a row, Inventory the hold a
slot. Nothing drops before the Rebuild. An engine on the board is heard over yours, a voice for each kind, geared to your
revs; the heavy engines' sound file loads only once one is mounted; Free drive has none. Phone and desktop."""
import json
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
LEVELS = dict(workshopTab=1, autopilotTab=1, blackTab=1, fleetTab=1, warrigTab=1, fortressTab=1, rebuild=1, power=10, rev=4, gears=3,
              tyres=4, time=6, clutch=1, gas=1, shift=1, steer=1, cruise=1, autoflash=1, engine=2, flash=5, grid=100, rolling=6,
              reckless=1, chicken=1, ecuRev=4, recklessCruise=1, cooling=3, ecuPower=4, nitro=5, fleet=80, bullbar=3, armour=3,
              spikes=1, guns=1, autogun=1, hunter=1, pack=1, dues=3, fleetPace=3)
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
# the road cleared but for what a check puts there: the traffic oncoming, a way off; the racers far behind; the clocks held
CLEAR = "traffic.forEach((c, i) => { if (!c.racer && !c.fleet) Object.assign(c, { dir: -1, x: LANES.oncoming[i % 2], z: odo + 1500 + 40 * i, " \
        "rig: false, police: false, suv: false, hp: null, wreck: false }); else if (c.racer) c.z = odo - 3000; }); " \
        "target = quarry = null; rigClock = gangClock = copClock = 1e9; run.loot = []"
RIG = """() => { const c = traffic.find(c => !c.racer && !c.fleet && !c.wreck && !c.rig);
    Object.assign(c, { dir: 1, rig: true, stage: 'hold', t: 1e9, z: odo + 60, v: speed, lane: 1 - lane, x: MY_LANES[1 - lane],
                       look: { rear: RIG_SPRITE }, w: RIG.w, h: RIG.h, hp: null, wreck: false }); return c; }"""
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    for layout in ["phone", "desktop"]:
        phone = layout == "phone"
        ctx = b.new_context(**(dict(viewport={"width": 844, "height": 390}, device_scale_factor=2, is_mobile=True, has_touch=True)
                               if phone else dict(viewport={"width": 1440, "height": 900})))
        pg = ctx.new_page(); js = pg.evaluate; pg.on("pageerror", lambda e: errors.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(URL); js("localStorage.clear()")
        js(f"Object.assign(progress, {{ racing: true, finish: 1, gang: true, totals: 60, tanks: 1, oil: 2, runs: 80, races: 60, bank: 9000, "
           f"points: 5000, scrap: 5000, shells: 10, fortress: {{ parts: [{{ kind: 'cannon', cells: [[0, 0]], x: 0, y: 0 }}], hold: [] }}, "
           f"roles: {{ harvester: 17, brewer: 9, raider: 6 }}, levels: {json.dumps(LEVELS)}, "
           f"toured: TUTORIALS.map(t => t.id).filter(id => id !== 'loot') }}); save()")
        if phone: js("settings.layout = 'touch'; applyLayout()")
        pg.click('[data-play="distance"]'); pg.wait_for_timeout(300)

        # 1. the garage: Lengthen for scrap, Inventory for points, on the Fortress page
        js("garageTab = 'fortress'; renderGarage()"); pg.wait_for_timeout(100)
        got = js("[...document.querySelectorAll('#cards .card')].map(c => c.querySelector('b').textContent)")
        check(f"{layout}: the Fortress page: Rebuild, Lengthen, Inventory", all(n in got for n in ["Rebuild", "Lengthen", "Inventory"]), got)
        got = js("[boardH(), holdSize(), buy('lengthen'), buy('inventory'), boardH(), holdSize(), progress.scrap, progress.points, progress.fortress.parts[0].y, refreshCar()].slice(0, 9)")
        check(f"{layout}: Lengthen a row for 400 scrap, behind (the cannon stays in front); Inventory a slot for 600 points",
              got == [1, 1, True, True, 2, 2, 4600, 4400, 0], got)
        pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=20000)
        js(CLEAR); pg.wait_for_timeout(200)

        check(f"{layout}: the heavy engines' sounds not loaded yet", js("!rigSoundsIn() && !document.querySelector('script[src*=\"rig-sounds\"]')"))

        # 2. a rig totaled drops a part: a crate on the road, as wide as the board at most; the tutorial pops up
        got = js(f"""(() => {{ const c = ({RIG})(); hurtCar(c, 5000); const l = run.loot[0];
            return [run.loot.length, Object.keys(DROPS.rig[1]).includes(l.part.kind), extent(l.part.cells, 0) <= boardW(), l.part.from]; }})()""")
        check(f"{layout}: a rig totaled: a crate of one of its parts on the road, no wider than the board", got == [1, True, True, "rig"], got)
        pg.wait_for_timeout(300)
        check(f"{layout}: the first loot: its tutorial pops up", js("[menuOpen && screen, tour.id]") == ["tour", "loot"], js("[menuOpen && screen, tour.id]"))
        while js("menuOpen"): js("turnTour(1)"); pg.wait_for_timeout(50)
        js("rigClock = gangClock = copClock = 1e9; Object.assign(run.loot[0], { z: odo + 40, x: MY_LANES[1 - lane], v: speed })")
        pg.wait_for_timeout(300)
        check(f"{layout}: on the sonar, a gold diamond", js("!!$('sonar-blips').querySelector('.loot')"))
        pg.screenshot(path=f"{OUT}/loot_{layout}_crate.png")

        # 3. steered over: into the hold, heavier; a full hold leaves the next one on the road
        got = js("""(() => { const l = run.loot[0], kg = engine.mass; Object.assign(l, { z: odo + 1, x: carX, v: 0 }); lootTick(0.01);
            return [run.loot.length, progress.fortress.hold.length, Math.round(engine.mass - kg) === PARTS[l.part.kind].kg * l.part.cells.length, $('flash').textContent]; })()""")
        check(f"{layout}: steered over: into the hold, the rig heavier by its blocks", got[:3] == [0, 1, True] and "INTO THE HOLD" in got[3], got)
        got = js("""(() => { const f = progress.fortress; f.hold.push({ kind: 'armor', from: 'rig', cells: [[0, 0]] });
            run.loot.push({ part: { kind: 'gun', from: 'suv', cells: [[0, 0]] }, z: odo + 1, x: carX, v: 0 }); lootTick(0.01);
            const left = [run.loot.length, f.hold.length, $('flash').textContent]; run.loot[0].z = odo - 30; lootTick(0.01);
            return [...left, run.loot.length]; })()""")
        check(f"{layout}: the hold full: the crate stays on the road, said so; passed, gone", got[:2] == [1, 2] and "HOLD FULL" in got[2] and got[3] == 0, got)

        # 4. on the board: a part as it comes, never turned; the parts at work
        js("progress.fortress.hold = []; progress.levels.lengthen = 2; applyUpgrades()")  # three rows: the cannon in the first
        got = js("""(() => { const f = progress.fortress, two = [[0, 0], [0, 1]], three = [[0, 0], [0, 1], [0, 2]];
            return [boardH(), fitsAt(f, two, 0, 1), fitsAt(f, two, 0, 2), fitsAt(f, three, 0, 0), fitsAt(f, [[0, 0], [1, 0]], 0, 1)]; })()""")
        check(f"{layout}: three rows: two stacked fit behind the cannon, not past the end, nor over it; two side by side don't on a lane",
              got == [3, True, False, False, False], got)
        got = js(f"""(() => {{ const f = progress.fortress, d0 = CAR.drag, m0 = engine.mass, p0 = engine.drive;
            f.parts.push({{ kind: 'cannon', from: 'tank', cells: [[0, 0], [0, 1]], x: 0, y: 1 }}); applyUpgrades();
            const c = ({RIG})(); c.seen = [0, 0, 1, 1]; target = c; reloading = 0; fireCannon(); const shell = health(c) - c.hp;
            f.parts.pop(); f.parts.push({{ kind: 'engine', from: 'rig', cells: [[0, 0], [0, 1]], x: 0, y: 1 }}); applyUpgrades();
            const pull = +(engine.drive / engine.stock.drive).toFixed(2);
            f.parts.pop(); f.parts.push({{ kind: 'armor', from: 'rig', cells: [[0, 0], [0, 1]], x: 0, y: 1 }}); applyUpgrades();
            const cut = +armorCut().toFixed(2); f.parts.pop(); applyUpgrades();
            return [shell, pull, cut, +(CAR.drag / STOCK_DRAG).toFixed(2), Math.round(engine.mass - engine.stock.mass)]; }})()""")
        check(f"{layout}: a two-block cannon: a shell 750 (three blocks); a rig's two-block engine 30% more pull; armor no cut of its own (Armor plating's 75%: it is the shield); "
              f"three rows 20% more drag; the deck and the cannon weigh 1,650 kg", got == [750, 2.82, 0.75, 1.2, 1650], got)
        got = js(f"""(() => {{ const f = progress.fortress; f.parts.push({{ kind: 'spikes', from: 'rig', cells: [[0, 0], [0, 1]], x: 0, y: 1 }});
            const c = traffic.find(c => !c.racer && !c.fleet && !c.wreck && !c.rig); Object.assign(c, {{ dir: 1, hp: 1000 }});
            ram({{ car: c, kmh: 100, side: false }}); f.parts.pop(); return Math.round(1000 - c.hp); }})()""")
        check(f"{layout}: two spike blocks: a ram 34 x (1 + 2 + 2/3) = 125", got == 125, got)
        js("progress.fortress.hold = [{ kind: 'armor', from: 'rig', cells: [[0, 0], [0, 1], [0, 2]] }]"); pg.wait_for_timeout(300)
        pg.screenshot(path=f"{OUT}/loot_{layout}_board.png")
        got = js("(() => { const s = document.querySelector('#fort-hold .slot').getBoundingClientRect(), p = document.querySelector('#fort-hold .part').getBoundingClientRect(); "
                 "return [p.height <= s.height + 1, document.querySelectorAll('#fort-hold .part > i').length]; })()")
        check(f"{layout}: a three-block part fits its one slot, drawn as three blocks", got == [True, 3], got)

        # 5. the tank's parts go straight into the hold; nothing drops before the Rebuild
        js("progress.fortress.hold = []")
        got = js("""(() => { const c = traffic.find(c => !c.racer && !c.fleet && !c.wreck && !c.rig); dropLoot({ ...c, tank: true });
            const tank = [progress.fortress.hold.length, Object.keys(DROPS.tank[1]).includes(progress.fortress.hold[0]?.kind), run.loot.length];
            progress.levels.rebuild = 0; run.loot = []; dropLoot({ ...c, rig: true }); const act4 = run.loot.length; progress.levels.rebuild = 1;
            return [...tank, act4]; })()""")
        check(f"{layout}: the tank's part straight into the hold; before the Rebuild, no drop", got == [1, True, 0, 0], got)

        # 6. engines heard: a voice for each kind, geared to your revs, its file loaded once a heavy one is mounted
        js("progress.fortress.parts.push({ kind: 'engine', from: 'rig', cells: [[0, 0], [0, 1]], x: 0, y: 1 }); applyUpgrades()")
        pg.wait_for_function("voices.some(v => v.name === 'truck' && v.players.length === 6)", timeout=10000)
        pg.wait_for_timeout(400)
        got = js("""(() => { const v = voices.find(v => v.name === 'truck'), lo = v.players[0].rpm, hi = v.players.at(-1).rpm;
            const f = (rpm - engine.idle) / (engine.redline - engine.idle), r = Math.max(0.8 * lo, lo + (hi - lo) * f);
            return [rigSoundsIn(), +v.level.toFixed(2), v.players.every(p => Math.abs(p.src.playbackRate.value * p.rpm / r - 1) < 0.15)]; })()""")
        check(f"{layout}: a rig's two-block engine: the truck diesel heard (its file loaded), level 0.6, its loops geared to your revs",
              got == [True, 0.6, True], got)
        js("progress.fortress.parts.push({ kind: 'engine', from: 'suv', cells: [[0, 0]], x: 0, y: 0 })"); pg.wait_for_timeout(300)
        got = js("voices.map(v => v.name).sort()")
        check(f"{layout}: an SUV's engine too: its V8 a second voice", got == ["truck", "v8"], got)
        js("progress.fortress.parts = progress.fortress.parts.filter(p => p.from !== 'rig')"); pg.wait_for_timeout(300)
        check(f"{layout}: thrown off, its voice goes", js("voices.map(v => v.name)") == ["v8"], js("voices.map(v => v.name)"))
        js("play(ARCADE.find(g => g.id === 'free'))"); pg.wait_for_timeout(300)
        check(f"{layout}: Free drive: no voices", js("voices.length") == 0, js("voices.length"))
        ctx.close()
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
