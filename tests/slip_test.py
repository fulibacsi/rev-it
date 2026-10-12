"""Locked drivetrain given more torque than a part-engaged clutch holds: it must slip and keep driving the car (the
slip direction once came out as 0 when the lock broke, and the car got no drive at all). Every engine, 2nd gear."""
from playwright.sync_api import sync_playwright
from common import URL, launch
# hold the clutch at 30% engagement with the gas floored
HOLD = "gasPedal = 1; clutchPedal = CAR.bite[1] - 0.3 * (CAR.bite[1] - CAR.bite[0]);"
errors, fails = [], []
with sync_playwright() as p:
    b = launch(p)
    pg = b.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL)
    for i, name in enumerate(pg.evaluate("ENGINES.map(e => e.name)")):
        r = pg.evaluate(f"""() => {{
          engine = ENGINES[{i}]; state = 'running'; gear = 2; speed = 3000 * RAD * CAR.wheel / ratio(); rpm = wheelRpm();
          locked = true; throttle = 1; boost = 1; odo = 0;
          const dt = 1 / 120, v0 = speed; let now = performance.now(), slipped = 0;
          for (let i = 0; i < 120; i++) {{ {HOLD} stepCar(dt, updateEngine(dt, now)); now += dt * 1000; if (!locked) slipped++; }}
          return {{ dv: +((speed - v0) * 3.6).toFixed(2), slip: Math.round(rpm - wheelRpm()), slipped, clutch: +clutch.toFixed(2) }};
        }}""")
        ok = r["dv"] > 0 and r["slip"] > 0
        if not ok: fails.append(name)
        print(f"{'ok ' if ok else 'FAIL'} {name:13} km/h gained in 1 s: {r['dv']:6}  rpm above the wheels: {r['slip']:5}")
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
