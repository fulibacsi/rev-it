"""The Fleet: never shown before your first win; winning a race opens it (the garage says so), with miles in the
header and the Exchange card: metres for miles, one way, 1,609 m a mile, a slider (dragged with a finger on the
phone) and "all available". Racers paid off (the slowest first, each dearer, #1 never) race for you in your colours:
they don't count against your position, give way when you come up behind them and block a rival closing on them.
The fleet-wide upgrades: dues (a share of the fleet's metres at the finish), tuning (pace) and Fleet flash. The sonar
on the A-pillar shows the road 250 m each way from above, ahead up: you, your fleet green, the rivals white, the traffic
yellow, the police flashing red and blue, the tank a red square; clear of the menu button, the shifter and the mirror,
phone and desktop."""
import re
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
CAR = "power: 10, rev: 4, gears: 3, tyres: 4, time: 6, clutch: 1, gas: 1, shift: 1, engine: 2, steer: 1, cruise: 1"
HANDS = "power: 10, rev: 4, gears: 3, tyres: 4, time: 6, clutch: 1, gas: 1, shift: 1, engine: 2"  # no steering aids
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    ctx = b.new_context(viewport={"width": 852, "height": 393}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e))); js = pg.evaluate
    cdp = ctx.new_cdp_session(pg); cdp.send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
    cdp.send("Emulation.setSafeAreaInsetsOverride", {"insets": {"left": 59, "right": 59, "bottom": 21, "top": 0}})
    pg.goto(URL); pg.wait_for_timeout(300)
    js(f"localStorage.clear(); settings.layout = 'touch'; applyLayout(); Object.assign(progress, {{ racing: true, finish: 2, bank: 10000, levels: {{ {CAR} }}, engine: 2, toured: TUTORIALS.map(t => t.id) }})")
    pg.tap('[data-play="distance"]'); pg.wait_for_timeout(200)
    tabs = lambda: js("[...document.querySelectorAll('#tabs button')].map(b => b.textContent)")
    # 1. before the first win: no Fleet, no miles, nothing that hints at them
    text = js("$('garage').innerText")
    check("before a win: no Fleet page", tabs() == ["Workshop", "Autopilot", "Black market"], tabs())
    check("before a win: no word of the fleet or miles", not re.search(r"fleet|\bmiles?\b|\bmi\b", text, re.I), re.findall(r".{20}(?:fleet|\bmiles?\b|\bmi\b).{20}", text, re.I))
    # 2. win a race: the Fleet opens, and the garage says so
    js("refreshCar()"); pg.tap("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
    js("racers().forEach(c => c.z = odo - 9000); run.left = 0.05"); pg.wait_for_function("run.phase === 'garage'", timeout=15000)
    check("a win opens the Fleet", tabs() == ["Workshop", "Autopilot", "Black market", "Fleet"], tabs())
    check("the garage says so", "the Fleet is open" in js("$('report').textContent"), js("$('report').textContent")[-120:])
    check("miles in the header", js("$('bank').textContent").endswith("· 0 mi to spend"), js("$('bank').textContent"))
    # 3. the Exchange: the slider, then all available
    js("progress.bank = 10000"); pg.tap('[data-tab="fleet"]'); pg.wait_for_timeout(200)
    check("the Exchange card", js("!!document.querySelector('.card.exchange #exchange')") and js("$('exchange').max") == "6", js("$('exchange')?.max"))
    s = js("$('exchange').getBoundingClientRect().toJSON()")
    y = s["y"] + s["height"] / 2
    for i, x in enumerate([s["x"] + 4, s["x"] + s["width"] * 0.35, s["x"] + s["width"] * 0.68]):  # a finger drags the thumb
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart" if i == 0 else "touchMove", "touchPoints": [{"x": x, "y": y, "id": 3}]}); pg.wait_for_timeout(60)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": [{"x": x, "y": y, "id": 3}]}); pg.wait_for_timeout(100)
    got = js("[+$('exchange').value, document.querySelector('[data-exchange]').textContent]")
    check("a finger drags the slider; the button follows", got[0] >= 3 and got[1] == f"{got[0]} mi for {got[0] * 1609:,} m", got)
    pg.screenshot(path=f"{OUT}/fleet_exchange_phone.png")
    n = got[0]; pg.tap("[data-exchange]"); pg.wait_for_timeout(100)
    got = js("({ bank: progress.bank, miles: progress.miles })")
    check("exchanged: the metres gone, the miles in", got == {"bank": 10000 - n * 1609, "miles": n}, got)
    pg.tap("[data-exchange-all]"); pg.wait_for_timeout(100)
    got = js("({ bank: progress.bank, miles: progress.miles, all: document.querySelector('[data-exchange-all]').disabled })")
    check("all available: every whole mile, the rest stays", got == {"bank": 10000 - 6 * 1609, "miles": 6, "all": True}, got)
    check("the header shows them", js("$('bank').textContent").endswith("· 6 mi to spend"), js("$('bank').textContent"))
    # 4. paying racers off: the slowest first, each a little dearer; #1 won't sell
    js("progress.miles = 100"); pg.wait_for_timeout(50); js("renderGarage()")
    for _ in range(3): pg.tap('[data-buy="fleet"]'); pg.wait_for_timeout(80)
    check("three racers paid off, a mile each", js("[lvl('fleet'), progress.miles]") == [3, 97], js("[lvl('fleet'), progress.miles]"))
    check("the card names them", "#98 to #100 race for you" in js("$('cards').innerText"), js("$('cards').innerText")[-160:])
    pg.screenshot(path=f"{OUT}/fleet_page.png")
    prices = js("(() => { const l0 = lvl('fleet'), p = Array.from({ length: 99 }, (_, l) => { progress.levels.fleet = l; return cost('fleet'); }); progress.levels.fleet = l0; return p; })()")
    print(f"   prices: the 1st {prices[0]} mi, the 51st {prices[50]}, the 99th {prices[98]}; the first 51 together {sum(prices[:51])} mi")
    check("each costs at least as much as the last, and more over time", all(a <= b for a, b in zip(prices, prices[1:])) and prices[50] > prices[0], prices[::10])
    check("#1 won't sell", js("(() => { progress.levels.fleet = 99; const w = whyNot('fleet'); progress.levels.fleet = 3; return w; })()") == "#1 won't sell")
    # 5. a race with three fleet cars: #98 to #100 in your colours; they don't count against your position
    start = lambda levels: (js(f"progress.levels = {{ {levels}, fleet: 3 }}; refreshCar()"), pg.tap("#drive"), pg.wait_for_function("run.phase === 'run'", timeout=15000))
    start(HANDS)
    check("fleet cars: #98 to #100", js("racers().filter(c => c.fleet).map(c => c.racer).sort((a, b) => a - b)") == [98, 99, 100], js("racers().filter(c => c.fleet).map(c => c.racer)"))
    check("in your colours", js("racers().find(c => c.racer === 99).look.rear === racerSprite(99, true, true).rear && racerSprite(99, true, true).rear !== racerSprite(99, true).rear"))
    js("rivals().forEach(c => c.z = odo - 9000); racers().filter(c => c.fleet).forEach((c, i) => Object.assign(c, { z: odo + 18 + 14 * i, lane: i % 2, x: MY_LANES[i % 2] }))")
    pg.wait_for_timeout(150); pg.screenshot(path=f"{OUT}/fleet_cars.png")
    check("ahead of every rival, behind your fleet: P1", js("position()") == 1, js("position()"))
    # 6. a fleet car ahead in your lane, slower: it moves over for you, no crash
    js("traffic.forEach(c => { if (!c.racer) { c.dir = -1; c.x = LANES.oncoming[0]; c.z = odo + 4000; } }); window.crashes = 0; "
       "if (!DISTANCE.crash0) { DISTANCE.crash0 = DISTANCE.crash; DISTANCE.crash = i => { crashes++; DISTANCE.crash0(i); }; } 0")  # 0: or Playwright calls the function
    pg.wait_for_function("speed > 25", timeout=20000)
    js("window.f = racers().find(c => c.racer === 100); racers().filter(c => c.fleet && c !== f).forEach(c => c.z = odo - 5000); "
       "Object.assign(f, { lane, x: MY_LANES[lane], z: odo + 90, v: 15, want: 15, cool: 0 })")
    pg.wait_for_timeout(1200); moved = js("[f.lane, lane, Math.round(f.z - odo)]")
    try: pg.wait_for_function("f.z < odo - 20", timeout=15000); past = True
    except Exception: past = False
    check("a fleet car ahead in your lane moves over for you; no crash", moved[0] != moved[1] and past and js("crashes") == 0, {"its lane, yours, m ahead": moved, "past it": past, "crashes": js("crashes")})
    # 7. a rival closing on a fleet car in the other lane: the fleet car moves across and holds it up
    js("""Object.assign(f, { lane: 0, x: MY_LANES[0], z: odo + 700, v: 30, want: 30, cool: 0 });
        window.r = rivals().find(c => c.racer === 40); Object.assign(r, { lane: 1, x: MY_LANES[1], z: f.z - 40, v: 45, want: 45, cool: 0 });
        rivals().filter(c => c !== r).forEach(c => c.z = odo - 9000)""")
    trace = js("""() => new Promise(res => { const out = []; let t = 0; const h = setInterval(() => {
        out.push([+(t += 0.5).toFixed(1), f.lane, r.lane, Math.round(r.z - f.z), Math.round(f.z - odo)]); if (t >= 5) { clearInterval(h); res(out); } }, 500); })""")
    print("   [s, fleet car's lane, rival's lane, rival m ahead of it, fleet car m ahead of you]:", trace)
    check("the fleet car moves across in front of the rival", any(t[1] == 1 for t in trace[:3]), trace[:3])
    check("and holds it up for 5 s (it would have passed in 3)", all(t[3] < 0 for t in trace), [t[3] for t in trace])
    # 8. Fleet flash: a slow ordinary car in your lane just ahead of a fleet car moves over; none of your flashes spent
    for owned in [0, 1]:
        js(f"progress.levels.fleetFlash = {owned}; progress.levels.flash = 3; run.flashes = 3")
        js("""Object.assign(f, { lane: 1, x: MY_LANES[1], z: odo + 60, v: speed, want: speed, cool: 9, flashed: 0 }); window.t = traffic.find(c => !c.racer);
            Object.assign(t, { dir: 1, lane, x: MY_LANES[lane], z: odo + 130, v: 12, want: 12, cool: 9, yielding: false })""")
        pg.wait_for_timeout(600); got = js("({ its: t.lane, yours: lane, flashes: run.flashes })")
        if owned: check("Fleet flash: the slow car ahead moves out of your lane, your flashes kept", got["its"] != got["yours"] and got["flashes"] == 3, got)
        else: check("without it: the slow car stays in your lane", got["its"] == got["yours"], got)
        js("t.z = odo + 4000; t.dir = -1; t.x = LANES.oncoming[0]")
    # 9. dues: 20% of the metres the fleet drove, into the bank at the finish, and in the report
    js("progress.levels.dues = 2; racers().filter(c => c.fleet).forEach(c => c.grid = c.z - 1000); window.bank0 = progress.bank")
    js("run.left = 0.05"); pg.wait_for_function("run.phase === 'garage'", timeout=15000)
    got = js("({ dues: run.dues, gain: run.gain, banked: progress.bank - bank0, report: $('report').textContent })")
    check("dues: 20% of the fleet's metres (3 cars, 1 km and more each)", got["dues"] >= 600 and got["banked"] == got["gain"] + got["dues"], {k: v for k, v in got.items() if k != "report"})
    check("the report shows them", f"fleet dues +{got['dues']:,} m" in got["report"], got["report"][-90:])
    # 10. tuning: fleet cars 25% quicker at level 5; rivals as before
    js("progress.levels.fleetPace = 5; refreshCar()"); pg.tap("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
    got = js("[racers().find(c => c.racer === 99).want / pace(99), racers().find(c => c.racer === 40).want / pace(40)].map(x => +x.toFixed(2))")
    check("Fleet tuning 5: fleet cars 25% quicker, rivals as before", got == [1.25, 1], got)
    # 11. the sonar: the road 250 m each way from above, every car on it in its colour; clear of the controls; gone in
    # the garage
    def sonar(page, shot):
        page.evaluate("""(() => { const fl = racers().filter(c => c.fleet); rivals().forEach(c => c.z = odo - 120);
            [[-60, 0], [-220, 1], [-420, 0], [80, 1]].forEach(([d, l], i) => Object.assign(fl[i], { z: odo + d, lane: l, x: MY_LANES[l] })); })()""")
        page.wait_for_timeout(200); page.screenshot(path=f"{OUT}/{shot}")
        box = lambda sel: page.evaluate(f"(() => {{ const r = $('{sel}').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }})()")
        apart = lambda a, b: a[2] <= b[0] or b[2] <= a[0] or a[3] <= b[1] or b[3] <= a[1]
        s, others = box("sonar"), {k: box(k) for k in ["menu-button", "shifter", "timer", "hud"]}
        return page.evaluate("[getComputedStyle($('sonar')).display, $('sonar-blips').querySelectorAll('.ally').length]"), s, [k for k, o in others.items() if not apart(s, o)]
    js("progress.levels.fleet = 4; refreshCar(); run.left = 0.05"); pg.wait_for_function("run.phase === 'garage'", timeout=15000)
    check("in the garage: no sonar", js("getComputedStyle($('sonar')).display") == "none")
    pg.tap("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
    (shown, n), s, hits = sonar(pg, "sonar_phone.png")
    check("phone: the sonar shows the 3 fleet cars within 250 m (not the one 420 m back)", shown == "block" and n == 3, [shown, n])
    check("phone: clear of the menu button, the shifter, the mirror and the display", not hits and s[0] >= 0, {"sonar": [round(v) for v in s], "overlaps": hits})
    # drawn at once (it redraws 15 times a second), what it shows against the road: each kind of car counted, the fleet
    # cars' blips where they are (ahead up, across to scale), you, and the colours
    got = js("""(() => { sonarAt = 0; renderSonar(); const b = $('sonar-blips'), near = traffic.filter(c => !c.wreck && Math.abs(c.z - odo) < 250);
        const at = e => [+e.getAttribute('cx'), +e.getAttribute('cy')];
        return { ally: b.querySelectorAll('.ally').length, rival: b.querySelectorAll('.rival').length, car: b.querySelectorAll('.car').length,
                 rivals: near.filter(c => c.racer && !c.fleet).length, cars: near.filter(c => !c.racer).length,
                 allies: near.filter(c => c.fleet).map(c => [c.x, c.z - odo]), blips: [...b.querySelectorAll('.ally')].map(at),
                 you: [carX, $('sonar-you').getAttribute('transform')],
                 fill: Object.fromEntries([...b.children].map(e => [e.getAttribute('class'), getComputedStyle(e).fill])) }; })()""")
    check("every rival and every ordinary car within 250 m has its blip", got["rival"] == got["rivals"] > 0 and got["car"] == got["cars"], {k: got[k] for k in ["rival", "rivals", "car", "cars"]})
    off = [(round(cx - (66 + 4.4 * x), 1), round(cy - (43 - 34 * dz / 250), 1)) for (x, dz), (cx, cy) in zip(got["allies"], got["blips"])]
    check("the fleet's blips: ahead up, behind down, across to scale", len(off) == 3 and all(abs(a) < 0.1 and abs(b) < 0.1 for a, b in off)
          and sorted(cy < 43 for (_, dz), (_, cy) in zip(got["allies"], got["blips"])) == sorted(dz > 0 for _, dz in got["allies"]) == [False, False, True],
          {"allies": got["allies"], "blips": got["blips"]})
    check("you: the arrow in the middle, in your lane", got["you"][1] == f"translate({66 + 4.4 * got['you'][0]:.1f},43)", got["you"])
    check("the colours: traffic yellow, the fleet green, the rivals white", got["fill"] == {"car": "rgb(238, 204, 68)", "ally": "rgb(51, 255, 102)", "rival": "rgb(238, 238, 238)"}, got["fill"])
    seen = set()  # a police car (an ordinary one made one, for the drawing only): red, then blue, every quarter second
    for _ in range(12):
        seen.add(js("""(() => { const c = ORDINARY.find(c => !c.wreck && !c.police && !c.tank); c.z = odo + 150; c.police = true;
            sonarAt = 0; renderSonar(); c.police = false; const e = $('sonar-blips').lastElementChild; return e.getAttribute('class') + ' ' + getComputedStyle(e).fill; })()"""))
        pg.wait_for_timeout(110)
    check("a police car flashes red and blue, on top", seen == {"red rgb(255, 51, 51)", "blue rgb(51, 153, 255)"}, seen)
    got = js("""(() => { const c = ORDINARY.find(c => !c.wreck && !c.police && !c.tank); c.z = odo + 100; c.tank = true;
        sonarAt = 0; renderSonar(); c.tank = false; const e = $('sonar-blips').lastElementChild; return [e.tagName, e.getAttribute('class'), getComputedStyle(e).fill]; })()""")
    check("the tank: a red square, on top", got == ["rect", "tank", "rgb(255, 34, 34)"], got)
    dk = b.new_page(viewport={"width": 1440, "height": 900}); dk.on("pageerror", lambda e: errors.append(str(e))); dk.goto(URL)
    dk.evaluate(f"localStorage.clear(); Object.assign(progress, {{ racing: true, finish: 1, bank: 10000, levels: {{ {HANDS}, fleet: 4 }}, engine: 2, toured: TUTORIALS.map(t => t.id) }})")
    dk.click('[data-play="distance"]'); dk.wait_for_timeout(200); dk.evaluate("refreshCar()"); dk.click("#drive"); dk.wait_for_function("run.phase === 'run'", timeout=15000)
    (shown, n), s, hits = sonar(dk, "sonar_desktop.png")
    check("desktop: the sonar shows them, clear of everything", shown == "block" and n == 3 and not hits, {"fleet": n, "sonar": [round(v) for v in s], "overlaps": hits})
    js("progress.levels.fleet = 0; run.left = 0.05"); pg.wait_for_function("run.phase === 'garage'", timeout=15000)
    pg.tap("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
    check("no fleet: no sonar", js("getComputedStyle($('sonar')).display") == "none")
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
