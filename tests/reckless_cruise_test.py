"""Reckless auto-drive: autocruise without manners. Boxed in it passes in the oncoming lane and comes home, plays
chicken with what comes (with Game of chicken), goes home from what it can't flash away, revs into the ECU tune while
the engine is cool, and pushes the nitro pedal for a racer close ahead, but not under your foot."""
from playwright.sync_api import sync_playwright
from common import URL, launch
CAR = ("power: 10, rev: 4, gears: 3, tyres: 4, time: 6, clutch: 1, gas: 1, shift: 1, engine: 2, steering: 3, steer: 1, "
       "cruise: 1, flash: 5, reckless: 1, recklessCruise: 1")
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL); js = pg.evaluate; kb = pg.keyboard
    def start(levels, kmh=0):
        js(f"localStorage.clear(); Object.assign(progress, {{ racing: true, finish: 1, bank: 9e6, levels: {{ {levels} }}, engine: 2, toured: TUTORIALS.map(t => t.id) }})")
        if js("game.id") != "distance": pg.click('[data-play="distance"]'); pg.wait_for_timeout(200)
        else: js("run.left = 0.1"); pg.wait_for_function("run.phase === 'garage'", timeout=15000)
        js("refreshCar()"); pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000); pg.wait_for_timeout(200)
        # an empty road: ordinary cars far off, racers far behind; count collisions
        js("traffic.forEach(c => { c.z = odo + 3000 + 50 * c.tag0; }); racers().forEach(c => c.z = odo - 9000); window.crashes = 0; "
           "if (!DISTANCE.crash0) { DISTANCE.crash0 = DISTANCE.crash; DISTANCE.crash = i => { crashes++; DISTANCE.crash0(i); }; } 0")
        if kmh: js(f"speed = {kmh} / 3.6")
    js("traffic.forEach((c, i) => c.tag0 = i)")
    place = """(spec) => { const cars = traffic.filter(c => !c.racer); spec.forEach(([dir, x, ahead, kmh], i) => Object.assign(cars[i],
        { dir, x, lane: dir > 0 ? MY_LANES.indexOf(x) : 0, z: odo + ahead, v: kmh / 3.6, want: kmh / 3.6, cool: 99, yielding: false, swerve: null, warned: false, d: ahead })); }"""
    watch = """(secs) => new Promise(res => { const out = []; let t = 0; const h = setInterval(() => { out.push([+(t += 0.25).toFixed(2), lane, Math.round(speed * 3.6), run.flashes]);
        if (t >= secs) { clearInterval(h); res(out); } }, 250); })"""
    # 1. what it needs
    why = lambda: js("whyNot('recklessCruise')")  # the upgrade graph: the Black market, Autocruise, 7th gear
    js("Object.assign(progress, { levels: { reckless: 1, steer: 1 } })")
    check("needs Autocruise, and 7th gear, out of sight: ???", why() == "needs Autocruise · ???", why())
    js("Object.assign(progress, { levels: { steer: 1, gas: 1, shift: 1, clutch: 1, cruise: 1, reckless: 1, gears: 3 } })")
    check("needs 7th gear (18 Oct), in sight with the Gearbox maxed", why() == "needs ✓ Autocruise · 7th gear", why())
    js("progress.levels.gear7 = 1")
    check("with 7th gear, on sale", js("whyNot('recklessCruise')") in ("", "short"), js("whyNot('recklessCruise')"))
    # the car below has no 7th gear: one bought before the gate keeps working (the checks that follow)
    # 2. boxed in on your side, nothing coming: over the line, past, and home again
    # up to speed on its own first, then two slow cars close ahead: under 3 s away at once, before autocruise has
    # braked to their speed (behind them at their speed it would stay: it is only boxed in while closing)
    start(CAR); pg.wait_for_function("gear >= 3 && speed > 30", timeout=20000)
    js(f"lane = fromLane = 1; carX = MY_LANES[1]; slide = 0; ({place})([[1, MY_LANES[0], 30, 40], [1, MY_LANES[1], 35, 40]])")
    trace = js(f"({watch})(8)")
    over = any(r[1] == 2 for r in trace); home = trace[-1][1] <= 1
    check("boxed in: passes in the oncoming lane and comes home, no crash", over and home and js("crashes") == 0,
          f"lanes {[r[1] for r in trace[::4]]}, crashes {js('crashes')}")
    # 3, 4. over there, your side blocked by a car alongside (kept there): an oncoming car 200 m off. With Game of chicken
    #    it is flashed into its other lane and the car stays over there; without, the car stays out until a head-on
    #    is under 2 s away, then cuts in beside the other car: a bump, but no head-on
    beside = "const b = traffic.filter(c => !c.racer)[0]; b.z = odo + 1; b.v = b.want = speed;"
    for chicken in [1, 0]:
        start(CAR + (", chicken: 1" if chicken else ""), 120)
        js(f"lane = fromLane = 2; carX = ROAD_LANES[2]; ({place})([[1, MY_LANES[1], 1, 120], [-1, LANES.oncoming[0], 200, 90]])")
        trace = js(f"() => new Promise(res => {{ const out = []; let t = 0; const h = setInterval(() => {{ {beside} out.push([+(t += 0.25).toFixed(2), lane, run.flashes]);"
                   f"  if (t >= 4) {{ clearInterval(h); res(out); }} }}, 250); }})")
        swerved, lanes = js("traffic.filter(c => !c.racer)[1].swerve"), [r[1] for r in trace[::2]]
        if chicken:
            check("chicken: flashes the oncoming car away and stays over there, no crash",
                  swerved == -5.25 and trace[-1][2] == 4 and all(l == 2 for l in lanes) and js("crashes") == 0, f"its swerve {swerved}, lanes {lanes}, crashes {js('crashes')}")
        else:
            # where it ends up varies: once the oncoming car has passed, still boxed in, it may go straight back out
            check("no chicken: stays out until the head-on is near, then cuts in: no head-on",
                  swerved is None and lanes[0] == 2 and min(lanes) <= 1 and js("run.phase") == "run", f"lanes {lanes}, crashes {js('crashes')}, phase {js('run.phase')}")
    # 5. nitro: a racer 300 m ahead, the road clear: its foot on the nitro pedal (which goes down), not under yours
    start(CAR + ", ecuPower: 1, nitro: 2"); pg.wait_for_function("gear >= 3", timeout=20000)
    js("progress.nitro = 4; racers()[0].z = odo + 300; racers()[0].v = speed + 5")
    # watched for 0.6 s, not at one instant: a gear change goes through neutral, and it uses nitro from 2nd up
    got = js("""() => new Promise(res => { let seen = false, t = 0; const h = setInterval(() => {
        seen ||= nitroByAid && nitro && $('nos').style.transform.includes('rotateX(25deg)');
        if ((t += 50) >= 600) { clearInterval(h); res({ seen, left: +progress.nitro.toFixed(1) }); } }, 50); })""")
    check("a racer close ahead: it pushes the nitro pedal and nitro burns", got["seen"] and got["left"] < 4, got)
    kb.down(" "); pg.wait_for_timeout(200); got = js("({ nitroByAid, nitro })"); kb.up(" ")
    check("your foot on the gas: it takes its foot off the nitro pedal", not got["nitroByAid"] and not got["nitro"], got)
    js("racers()[0].z = odo - 9000"); pg.wait_for_timeout(200)
    check("no racer close ahead: no nitro", not js("nitroByAid"), js("({ nitroByAid, nitro })"))
    # 6. the ECU tune: its revs while the engine is cool, the factory map once it is warm (until it has cooled down)
    start(CAR + ", ecuRev: 4", 0); pg.wait_for_timeout(300)
    stock = js("engine.stock.redline")
    got = js("({ heat: +heat.toFixed(2), revCap })")
    check("cool engine: the tuned rev range", got["revCap"] is None or got["revCap"] > stock, got)
    js("heat = 0.65"); pg.wait_for_timeout(100); got = js("({ heat: +heat.toFixed(2), revCap })")
    check("warm engine (0.65): the factory map", got["revCap"] == stock, got)
    js("heat = 0.5"); pg.wait_for_timeout(100); got = js("({ heat: +heat.toFixed(2), revCap })")
    check("cooling down (0.5): still the factory map", got["revCap"] == stock, got)
    js("heat = 0.3"); pg.wait_for_timeout(100); got = js("({ heat: +heat.toFixed(2), revCap })")
    check("cool again (0.3): the tuned rev range", got["revCap"] is None or got["revCap"] > stock, got)
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
