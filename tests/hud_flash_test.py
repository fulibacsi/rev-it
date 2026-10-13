"""The HUD's messages (GO!, CRASH) show again, at full strength over see-through readouts; the mirror's timer drains
(hidden in the garage), and a tap on the light stalk flashes: the car ahead moves over, the HUD counts the flash."""
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
errors = []
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    ctx = b.new_context(viewport={"width": 844, "height": 390}, is_mobile=True, has_touch=True); pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
    ctx.new_cdp_session(pg).send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
    pg.goto(URL); pg.wait_for_timeout(300); js = pg.evaluate
    js("localStorage.clear(); Object.assign(progress, { bank: 5000, levels: { flash: 1, clutch: 1, gas: 1, shift: 1 } })"); pg.tap('[data-play="distance"]'); pg.wait_for_timeout(200)
    pg.tap("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000); pg.wait_for_timeout(120)
    print("GO! message:", js("(() => { const f = document.getElementById('flash'), s = getComputedStyle(f), r = f.getBoundingClientRect(); return { text: f.textContent, display: s.display, position: s.position, opacity: +(+s.opacity).toFixed(2), w: Math.round(r.width), h: Math.round(r.height) }; })()"))
    pg.screenshot(path=f"{OUT}/go_message.png")
    # the traffic shows through the readouts; a message isn't faded with them
    seen = js("""(() => { const o = e => { let a = 1; for (; e; e = e.parentElement) a *= +getComputedStyle(e).opacity; return +a.toFixed(2); };
      return { speed: o($('hud-speed')), info: o($('run-info')), message: o($('hud')) }; })()""")
    print(f"{'ok ' if seen['speed'] <= 0.7 and seen['info'] <= 0.7 and seen['message'] == 1 else 'FAIL'} the readouts see-through, the messages at full strength:", seen)
    timer = "({ shown: getComputedStyle($('timer')).display, left: $('timer-left').textContent, fill: Math.round($('timer-fill').getBoundingClientRect().width) })"
    t0 = js(timer); pg.wait_for_timeout(2500); t1 = js(timer)
    print("mirror timer:", t0, "->", t1, "| drains:", t0["shown"] == "block" and float(t1["left"]) < float(t0["left"]) and t1["fill"] < t0["fill"])
    js("traffic.forEach(c => { if (!c.racer) { c.dir = -1; c.x = LANES.oncoming[0]; } }); Object.assign(traffic.find(c => !c.racer), { dir: 1, z: odo + 80, x: carX, lane, v: speed - 8, want: speed - 8 })")
    n0 = js("$('hud-flashes').textContent"); pg.tap("#stalk-hit"); pg.wait_for_timeout(1500)
    print("pulled the stalk: the car ahead moved to lane", js("traffic.find(c => !c.racer && c.dir > 0).lane"), "(you're in", js("lane"), ") | HUD flashes", n0, "->", js("$('hud-flashes').textContent"))
    js("run.left = 0.05"); pg.wait_for_function("run.phase === 'garage'", timeout=15000)
    print("in the garage, timer shown:", js("getComputedStyle($('timer')).display"))
    b.close()
print("ERRORS:", errors or "none")
