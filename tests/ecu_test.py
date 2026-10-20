"""ECU tune with the driver aids (phone layout): hands off, the aids use the tune in every gear while the engine is
cool (the factory map when hot), a tune never makes the car slower; a finger on the gas uses the tuned rev range."""
from playwright.sync_api import sync_playwright
from common import URL, launch
CAR = "power: 10, rev: 4, gears: 3, tyres: 4, time: 6, clutch: 1, gas: 1, shift: 1, engine: 2, steer: 1, cruise: 1, steering: 3, reckless: 1"
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    ctx = b.new_context(viewport={"width": 844, "height": 390}, is_mobile=True, has_touch=True); pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
    cdp = ctx.new_cdp_session(pg); cdp.send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
    pg.goto(URL); js = pg.evaluate
    def start(levels):
        js(f"localStorage.clear(); Object.assign(progress, {{ racing: true, finish: 1, bank: 9e6, levels: {{ {levels} }}, engine: 2, toured: TUTORIALS.map(t => t.id) }})")
        if js("game.id") != "distance": pg.tap('[data-play="distance"]'); pg.wait_for_timeout(200)
        else: js("run.left = 0.1"); pg.wait_for_function("run.phase === 'garage'", timeout=15000)
        js("refreshCar()"); pg.tap("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
    # 14 s on an empty road, heat held at 0: the highest rpm in each gear and the speed reached
    probe = """(secs) => new Promise(res => { const most = {}; const t0 = performance.now(); const t = setInterval(() => {
        traffic.forEach(c => { if (!c.racer) { c.dir = -1; c.x = LANES.oncoming[0]; } else c.z = odo - 9000; }); heat = 0;
        if (gear) most[gear] = Math.max(most[gear] || 0, Math.round(rpm));
        if (performance.now() - t0 > secs * 1000) { clearInterval(t); res({ most, kmh: Math.round(speed * 3.6), stock: engine.stock.redline }); } }, 30); })"""
    hands_off = {}
    for label, extra in [("no ECU", ""), ("ECU power 4", ", ecuPower: 4"), ("ECU rev 4", ", ecuRev: 4"), ("both", ", ecuRev: 4, ecuPower: 4")]:
        start(CAR + extra); r = js(f"({probe})(14)"); hands_off[label] = r
        print(f"   {label:12} hands off: {r['kmh']} km/h, highest rpm per gear {r['most']}")
    base = hands_off["no ECU"]["kmh"]
    for label, r in list(hands_off.items())[1:]:
        check(f"{label}, hands off: no slower than untuned ({base} km/h)", r["kmh"] >= base - 5, f"{r['kmh']} km/h")
    for label in ["ECU rev 4", "both"]:  # the tune in every gear ("ECU only works in 6th gear" was a bug)
        r = hands_off[label]
        check(f"{label}, hands off: past the factory redline in every gear", all(v > r["stock"] + 400 for v in r["most"].values()), r["most"])
    # hot, the aids keep to the factory map from 0.6 until the engine has cooled below 0.4, well short of the red
    cap = lambda h: js(f"() => new Promise(res => {{ heat = {h}; setTimeout(() => res(revCap === engine.stock.redline ? 'factory' : 'tuned'), 150); }})")
    got = [cap(h) for h in (0.65, 0.5, 0.3, 0.5)]
    check("tuned, hands off: the factory map from heat 0.6 until it has cooled below 0.4", got == ["factory", "factory", "tuned", "tuned"], got)
    start(CAR + ", ecuRev: 4, ecuPower: 4")
    g = pg.locator("#gas").bounding_box(); x, y = g["x"] + g["width"] / 2, g["y"] + g["height"] / 2
    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y, "id": 1}]})
    r = js(f"({probe})(14)")
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": [{"x": x, "y": y, "id": 1}]})
    print(f"   finger on the gas: {r['kmh']} km/h, highest rpm per gear {r['most']}")
    check("finger on the gas: past the factory redline in every gear", all(v > r["stock"] + 800 for v in r["most"].values()), r["most"])
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
