"""Act 5's road (docs/design-notes.md, Act 5, layer 5): on the war rig the reticle takes only the notable enemies (the
army's tank, the rival gang's war rigs), and the raiders' car, the quarry, is picked from the rest, a rival gang car
first; it is Hunter's too, and tagged on the windshield when picked. The racers you never paid off are a gang: they
come from behind, cut into your lane and brake, in the gang's welded-up look; each one totaled gives the cannon two
shells. The cannon needs shells: the count on its pedal, none left and it fires nothing. A rival rig comes up from
behind, holds the road ahead in the reticle, then rams you from the side; totaled, its scrap; none in a race the tank
is in; its tutorial pops up as the first one shows. The police's pursuit SUV: sent at the heat's odds, one at a time,
armored, and it comes again until totaled; its tutorial as it first shows. Over a notable one the reticle's tag: what it
is, its health, the shells it would take, how far. Before the rig, act 4's reticle as it was. Phone and desktop."""
import json, re
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
# the road cleared but for the car (or cars) a check puts there: everything else far off, the clocks held
CLEAR = "traffic.forEach((c, i) => { if (!c.racer && !c.fleet) Object.assign(c, { dir: -1, x: LANES.oncoming[i % 2], z: odo + 1500 + 40 * i, " \
        "rig: false, police: false, suv: false, hp: null, wreck: false }); else if (c.racer && !c.fleet) Object.assign(c, { z: odo - 3000, stage: null }); }); " \
        "target = quarry = null; rigClock = gangClock = 1e9"  # oncoming, a way off: nothing on your side of the road for a while
