"""Reckless driving and damage: collisions, rev loss, broken gears, pop-outs, head-on DNF, wreck, repairs, visuals."""
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
FULL = "{ power: 10, rev: 4, gears: 3, tyres: 4, time: 6, clutch: 1, gas: 1, shift: 1, steer: 1, engine: 2, grid: 40, rolling: 4, reckless: 1 }"
errors = []
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL); js = pg.evaluate; kb = pg.keyboard
    js(f"localStorage.clear(); Object.assign(progress, {{ racing: true, finish: 1, bank: 3000, levels: {FULL}, engine: 2, toured: TUTORIALS.map(t => t.id) }})")
    pg.click('[data-play="distance"]'); pg.wait_for_timeout(200); pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
    st = lambda: js("({ dmg: progress.damage, limit: engine.redline, stock: engine.stock.redline, broken: [...progress.broken], gear, lanes: openLanes, phase: run.phase })")
    print("start of race:", st())
    # a slower car right ahead in your lane: rear-end it
    hit = "(kmh) => { const c = traffic.find(c => c.dir > 0 && !c.racer); Object.assign(c, { z: odo + 4, x: carX, lane, v: speed - kmh / 3.6, d: 4, hit: -Infinity }); }"
    js(f"({hit})(60)"); pg.wait_for_timeout(300); print("rear-end at ~60 km/h closing:", st(), "| dmg text:", js("document.getElementById('cluster-dmg').textContent"))
    pg.screenshot(path=f"{OUT}/dmg_cracks1.png")
    js("progress.damage = 48"); js(f"({hit})(60)"); pg.wait_for_timeout(300); print("past 50%:", st())
    js("progress.damage = 68"); js(f"({hit})(60)"); pg.wait_for_timeout(300); print("past 70%:", st())
    print("gate labels:", js("[...document.querySelectorAll('#gate-labels text')].map(t => t.textContent).join(' ')"))
    pg.screenshot(path=f"{OUT}/dmg_gate.png")
    js("progress.damage = 95")
    for _ in range(4): pg.wait_for_timeout(1000); print("   at 95%:", js("({ gear, locked, thr: +throttle.toFixed(2), gasP: +gasPedal.toFixed(2), rpm: Math.round(rpm), red: engine.redline, kmh: Math.round(speed * 3.6), state, clutchP: +clutchPedal.toFixed(2) })"))
    # about one pop in 6 s of game time: a minute of the clock, as a busy machine runs the game slower
    pg.wait_for_function("popped > 0", timeout=60000); print("popped out at 95%:", st(), "| flash:", js("document.getElementById('flash').textContent"))
    # over the double yellow, into an oncoming car
    js("progress.damage = 30; applyUpgrades(); buildGate()")
    kb.press("ArrowLeft"); pg.wait_for_timeout(1200); kb.press("ArrowLeft"); pg.wait_for_timeout(1500)
    print("in the oncoming lane:", js("({ lane, carX: +carX.toFixed(2) })"))
    js("const c = traffic.find(c => c.dir < 0); Object.assign(c, { z: odo + 3 * (speed + c.v) - 5, x: carX, d: 999, warned: false })")
    pg.wait_for_timeout(250); print("warned:", js("traffic.some(c => c.dir < 0 && c.warned && c.beams > 0)"))
    pg.screenshot(path=f"{OUT}/dmg_oncoming.png")
    pg.wait_for_function("run.phase !== 'run'", timeout=10000); pg.wait_for_timeout(100)
    print("head-on:", st(), "| hud:", js("document.getElementById('run-dist').textContent"))
    pg.wait_for_function("run.phase === 'garage'", timeout=10000); pg.wait_for_timeout(200)
    print("report:", pg.inner_text("#report").split("\n")[0])
    print("repair card:", pg.inner_text(".card.repair").replace("\n", " · "))
    pg.screenshot(path=f"{OUT}/dmg_garage.png")
    js("progress.damage = 50; progress.broken = []; applyUpgrades()"); r50 = js("engine.redline")
    js("progress.damage = 69; applyUpgrades()"); r69 = js("engine.redline"); js("progress.damage = 100; applyUpgrades()"); r100 = js("engine.redline")
    print("rev limit at 50% / 69% / 100%:", r50, r69, r100)
    js("progress.damage = 100; progress.bank = 0; renderGarage()")
    print("wrecked, no metres: drive button:", js("document.getElementById('drive').disabled"), js("document.getElementById('drive').textContent"))
    pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
    print("limp run:", js("({ limp: run.limp, refill: run.refill, hud: document.getElementById('run-dist').textContent })"))
    pg.wait_for_function("run.phase !== 'run'", timeout=60000)
    print("limp run ended:", js("({ odo: Math.floor(odo), race: run.race, gain: run.gain, bank: progress.bank })"))
    pg.wait_for_function("run.phase === 'garage'", timeout=10000); pg.wait_for_timeout(200); print("report:", pg.inner_text("#report").split("\n")[0])
    pg.click("[data-repair]"); pg.wait_for_timeout(100); print("first repair:", js("({ dmg: progress.damage, bank: progress.bank, drive: document.getElementById('drive').textContent })"))
    js("progress.damage = 100; progress.bank = 1000; renderGarage()")
    pg.click("[data-repair]"); pg.wait_for_timeout(100)
    print("partial repair:", js("({ dmg: progress.damage, bank: progress.bank, broken: progress.broken, drive: document.getElementById('drive').disabled })"))
    js("progress.bank = 9000; renderGarage()"); pg.click("[data-repair]"); pg.wait_for_timeout(100)
    print("full repair:", js("({ dmg: progress.damage, bank: progress.bank, broken: progress.broken, limit: engine.redline, cracks: document.querySelectorAll('#cracks polyline').length })"))
    b.close()
print("ERRORS:", errors or "none")
