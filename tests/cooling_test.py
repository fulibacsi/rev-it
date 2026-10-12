"""ECU tune and heat: how fast it overheats flat out, what that costs, and that easing off cools it."""
from playwright.sync_api import sync_playwright
from common import URL, launch
BASE = "power: 10, rev: 4, gears: 3, tyres: 4, time: 6, clutch: 1, gas: 1, shift: 1, engine: 2, rolling: 4, reckless: 1"
SIM = """(secs) => { // flat out with the aids, no traffic; heat and damage over time
  run.phase = 'run'; state = 'running'; traffic.forEach(c => { if (!c.racer) { c.dir = -1; c.x = LANES.oncoming[0]; } else c.z = -1e6; });
  const dt = 1 / 120, log = []; let now = 1e6;
  for (let t = 0; t <= secs; t += dt, now += dt * 1000) {
    updateControls(dt); updateAids(dt); stepCar(dt, updateEngine(dt, now)); damageTick(dt);
    if (Math.abs(t % 5) < dt) log.push([Math.round(t), Math.round(speed * 3.6), Math.round(rpm), +heat.toFixed(2), +progress.damage.toFixed(1)]);
  }
  return log;
}"""
with sync_playwright() as p:
    b = launch(p); pg = b.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(300); js = pg.evaluate
    for tune in ("ecuRev: 4, ecuPower: 4, off: 1,", "ecuRev: 4, ecuPower: 4, cooling: 3, off: 1,"):
        off = "{ gas: true }" if "off" in tune else "{}"
        js(f"localStorage.clear(); Object.assign(progress, {{ racing: true, finish: 1, damage: 0, broken: [], levels: {{ {tune.replace('off: 1,', '')} {BASE} }}, engine: 2, off: {off} }}); play(DISTANCE); refreshCar(); coolDown(); gasPedal = 1")
        js("gear = 3; speed = 130 / 3.6; rpm = wheelRpm(); locked = true; Object.assign(lever, { x: 0, y: -1 })")
        log = js(SIM, 40)
        print(f"{(tune.replace('off: 1,', '(auto gas off, floored)') or 'no tune'):48} [t, km/h, rpm, heat, dmg]:", log)
    b.close(); print("ERRORS:", errs or "none")