PUT = """(kind, ahead, inLane) => { const c = kind === 'racer' ? rivals().find(c => !c.wreck)
          : traffic.find(c => !c.racer && !c.fleet && !c.wreck && !c.police && !c.tank && !c.rig);
        Object.assign(c, { dir: 1, z: odo + ahead, v: speed, lane: inLane ? lane : 1 - lane, x: MY_LANES[inLane ? lane : 1 - lane], hp: null, stage: null });
        return c; }"""
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    for layout in ["phone", "desktop"]:
        phone = layout == "phone"
        ctx = b.new_context(**(dict(viewport={"width": 844, "height": 390}, device_scale_factor=2, is_mobile=True, has_touch=True)
                               if phone else dict(viewport={"width": 1440, "height": 900})))
        pg = ctx.new_page(); js = pg.evaluate; pg.on("pageerror", lambda e: errors.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(URL); js("localStorage.clear()")
        js(f"Object.assign(progress, {{ racing: true, finish: 1, gang: true, totals: 60, tanks: 1, oil: 2, runs: 80, races: 60, bank: 9000, "
           f"points: 2000, shells: 10, fortress: {{ w: 1, h: 1, parts: [{{ kind: 'cannon', cells: [[0, 0]], x: 0, y: 0 }}], hold: [] }}, "
           f"roles: {{ harvester: 17, brewer: 9, raider: 6 }}, levels: {json.dumps(LEVELS)}, "
           f"toured: TUTORIALS.map(t => t.id).filter(id => id !== 'rivals') }}); save()")
        if phone: js("settings.layout = 'touch'; applyLayout()")
        pg.click('[data-play="distance"]'); pg.wait_for_timeout(300)
        pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=20000)
        js(CLEAR); pg.wait_for_timeout(300)

        # 1. the reticle: not an ordinary car, not a gang car; the quarry is, the gang's first; Hunter's car is the quarry
        car = js(f"(() => {{ const c = ({PUT})('car', 60, true); updateGang(0); return [target, quarry === c, crewTarget() === c]; }})()")
        check(f"{layout}: an ordinary car ahead: no reticle on it, the raiders' (and Hunter's) car", car == [None, True, True], car)
        got = js(f"(() => {{ const g = ({PUT})('racer', 120, false); updateGang(0); return [target, quarry === g, raidAhead()?.car === g]; }})()")
        check(f"{layout}: a rival gang car comes in reach: the quarry goes to it, nearer cars or not; the tracker's raid row too", got == [None, True, True], got)
        js("run.pick = raidAhead()"); pg.wait_for_timeout(300)
        got = js("[document.body.classList.contains('tag-on'), $('crew-tag').textContent]")
        check(f"{layout}: picked, the raiders' car is tagged on the windshield", got[0] and got[1].startswith("RAID 0/3 · 100% ·"), got)
        check(f"{layout}: in the gang's look, welded up", js("(() => { const g = quarry; return g.look.rear === RACERS.get('g' + g.racer); })()"))

        # 2. shells: the count on the pedal; a gang car totaled brings two; a shell a press; none left, none fired
        check(f"{layout}: the pedal reads 10", js("$('shell-count').textContent") == "10", js("$('shell-count').textContent"))
        got = js("(() => { const s0 = progress.shells; total(quarry, true); return [progress.shells - s0, run.shells, $('flash').textContent]; })()")
        check(f"{layout}: a gang car totaled: +2 shells, said so", got[:2] == [2, 2] and "+2 SHELLS" in got[2], got)
        rig = """(ahead) => { const c = traffic.find(c => !c.racer && !c.fleet && !c.wreck && !c.police && !c.tank && !c.rig && c !== quarry);
            Object.assign(c, { dir: 1, rig: true, stage: 'hold', t: 1e9, z: odo + ahead, v: speed, lane: 1 - lane, x: MY_LANES[1 - lane], look: { rear: RIG_SPRITE },
                               w: RIG.w, h: RIG.h, hp: null, wreck: false }); return c; }"""
        got = js(f"(() => {{ const c = ({rig})(60); updateGang(0); c.seen = [0, 0, 1, 1]; reloading = 0; const fired = fireCannon(); "
                 f"return [target === c, notable(c), fired, progress.shells, c.hp]; }})()")
        check(f"{layout}: a rival rig ahead: in the reticle; a shell fired at it (11 left), 250 off its 1,500", got == [True, True, True, 11, 1250], got)
        pg.wait_for_timeout(400)
        got = js("[menuOpen && screen, tour.id, $('ar-label').textContent]")
        check(f"{layout}: the first rig in sight: the rival gang's tutorial pops up; the reticle's tag: RIG, 83%, 5 shots to go, how far",
              got[:2] == ["tour", "rivals"] and re.fullmatch(r"RIG · 83% · 5 SHOTS · \d+ m", got[2]) is not None, got)
        pg.screenshot(path=f"{OUT}/rivals_{layout}_tour.png")
        got = js("(() => { const tank = { tank: true, hp: null, z: odo + 80 }, f = progress.fortress, parts = f.parts; const a = notableTag(tank); "
                 "f.parts = []; const b = notableTag(tank); f.parts = parts; return [a, b]; })()")
        check(f"{layout}: the tank's tag the same (1,500 health: 6 shots); no cannon on the board, no shots", got == ["TANK · 100% · 6 SHOTS · 80 m", "TANK · 100% · 80 m"], got)
        while js("menuOpen"): js("turnTour(1)"); pg.wait_for_timeout(50)
        js("rigClock = gangClock = 1e9"); pg.wait_for_timeout(300)
        pg.screenshot(path=f"{OUT}/rivals_{layout}_rig.png")
        got = js("(() => { progress.shells = 0; reloading = 0; const fired = fireCannon(); return [fired, $('flash').textContent]; })()")
        pg.wait_for_timeout(100)
        check(f"{layout}: no shells: the pedal fires nothing, says so, and goes dim",
              got == [False, "NO SHELLS"] and js("$('cannon-pedal').parentNode.classList.contains('empty')"), got)
        js("progress.shells = 10")

        # 3. the rig rams: dropped back beside you, it swings into your side; rams barely scratch it; totaled, its scrap
        got = js("""(() => { const c = target, d0 = progress.damage; Object.assign(c, { stage: 'drop', z: odo + 0.5 });
            for (let i = 0; i < 60 && c.stage !== 'pass'; i++) rigDrive(c, 1 / 60);
            return [c.stage, +(progress.damage - d0).toFixed(2), $('flash').textContent]; })()""")
        check(f"{layout}: beside you it rams: 6% less a quarter for each Armor plating level (1.5%), RAMMED, then pulls ahead",
              got == ["pass", 1.5, "RAMMED"], got)
        got = js("""(() => { const c = target, hp = c.hp; ram({ car: c, kmh: 100, side: false }); const scratch = hp - c.hp;
            const s0 = run.scrap; hurtCar(c, 5000); return [Math.round(scratch), c.wreck, run.scrap - s0]; })()""")
        check(f"{layout}: a ram takes a fifth of a hit (102 with the bull bar: 20); totaled, 150 scrap", got == [20, True, 150], got)

        # 4. the gang: sent from behind, beyond the sonar, it comes past and cuts into your lane, brakes
        js(CLEAR)
        got = js("""(() => { const g = rivals().find(c => !c.wreck); g.z = odo - 900; gangClock = 0; updateGangCars(0.01);
            gangClock = 1e9; return [g.stage, Math.round(g.z - odo), Math.round((g.v - speed) * 3.6)]; })()""")
        check(f"{layout}: the gang sends the nearest one behind you: from 260 m back, 108 km/h quicker", got == ["chase", -260, 108], got)
        js("(() => { const g = rivals().find(c => c.stage === 'chase'); g.z = odo - 5; })()")
        pg.wait_for_function("rivals().some(c => c.stage === 'brake')", timeout=5000)
        got = js("(() => { const g = rivals().find(c => c.stage === 'brake'); return [g.lane === lane, Math.round(g.z - odo) > 15]; })()")
        check(f"{layout}: past you, it cuts into your lane ahead of you and brakes", got == [True, True], got)
        pg.screenshot(path=f"{OUT}/rivals_{layout}_gang.png")

        # 5. no rig in a race the tank is in
        js(CLEAR)
        got = js("(() => { Object.assign(traffic.find(c => !c.racer && !c.fleet), { z: odo + 800 }); " # one to take over, out of sight
                 "run.boss = true; rigClock = 0; updateRigs(0.01); const n = traffic.filter(c => c.rig && !c.wreck).length; "
                 "run.boss = false; rigClock = 0; updateRigs(0.01); rigClock = 1e9; return [n, traffic.filter(c => c.rig && !c.wreck).length]; })()")
        check(f"{layout}: no rig in a race the tank is in; one comes otherwise", got == [0, 1], got)

        # 6. the police's pursuit SUV: on the war rig, a police car sent is one, the hotter the likelier, one at a time
        js(CLEAR)
        send = """() => { lane = fromLane = 0; carX = MY_LANES[0]; copClock = 0; // on your side of the road: from behind
            for (const c of racers()) c.z = odo - 3000; // your crew's racers too: room to come past you
            Object.assign(traffic.find(c => !c.racer && !c.fleet && !c.police), { z: odo + 800 });
            const had = new Set(traffic.filter(c => c.police)); updatePolice(0.01); copClock = 1e9;
            return traffic.find(c => c.police && !had.has(c)); }"""
        got = js(f"""(() => {{ progress.wanted = 1; const a = ({send})(), first = [a.suv, notable(a), health(a), a.w], b = ({send})(), second = b.suv;
            progress.levels.rebuild = 0; traffic.forEach(c => {{ if (c.police) Object.assign(c, {{ police: false, suv: false, z: odo + 1500 }}); }});
            const c = ({send})(), before = c.suv; progress.levels.rebuild = 1; Object.assign(a, {{ police: true, suv: true, w: SUV.w, h: SUV.h }});
            return [...first, second, before]; }})()""")  # the third may be the first car again: it is made an SUV again after
        check(f"{layout}: at 100% heat an SUV is sent (notable, 600 health, 2.1 m wide); the next one a police car; none before the Rebuild",
              got == [True, True, 600, 2.1, False, False], got)
        got = js("""(() => { const c = traffic.find(c => c.suv && !c.wreck), out = [];
            const p = traffic.find(o => !o.racer && !o.fleet && !o.police && o !== c);
            Object.assign(p, { police: true, dir: 1, stage: 'brake', t: 0.001, z: odo + 30 }); policeDrive(p, 0.01); out.push(p.stage);
            Object.assign(c, { dir: 1, stage: 'brake', t: 0.001, z: odo + 30, lane }); policeDrive(c, 0.01); out.push(c.stage);
            c.z = odo - 31; policeDrive(c, 0.01); out.push(c.lane === 1 - lane, c.stage); return out; })()""")
        check(f"{layout}: braked, a police car leaves; the SUV drops back in your other lane, and 30 m behind comes past again",
              got == ["leave", "back", True, "pass"], got)
        got = js("""(() => { progress.toured = progress.toured.filter(id => id !== 'pursuit');
            traffic.forEach(c => { if (c.police && !c.suv) Object.assign(c, { police: false, dir: -1, z: odo + 1500 }); });
            const c = traffic.find(c => c.suv && !c.wreck); Object.assign(c, { stage: 'leave', want: speed, v: speed, z: odo + 60, x: MY_LANES[1 - lane], lane: 1 - lane });
            target = null; updateGang(0); return [target === c, notableTag(c)]; })()""")
        check(f"{layout}: in the reticle, its tag: SUV, 100%, 3 shots", got[0] and got[1].startswith("SUV · 100% · 3 SHOTS · "), got)
        pg.wait_for_timeout(400)
        got = js("[menuOpen && screen, tour.id, $('ar-label').textContent.slice(0, 4)]")
        check(f"{layout}: the first SUV in sight: its tutorial pops up", got == ["tour", "pursuit", "SUV "], got)
        pg.screenshot(path=f"{OUT}/rivals_{layout}_suv_tour.png")
        while js("menuOpen"): js("turnTour(1)"); pg.wait_for_timeout(50)
        pg.wait_for_timeout(300)
        pg.screenshot(path=f"{OUT}/rivals_{layout}_suv.png")
        got = js("""(() => { const c = traffic.find(c => c.suv && !c.wreck), hp = c.hp ?? health(c); ram({ car: c, kmh: 100, side: false });
            const scratch = hp - c.hp, s0 = run.scrap; hurtCar(c, 5000); return [Math.round(scratch), c.wreck, run.scrap - s0]; })()""")
        check(f"{layout}: a ram takes a fifth of a hit (20); totaled, 110 scrap", got == [20, True, 110], got)
        js("progress.wanted = 0")

        # 7. before the Rebuild, act 4's reticle as it was: the nearest car, the raiders' too
        js(CLEAR)
        got = js(f"(() => {{ progress.levels.rebuild = 0; const c = ({PUT})('car', 60, true); updateGang(0); "
                 f"const r = [target === c, quarry, crewTarget() === c]; progress.levels.rebuild = 1; return r; }})()")
        check(f"{layout}: before the Rebuild: the reticle on the nearest car, the raiders' car with it", got == [True, None, True], got)
        ctx.close()
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
