from playwright.sync_api import sync_playwright
import sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))  # tests/common.py
from common import URL, launch
BOT = """(i) => {
  settings.engine = i; play(FREE); state = 'running'; rpm = engine.idle;
  const dt = 1 / 120; let t = 0, t100 = null, now = 1e6;
  traffic.forEach(c => { c.dir = -1; c.x = LANES.oncoming[0]; }); gasPedal = 1; clutchPedal = 1; clutch = 0; placeLever(-1, -1);
  for (; t < 30; t += dt, now += dt * 1000) {
    if (t > 0.5 && t < 1.4) clutchPedal = Math.max(0, 1 - (t - 0.5) / 0.8);             // ease the clutch out over 0.8 s
    if (gear && gear < 6 && locked && rpm > engine.redline - 150 && !lever.path) { clutchPedal = 1; moveLever(gear + 1); }
    if (lever.path) { stepLever(dt); if (!lever.path) clutchPedal = 0; }
    stepCar(dt, updateEngine(dt, now));
    if (!t100 && speed * 3.6 >= 100) t100 = t - 0.5;
  }
  return { engine: engine.name, '0-100 s': t100 && +t100.toFixed(2), 'after 30 s km/h': Math.round(speed * 3.6), gear };
}"""
with sync_playwright() as p:
    b = launch(p); pg = b.new_page(); pg.on("console", lambda m: print("  ", m.text))
    pg.goto(URL); pg.wait_for_timeout(300)
    for i in range(3): print(pg.evaluate(BOT, i))
    b.close()
