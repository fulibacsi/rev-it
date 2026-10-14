"""Headlight flash charges: 1-10 a run, auto flash from 5, no flash wasted on racers, autocruise overtakes a racer by
moving over behind an ordinary car it can flash away, a game of chicken moves oncoming cars, and Auto flash plays it
once you have it. Extra flashes don't change the reveal's head start."""
from playwright.sync_api import sync_playwright
from common import URL, launch
CAR = "power: 10, rev: 4, gears: 3, tyres: 4, time: 6, clutch: 1, gas: 1, shift: 1, engine: 2, steering: 3"
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL); js = pg.evaluate; kb = pg.keyboard
    def start(levels, extra=""):
        js(f"localStorage.clear(); Object.assign(progress, {{ racing: true, finish: 1, bank: 9e6, levels: {{ {levels} }}, engine: 2 {extra} }})")
        if js("game.id") != "distance": pg.click('[data-play="distance"]'); pg.wait_for_timeout(200)
        else: js("run.left = 0.1"); pg.wait_for_function("run.phase === 'garage'", timeout=15000)
        js("refreshCar()"); pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000); pg.wait_for_timeout(200)
        js("traffic.forEach(c => { if (!c.racer) { c.dir = -1; c.x = LANES.oncoming[0]; } else c.z = odo - 9000; }); window.crashes = 0; "
           "if (!DISTANCE.crash0) { DISTANCE.crash0 = DISTANCE.crash; DISTANCE.crash = i => { crashes++; DISTANCE.crash0(i); }; }")
    # 1. prices, and auto flash from 5 flashes
    js("Object.assign(progress, { bank: 9e6, levels: { flash: 4 } })")
    check("auto flash locked with 4 flashes", js("whyNot('autoflash')") == "needs 5 flashes", js("whyNot('autoflash')"))
    js("progress.levels.flash = 5")
    check("auto flash for sale with 5 flashes", js("whyNot('autoflash')") == "", js("whyNot('autoflash')"))
    print("   flash prices:", js("Array.from({ length: 10 }, (_, l) => { progress.levels.flash = l; return cost('flash'); })"))
    # 2. charges: 3 flashes a run, the 4th press does nothing
    start(CAR + ", flash: 3")
    left = []
    for _ in range(4): kb.press("f"); left.append(js("run.flashes")); pg.wait_for_timeout(900)
    check("F spends a flash each, none past the 3rd", left == [2, 1, 0, 0], left)
    check("HUD shows 0 flashes, dimmed", js("[$('hud-flashes').textContent, $('hud-beam').classList.contains('empty')]") == ["0", True],
          js("[$('hud-flashes').textContent, $('hud-beam').classList.contains('empty')]"))
    # 3. auto flash: never because of a racer in front (an ordinary car beyond it doesn't count); an ordinary car: once
    start(CAR + ", flash: 5, autoflash: 1")
    place = """(spec) => { const cars = traffic.filter(c => c.dir < 0 && !c.racer), rs = racers(); spec.forEach(([kind, ahead, lane_, kmh], i) => {
        const c = kind === 'racer' ? rs[i] : cars[i]; Object.assign(c, { tag: i, dir: 1, z: odo + ahead, lane: lane_, x: MY_LANES[lane_], v: kmh / 3.6, want: kmh / 3.6, cool: 99, yielding: false, d: ahead }); }); }"""
    js("lane = 0; carX = MY_LANES[0]")
    js(f"({place})([['racer', 40, 0, 60], ['car', 90, 0, 50]])"); n0 = js("run.flashes"); pg.wait_for_timeout(1500)
    check("racer in front, a car beyond it: no flash", js("run.flashes") == n0, f"{n0} -> {js('run.flashes')}, kmh {js('Math.round(speed * 3.6)')}")
    js("racers().forEach(c => c.z = odo - 9000); traffic.forEach(c => { if (!c.racer) { c.dir = -1; c.x = LANES.oncoming[0]; } })")
    js(f"({place})([['car', 80, 0, 40]])"); n0 = js("run.flashes"); pg.wait_for_timeout(2500)
    check("a slow car in front: flashed once, it moved over", js("run.flashes") == n0 - 1 and js("traffic.find(c => c.tag === 0 && c.dir > 0 && !c.racer).lane") == 1,
          f"{n0} -> {js('run.flashes')}, its lane {js('traffic.find(c => c.tag === 0 && c.dir > 0 && !c.racer)?.lane')}")
    # 4. autocruise: a racer close in front, a slow ordinary car a bit further in the other lane (on reach alone, staying
    #    behind the racer looks better): with a flash it moves over and flashes the car away; without one it stays
    for flashes, want in [(5, "overtakes"), (0, "stays")]:
        start(CAR + ", steer: 1, cruise: 1, rolling: 6, flash: 5, autoflash: 1")
        js(f"run.flashes = {flashes}; lane = 0; carX = MY_LANES[0]; speed = 250 / 3.6")
        js(f"({place})([['racer', 40, 0, 200], ['car', 120, 1, 110]])")
        trace = js("""() => new Promise(res => { const out = [], R = racers()[0], O = traffic.find(c => !c.racer && c.tag === 1 && c.dir > 0); let t = 0;
            const h = setInterval(() => { out.push([+(t += 0.25).toFixed(2), lane, O.lane, run.flashes, Math.round(R.z - odo), Math.round(O.z - odo), Math.round(speed * 3.6)]);
              if (t >= 6) { clearInterval(h); res(out); } }, 250); })""")
        moved = any(r[1] == 1 for r in trace if 0 < r[5] < 500); passed_r = trace[-1][4] < 0  # moved while the car was ahead
        back = any(a[1] == 1 and b[1] == 0 and b[4] > 0 for a, b in zip(trace, trace[1:]))  # back behind the racer
        print(f"   flashes {flashes}: [t, lane, car's lane, flashes, racer m, car m, km/h]")
        for r in trace[:16:2]: print("     ", r)
        if want == "overtakes": check("with a flash: moves over, flashes the car away, passes the racer", moved and not back and trace[-1][2] == 0 and passed_r and js("crashes") == 0,
                                      f"moved {moved}, back behind {back}, car lane {trace[-1][2]}, racer {trace[-1][4]} m, crashes {js('crashes')}")
        else: check("no flash left: stays behind the racer while the car is ahead (as before)", not moved and js("crashes") == 0, f"moved {moved}, crashes {js('crashes')}")
    # 6. a game of chicken: in an oncoming lane a flash spends a charge and moves nobody, unless you have the upgrade;
    #    then the oncoming car in your lane swerves into its other lane, and there is no head-on
    js("Object.assign(progress, { levels: { flash: 3 } })")
    check("Game of chicken needs Reckless driving", js("whyNot('chicken')") == "needs Reckless driving", js("whyNot('chicken')"))
    js("Object.assign(progress, { levels: { reckless: 1 } })")
    check("Game of chicken needs Headlight flash", js("whyNot('chicken')") == "needs Headlight flash", js("whyNot('chicken')"))
    for chicken in [0, 1]:
        start(CAR + f", reckless: 1, flash: 3, chicken: {chicken}")
        js("traffic.forEach(c => { if (!c.racer) c.z = odo + 4000; }); lane = fromLane = 2; carX = ROAD_LANES[2]; "
           "window.ch = traffic.find(c => !c.racer); Object.assign(ch, { dir: -1, x: LANES.oncoming[0], z: odo + 150, v: 25, swerve: null, warned: false })")
        n0 = js("run.flashes"); kb.press("f"); pg.wait_for_timeout(1500)
        got = js("({ flashes: run.flashes, x: ch.x, ahead: Math.round(ch.z - odo) })")
        if not chicken:
            js("lane = fromLane = 0; carX = ROAD_LANES[0]")  # out of its way before it arrives
            check("no chicken: the flash is spent, the oncoming car stays in your lane", got["flashes"] == n0 - 1 and got["x"] == -1.75, got)
        else:
            pg.wait_for_function("ch.z < odo - 10", timeout=15000)
            check("chicken: the oncoming car swerves into its other lane and passes, no head-on",
                  got["flashes"] == n0 - 1 and got["x"] == -5.25 and js("crashes") == 0 and js("run.phase") == "run",
                  {**got, "crashes": js("crashes"), "phase": js("run.phase")})
    # 7. Auto flash plays chicken once you have Game of chicken: in an oncoming lane, the car coming at you swerves
    #    without a press of F; without the upgrade it keeps to your side and spends nothing
    for chicken in [0, 1]:
        start(CAR + f", reckless: 1, flash: 3, autoflash: 1, chicken: {chicken}")
        js("traffic.forEach(c => { if (!c.racer) c.z = odo + 4000; }); lane = fromLane = 2; carX = ROAD_LANES[2]; "
           "window.ch = traffic.find(c => !c.racer); Object.assign(ch, { dir: -1, x: LANES.oncoming[0], z: odo + 150, v: 25, swerve: null, warned: false })")
        n0 = js("run.flashes"); pg.wait_for_timeout(1500)
        got = js("({ flashes: run.flashes, x: ch.x, ahead: Math.round(ch.z - odo) })")
        if not chicken:
            js("lane = fromLane = 0; carX = ROAD_LANES[0]")
            check("Auto flash, no chicken: no flash spent on the oncoming car", got["flashes"] == n0 and got["x"] == -1.75, got)
        else:
            pg.wait_for_function("ch.z < odo - 10", timeout=15000)
            check("Auto flash with chicken: flashes the oncoming car, it swerves, no head-on",  # across, or nearly
                  got["flashes"] == n0 - 1 and abs(got["x"] + 5.25) < 0.3 and js("crashes") == 0 and js("run.phase") == "run",
                  {**got, "crashes": js("crashes"), "phase": js("run.phase")})
    # 5. the reveal's head start counts the first flash only
    hs = js("""[0, 1, 10].map(f => { progress.levels = { power: 10, rev: 4, gears: 3, tyres: 4, time: 6, steering: 3, clutch: 1, gas: 1, shift: 1,
               steer: 1, cruise: 1, engine: 2, autoflash: 1, flash: f }; return Math.round(headStart()); })""")
    check("head start: flash 1 and 10 alike, fully built = 400", hs[1] == hs[2] == 400 and hs[0] > 400, hs)
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
