"""Nitro and 7th gear: gating, burning with N / the nitro pedal (both floor the gas), extra pull, heat and damage, refill."""
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
LV = "power: 10, rev: 4, gears: 3, tyres: 4, time: 6, clutch: 1, gas: 1, shift: 1, engine: 2, rolling: 4, reckless: 1, ecuRev: 2, ecuPower: 2"
errors = []
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL); js = pg.evaluate; kb = pg.keyboard
    js(f"localStorage.clear(); Object.assign(progress, {{ racing: true, finish: 1, points: 20000, bank: 5000, levels: {{ {LV} }}, engine: 2, runs: 1, toured: TUTORIALS.map(t => t.id) }})")
    pg.click('[data-play="distance"]'); pg.wait_for_timeout(200); pg.click('[data-tab="black"]')
    card = lambda name: js(f"[...document.querySelectorAll('#cards .card')].map(c => c.innerText.replace(/\\n/g, ' · ')).find(t => t.startsWith('{name}'))")
    print("7th gear before nitro:", card("7th gear"))
    pg.click('[data-buy="nitro"]'); pg.click('[data-buy="nitro"]'); pg.wait_for_timeout(100)
    print("nitro x2:", card("Nitro")); print("7th gear after nitro:", card("7th gear"))
    pg.click('[data-buy="gear7"]'); pg.wait_for_timeout(100)
    print("bought 7th:", js("({ top: topGear(), gate: document.getElementById('shifter').getAttribute('viewBox'), labels: [...document.querySelectorAll('#gate-labels text')].map(t => t.textContent).join(' '), speedo: SPEEDO_MAX })"))
    pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
    print("tank:", js("progress.nitro"), "refill cost:", js("run.refill"), "| pedal shown:", js("getComputedStyle(document.getElementById('nos')).display"))
    traffic_off = "traffic.forEach(c => { if (!c.racer) { c.dir = -1; c.x = LANES.oncoming[0]; } else c.z = odo - 5000; })"
    js(traffic_off); pg.wait_for_timeout(1500)
    v0 = js("speed"); pg.wait_for_timeout(1000); plain = (js("speed") - v0) * 3.6
    kb.down("n"); v0 = js("speed"); pg.wait_for_timeout(1000); boosted = (js("speed") - v0) * 3.6
    print(f"km/h gained in 1 s: plain {plain:.1f}, with nitro {boosted:.1f} | burning:", js("({ nitro, left: +progress.nitro.toFixed(1), heat: +heat.toFixed(2), dmg: +progress.damage.toFixed(1) })"))
    print(f"{'ok ' if not js('pushing()') else 'FAIL'} N: the aids stay on (it isn't the gas pedal):", js("({ pushing: pushing(), gas: +gasPedal.toFixed(2) })"))
    print(f"{'ok ' if boosted > plain + 5 else 'FAIL'} with Auto gas, nitro adds pace (traction control trims the floored gas)")
    pg.screenshot(path=f"{OUT}/nitro_on.png")
    pg.wait_for_timeout(5500); print("held past empty:", js("({ nitro, left: progress.nitro, dmg: +progress.damage.toFixed(1) })")); kb.up("n")
    js("progress.nitro = 3"); bb = pg.locator("#nos").bounding_box(); pg.mouse.move(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2); pg.mouse.down(); pg.wait_for_timeout(500)
    held = js("({ nitro, pushing: pushing(), left: +progress.nitro.toFixed(1) })")
    print(f"{'ok ' if held['nitro'] and not held['pushing'] else 'FAIL'} nitro pedal held with the mouse: burns, the aids stay on:", held)
    pg.mouse.up(); pg.wait_for_timeout(100); print(f"{'ok ' if not js('nitro') else 'FAIL'} released: nitro stops")
    js("progress.damage = 0; applyUpgrades(); buildDials(); progress.nitro = 8"); kb.down("n")
    pg.wait_for_function("gear === 7", timeout=40000); kb.up("n"); print("with nitro, auto shift reached 7th:", js("({ gear, kmh: Math.round(speed * 3.6), rpm: Math.round(rpm) })"))
    pg.screenshot(path=f"{OUT}/gear7.png")
    js("run.left = 0.2"); pg.wait_for_function("run.phase === 'garage'", timeout=15000); pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
    print("next run, refilled:", js("({ tank: progress.nitro, paid: run.refill })"))
    pg.click('[data-buy="daredevil"]') if False else None
    b.close()
print("ERRORS:", errors or "none")
