"""Playtest feedback: still wheel, easier grip, steering upgrade, gas overrides the aids, over-rev while pushing,
headlight flash and auto flash, racers' lane-change cooldown, garage fit."""
import math
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
CAR = "power: 10, rev: 4, gears: 3, tyres: 4, time: 6, clutch: 1, gas: 1, shift: 1, engine: 2"
errors = []
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL); js = pg.evaluate; m = pg.mouse; kb = pg.keyboard
    def start(levels, extra=""):
        js(f"localStorage.clear(); Object.assign(progress, {{ racing: true, finish: 1, bank: 9e6, levels: {{ {levels} }}, engine: 2, toured: TUTORIALS.map(t => t.id) {extra} }})")
        if js("game.id") != "distance": pg.click('[data-play="distance"]'); pg.wait_for_timeout(200)
        else: js("run.left = 0.1"); pg.wait_for_function("run.phase === 'garage'", timeout=15000)
        js("refreshCar()")  # as buying in the garage does
        pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000); pg.wait_for_timeout(300)
    def wheel_xy(dx, dy=0):  # a point on the wheel in its own units, from the top of the rim
        bb = pg.locator("#wheel").bounding_box(); return bb["x"] + (500 + dx) / 1000 * bb["width"], bb["y"] + (60 + dy) / 300 * bb["height"]
    def turn(units, grab_dy=0):
        m.move(*wheel_xy(0, grab_dy)); m.down()
        for k in range(1, 9): m.move(*wheel_xy(units * k / 8, grab_dy)); pg.wait_for_timeout(15)
        r = js("({ lane, angle: Math.round(wheel.angle) })"); m.up(); return r
    start(CAR + ", steer: 1")
    swing = js("(() => new Promise(res => { let most = 0, n = 0; const t = setInterval(() => { most = Math.max(most, Math.abs(steer)); if (++n > 40) { clearInterval(t); res(most); } }, 50); }))()")
    print("1. largest wheel angle over 2 s of driving, hands off:", round(swing, 2))
    print("2. grabbed 70 units below the rim's top (off the rim), nudged 30 units:", turn(30, 70), "| dragged 80 units:", turn(-80, 70))
    for lv in (0, 3):  # 3. lane change time at a held 100 km/h
        start(CAR + f", steering: {lv}")
        t = js("""(() => { traffic.forEach(c => { if (!c.racer) { c.dir = -1; c.x = LANES.oncoming[0]; } else c.z = odo - 9000; }); speed = 100 / 3.6; carX = MY_LANES[0]; lane = 0; slide = 0;
          changeLane(-1); let t = 0; while (Math.abs(carX - MY_LANES[1]) > 0.1 && t < 10) { speed = 100 / 3.6; stepLane(1 / 120); t += 1 / 120; } return +t.toFixed(2); })()""")
        print(f"3. steering {lv}: a lane change at 100 km/h takes {t} s")
    # 4. boxed in behind slower cars in both lanes: autocruise brakes, unless you hold the gas
    start(CAR + ", steer: 1, cruise: 1")
    box = "(() => { traffic.filter(c => c.dir > 0).slice(0, 2).forEach((c, i) => Object.assign(c, { z: odo + 32, x: MY_LANES[i], lane: i, v: speed - 15, want: speed - 15, d: 32 })); })()"
    js(box); pg.wait_for_timeout(400); print("4. boxed in, hands off:", js("({ brake: +brakePedal.toFixed(2), gas: +gasPedal.toFixed(2) })"))
    kb.down(" "); js(box); pg.wait_for_timeout(400); print("   boxed in, holding Space:", js("({ brake: +brakePedal.toFixed(2), gas: +gasPedal.toFixed(2), pushing: pushing() })")); kb.up(" ")
    # 5. a tuned engine with the aids: under the factory redline unless you push
    start(CAR + ", reckless: 1, ecuRev: 4, ecuPower: 2, rolling: 4")
    js("traffic.forEach(c => { if (!c.racer) { c.dir = -1; c.x = LANES.oncoming[0]; } else c.z = odo - 9000; })")
    top = lambda: js("(() => new Promise(res => { let most = 0, n = 0; const t = setInterval(() => { most = Math.max(most, rpm); if (++n > 80) { clearInterval(t); res(Math.round(most)); } }, 50); }))()")
    print("5. highest rpm in 4 s, hands off:", top(), "| holding Space:", (kb.down(" "), top())[1], "| factory redline", js("engine.stock.redline"), "tuned", js("engine.redline")); kb.up(" ")
    # 6. flash: an ordinary car ahead in your lane moves over, a racer doesn't
    start(CAR + ", flash: 1")
    js("traffic.forEach(c => { if (!c.racer) { c.dir = -1; c.x = LANES.oncoming[0]; } else c.z = odo - 9000; })")
    js("const [a, r] = [traffic.find(c => !c.racer), racers()[0]]; Object.assign(a, { dir: 1, z: odo + 80, x: carX, lane, v: speed - 8, want: speed - 8 }); Object.assign(r, { z: odo + 140, x: carX, lane, v: speed - 8, want: speed - 8 });")
    print("6. light stalk shown:", js("getComputedStyle(document.getElementById('stalk')).display"))
    kb.press("f"); pg.wait_for_timeout(1500)
    print("   after F: car moved to", js("traffic.find(c => !c.racer && c.dir > 0).lane"), "(you are in", js("lane"), ") | racer stayed in", js("racers()[0].lane"))
    # 7. auto flash
    start(CAR + ", flash: 1, autoflash: 1")
    js("traffic.forEach(c => { if (!c.racer) { c.dir = -1; c.x = LANES.oncoming[0]; } else c.z = odo - 9000; })")
    js("Object.assign(traffic.find(c => !c.racer), { dir: 1, z: odo + 90, x: carX, lane, v: speed - 10, want: speed - 10 })")
    pg.wait_for_timeout(1500); print("7. auto flash moved it to lane", js("traffic.find(c => !c.racer && c.dir > 0).lane"), "(you are in", js("lane"), ")")
    # 8. a racer stuck behind a slow car pulls out; boxed in again in its new lane, it has to wait 5 s to change back
    js("traffic.forEach(c => { if (!c.racer) { c.dir = -1; c.x = LANES.oncoming[0]; } })")
    r8 = js("""(() => { const [r, ...rest] = racers(), slow = traffic.filter(c => !c.racer).slice(0, 2);
      rest.forEach(c => c.z = odo - 9000);
      Object.assign(r, { z: odo + 400, lane: 0, x: MY_LANES[0], v: 60, want: 60, cool: 0 });
      Object.assign(slow[0], { dir: 1, z: odo + 440, lane: 0, x: MY_LANES[0], v: 30, want: 30 });
      Object.assign(slow[1], { dir: 1, z: odo + 9000, lane: 1, x: MY_LANES[1], v: 30, want: 30 });
      const log = []; let t = 0, was = r.lane;
      for (let i = 0; i < 12 * 60; i++, t += 1 / 60) {
        if (i === 120) Object.assign(slow[1], { z: r.z + 30 }); // 2 s in: now a slow car ahead in its new lane too
        driveCar(r, 1 / 60); driveCar(slow[0], 1 / 60); driveCar(slow[1], 1 / 60);
        if (r.lane !== was) { log.push(+t.toFixed(2)); was = r.lane; }
      }
      return log; })()""")
    print("8. the racer's lane changes (s):", r8)
    b.close()
    for w, h, touch in [(1000, 700, False), (844, 390, True)]:
        b = launch(p); ctx = b.new_context(viewport={"width": w, "height": h}, has_touch=touch, is_mobile=touch)
        pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
        if touch: ctx.new_cdp_session(pg).send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
        pg.goto(URL); pg.wait_for_timeout(300); pg.evaluate("localStorage.clear(); progress.bank = 5000"); pg.click('[data-play="distance"]'); pg.wait_for_timeout(300)
        print(f"garage {w}x{h}:", pg.evaluate("[document.getElementById('garage').scrollHeight, document.getElementById('garage').clientHeight, document.querySelectorAll('#cards .card').length]"))
        pg.screenshot(path=f"{OUT}/garage13_{w}.png"); b.close()
print("ERRORS:", errors or "none")
