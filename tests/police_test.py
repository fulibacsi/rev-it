"""Police heat: totals and shots raise it (more for racers and police, less for the gang's), it stays between races;
the scanner on the right A-pillar shows it (phone and desktop, clear of the controls). Police come with the heat: from
behind they pass you in your other lane, cut in ahead and brake; while you're in an oncoming lane they come at you
head-on, flat out, steering for you. They don't move over for a flash."""
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
CAR = "power: 10, rev: 4, gears: 3, tyres: 4, time: 6, clutch: 1, gas: 1, shift: 1, engine: 2, reckless: 1, flash: 5, chicken: 1, fleet: 51"
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errors.append(str(e))); js = pg.evaluate
    pg.goto(URL)
    js(f"localStorage.clear(); Object.assign(progress, {{ racing: true, finish: 1, runs: 60, bank: 10000, totals: 1, levels: {{ {CAR} }}, engine: 2 }})")
    pg.click('[data-play="distance"]'); pg.wait_for_timeout(200); js("refreshCar()")
    # 1. what raises the heat
    got = js("""(() => { const d = []; for (const [c, gang] of [[{}, false], [{ racer: 5 }, false], [{ police: true }, false], [{ racer: 6 }, true]]) {
        const w = progress.wanted; total(c, gang); d.push(+(progress.wanted - w).toFixed(4)); } progress.wanted = 0; return d; })()""")
    check("a total: traffic 0.01, a racer 0.015, police 0.04, the gang's 0.005", got == [0.01, 0.015, 0.04, 0.005], got)
    # 2. on the road: the scanner shows it; a shot adds a little
    js("progress.wanted = 0.37; progress.levels.guns = 1; refreshCar()"); pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
    js("traffic.forEach(c => { if (!c.racer) Object.assign(c, { dir: -1, x: LANES.oncoming[1], z: odo + 700 + 60 * (c.n = (window.k = (window.k || 0) + 1)), police: false, passing: false }); else c.z = odo - (c.fleet ? 3000 : 9000); }); copClock = 99")
    pg.wait_for_timeout(200)
    got = js("({ on: getComputedStyle($('scanner')).display, lcd: $('scanner-lcd').textContent, lit: [...$('scanner-leds').children].filter(r => r.getAttribute('fill') !== '#2a2a30').length })")
    check("the scanner shows the heat: HEAT 37%, 4 lights", got == {"on": "block", "lcd": "HEAT 37%", "lit": 4}, got)
    w0 = js("progress.wanted"); pg.keyboard.down("g"); pg.wait_for_timeout(600); pg.keyboard.up("g")
    shots = round((js("progress.wanted") - w0) / 0.00025)
    check("each shot adds 0.00025", 2 <= shots <= 4, shots)
    # 3. from behind: past you in your other lane, in ahead of you, then a hard stop
    pg.wait_for_function("speed > 20", timeout=20000)
    js("lane = fromLane = 0; carX = MY_LANES[0]; progress.wanted = 0.9; copClock = 0")
    pg.wait_for_function("traffic.some(c => c.police)", timeout=5000)
    trace = js("""() => new Promise(res => { const c = traffic.find(c => c.police), out = []; let t = 0;
        const h = setInterval(() => { out.push([+(t += 0.25).toFixed(2), c.stage, Math.round(c.z - odo), +c.x.toFixed(1), Math.round(c.v - speed)]);
          if (t >= 7 || c.stage === 'leave') { clearInterval(h); res(out); } }, 250); js = 0; })""")
    print("   [s, stage, m ahead of you, x, its speed - yours]:", trace)
    first = trace[0]
    check("it comes up from behind, in your other lane, faster", first[2] < 0 and abs(first[3] - 1.75) < 0.3 and first[4] > 5, first)
    cut = [t for t in trace if t[1] in ("cut", "brake")]
    check("then cuts in ahead of you, into your lane, and brakes", cut and min(t[2] for t in cut) > 0 and any(t[1] == "brake" and abs(t[3] - 5.25) < 0.3 and t[4] < -5 for t in cut), cut[:6])
    # 4. in an oncoming lane: one comes at you head-on, flat out, steering for you; a flash doesn't move it
    js("traffic.forEach(c => { if (c.police) c.z = odo + 9000; }); lane = fromLane = 2; carX = ROAD_LANES[2]; copClock = 0; run.flashes = 5")
    pg.wait_for_function("traffic.some(c => c.police && c.dir < 0)", timeout=5000)
    js("window.cop = traffic.find(c => c.police && c.dir < 0); cop.x = ROAD_LANES[3]")
    pg.keyboard.press("f"); pg.wait_for_timeout(700)
    got = js("({ v: Math.round(cop.v), x: +cop.x.toFixed(2), ahead: Math.round(cop.z - odo), swerve: cop.swerve })")
    check("head-on: flat out, steering into your lane, no swerve for a flash", got["v"] > 28 and got["x"] > -5.25 + 1 and got["swerve"] is None, got)
    js("lane = fromLane = 0; carX = MY_LANES[0]")  # out of its way
    js("traffic.forEach(c => { if (c.police) total(c); }); copClock = 99"); pg.wait_for_timeout(150)
    check("police totalled: the scanner calms down", js("$('scanner-lcd').textContent").startswith("HEAT"), js("$('scanner-lcd').textContent"))
    pg.screenshot(path=f"{OUT}/police_desktop.png")
    # 5. the heat stays between races
    js("progress.wanted = 0.5; run.left = 0.05"); pg.wait_for_function("run.phase === 'garage'", timeout=15000)
    check("between races the heat stays, and the garage says so", js("JSON.parse(localStorage.getItem('car-rev-incremental')).wanted") == 0.5 and "police heat 50%" in js("$('report').textContent"),
          js("$('report').textContent")[-80:])
    # 6. the phone: the scanner on the right A-pillar, clear of the controls
    ctx = b.new_context(viewport={"width": 852, "height": 393}, device_scale_factor=2, is_mobile=True, has_touch=True); ph = ctx.new_page()
    ph.on("pageerror", lambda e: errors.append(str(e)))
    cdp = ctx.new_cdp_session(ph); cdp.send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
    cdp.send("Emulation.setSafeAreaInsetsOverride", {"insets": {"left": 59, "right": 59, "bottom": 21, "top": 0}})
    ph.goto(URL); ph.wait_for_timeout(300)
    ph.evaluate(f"localStorage.clear(); settings.layout = 'touch'; applyLayout(); Object.assign(progress, {{ racing: true, finish: 1, runs: 60, totals: 1, wanted: 0.62, levels: {{ {CAR} }}, engine: 2 }})")
    ph.tap('[data-play="distance"]'); ph.wait_for_timeout(200); ph.evaluate("refreshCar()"); ph.tap("#drive"); ph.wait_for_function("run.phase === 'run'", timeout=15000); ph.wait_for_timeout(300)
    box = lambda sel: ph.evaluate(f"(() => {{ const r = $('{sel}').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }})()")
    apart = lambda a, c: a[2] <= c[0] or c[2] <= a[0] or a[3] <= c[1] or c[3] <= a[1]
    s = box("scanner"); hits = [k for k in ["pedals", "timer", "hud", "menu-button", "sonar", "cluster"] if not apart(s, box(k))]
    check("phone: the scanner on screen, clear of the pedals, mirror, display and sonar", not hits and s[2] <= 852 - 59 + 14 and s[1] >= 0, {"scanner": [round(v) for v in s], "overlaps": hits})
    ph.screenshot(path=f"{OUT}/police_phone.png")
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
