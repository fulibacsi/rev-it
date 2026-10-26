"""Act 3's crew (docs/design-notes.md, Act 3 redesign): the run after the 5th car is scripted. About 5 s in, an oil
puddle (0/3) and three racers made harvesters, its tutorial over the paused run; SEND, a press a car, puts them on it
(a car of yours comes past on the right shoulder), a fourth finds none free; once all three are there it pumps crude
into the tank on the right pillar until you pass it, and they come back. Then a refinery (0/2), the last two racers
made brewers, its tutorial; it brews the crude into fuel until you pass it: the oil is on. In the garage the role card
splits the crew, the Fuel converter sells fuel at a pump price that climbs with the crew, and team places pay points.
Later runs draw their spots ahead, the same for the same run; Overfill lets a spot take more cars, a dry spot lets its
crew go, the tank has a size. At the gang the whole crew races and the oil stops. On a phone, ‹ SEND › sit under the
sonar and the tracker on its right, clear of the shifter."""
import json
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
CAR = dict(workshopTab=1, autopilotTab=1, blackTab=1, fleetTab=1, power=10, rev=4, gears=3, tyres=4, time=6, clutch=1, gas=1, shift=1,
           steer=1, cruise=1, engine=2, flash=5, grid=100, rolling=6, reckless=1, chicken=1, ecuRev=4, recklessCruise=1, cooling=3,
           ecuPower=4, nitro=5, fleet=5)
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    ctx = b.new_context(viewport={"width": 844, "height": 390}, has_touch=True, is_mobile=True); pg = ctx.new_page(); js = pg.evaluate
    pg.on("pageerror", lambda e: errors.append(str(e))); pg.on("dialog", lambda d: d.accept())
    pg.goto(URL); js("localStorage.clear()"); pg.reload()
    js(f"settings.layout = 'touch'; applyLayout(); Object.assign(progress, {{ racing: true, finish: 1, runs: 30, bank: 50000, fuel: 20, levels: {json.dumps(CAR)}, toured: TUTORIALS.map(t => t.id).filter(id => id !== 'oil' && id !== 'refinery') }}); save()")
    pg.tap('[data-play="distance"]'); pg.wait_for_timeout(300)
    check("before the oil: no role card, no word of oil", "Roles" not in js("$('cards').innerText") and "oil" not in js("$('garage').innerText").lower(), "")
    js("garageTab = 'fleet'; renderGarage()")
    check("the Fuel converter: litres at the pump price, the wallet in litres", "Fuel converter" in js("$('cards').innerText") and js("$('bank').textContent").endswith("20 L to spend"), js("$('bank').textContent"))
    # 1. the scripted run: the puddle on the tracker from the start
    pg.tap("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
    js("traffic.forEach(c => { if (!c.racer) c.z = odo + 5000; })")
    got = js("run.spots.map(s => [s.kind, s.count, Math.round(s.z)])")
    check("the 5th car's run: an oil puddle, 0/3, 1.4 km up the road", got == [["oil", 3, 1400]], got)
    check("the tracker and ‹ SEND › show, with the puddle on it", js("document.body.classList.contains('has-crew') && $('track-spots').children.length === 1"), js("$('track-spots').innerHTML")[:120])
    pg.wait_for_function("menuOpen && screen === 'tour'", timeout=10000)
    got = js("[tour.id, progress.roles.harvester, racersOf(), +run.t.toFixed(1)]")
    check("about 5 s in: the run paused for the oil tutorial, three racers made harvesters", got[:3] == ["oil", 3, 2] and 5 <= got[3] < 6, got)
    left = js("run.left"); pg.wait_for_timeout(400)
    check("paused: the clock waits", js("run.left") == left, [left, js("run.left")])
    pg.screenshot(path=f"{OUT}/oil_tutorial_phone.png")
    while js("menuOpen"): pg.tap("#tour-next"); pg.wait_for_timeout(100)
    # 2. SEND: three cars, a fourth finds none free; the cars come past on the shoulder
    for _ in range(4): pg.tap("#crew-send"); pg.wait_for_timeout(60)
    got = js("(() => { const s = run.spots[0]; return [s.crew + s.coming.length, free('oil'), traffic.filter(c => c.runner).length, $('flash').textContent]; })()")
    check("SEND ×4: three on their way, none free, three cars on the shoulder, the fourth refused (the puddle is full)", got == [3, 0, 3, "FULL"], got)
    check("they come past on the right shoulder, off the lanes, green on the sonar", js("traffic.filter(c => c.runner).every(c => c.x > LANES.mine + CAR_W && c.fleet)"), "")
    pg.wait_for_timeout(1900)
    got = js("[run.spots[0].crew, +progress.crude.toFixed(2)]")
    check("there: the puddle crewed, crude in the tank", got[0] == 3 and got[1] > 0, got)
    check("the tank on the right pillar shows", js("document.body.classList.contains('has-tank') && getComputedStyle($('tank')).display === 'block'"), "")
    pg.screenshot(path=f"{OUT}/oil_pumping_phone.png")
    # 3. past the puddle: they come back; the refinery, two brewers, its tutorial
    js("odo = run.spots[0].z + 10"); pg.wait_for_function("menuOpen && screen === 'tour'", timeout=5000)
    got = js("[run.spots[0].done, free('oil'), progress.oil, tour.id, progress.roles.brewer, racersOf(), run.spots[1].kind, Math.round(run.spots[1].z - odo)]")
    check("past it: its crew back, the oil met; a refinery 1.1 km on, the last two racers brewers, its tutorial", got[:7] == [True, 3, 1, "refinery", 2, 0, "refinery"] and 1050 < got[7] <= 1100, got)
    while js("menuOpen"): pg.tap("#tour-next"); pg.wait_for_timeout(100)
    js("run.pick = run.spots[1]"); pg.tap("#crew-send"); pg.tap("#crew-send"); pg.wait_for_timeout(1900)
    c0 = js("progress.crude"); pg.wait_for_timeout(600)
    got = js("[run.spots[1].crew, progress.crude, progress.fuel]")
    check("the refinery crewed: the crude brews into fuel (2 litres a litre)", got[0] == 2 and got[1] < c0 and got[2] > 20, [c0] + got)
    js("odo = run.spots[1].z + 10"); pg.wait_for_timeout(200)
    check("past the refinery: the oil is on", js("progress.oil") == 2, js("progress.oil"))
    js("finishRun()"); pg.wait_for_function("run.phase === 'garage'", timeout=10000); pg.wait_for_timeout(300)
    if js("menuOpen"): js("closeMenu()")
    # 4. the garage: the role card
    js("garageTab = 'fleet'; renderGarage()")
    text = js("$('cards').innerText")
    check("the role card: racers 0, harvesters 3, brewers 2", "Roles" in text and "Racers 0" in text.replace("\n", " ") and "Harvesters 3" in text.replace("\n", " "), text[:200])
    pg.tap('[data-role="harvester"][data-by="-1"]'); pg.wait_for_timeout(100)
    check("a harvester back to racing: one racer on the grid", js("[racersOf(), role('harvester'), riders()]") == [1, 2, 4], js("[racersOf(), role('harvester'), riders()]"))
    pg.screenshot(path=f"{OUT}/oil_garage_phone.png")
    got = js("[pumpPrice(), (() => { const l = progress.levels.fleet; progress.levels.fleet = 51; const p = pumpPrice(); progress.levels.fleet = l; return p; })()]")
    check("the pump price climbs with the crew: 1,609 m a litre with none, three times at the gang", got[1] == 3 * 1609 or abs(got[1] - 4827) <= 1, got)
    # 5. a normal run: spots drawn ahead, the same for the same run
    a = js("(() => { plan = null; return nextSpots().map(s => [s.kind, s.count, Math.round(s.z)]); })()")
    b2 = js("(() => { plan = null; return nextSpots().map(s => [s.kind, s.count, Math.round(s.z)]); })()")
    check("the next run's spots: drawn ahead, the same each time, oil and refineries", a == b2 and any(k == "oil" for k, _, _ in a) and any(k == "refinery" for k, _, _ in a), a[:6])
    check("the first a rich one: as big as the crew allows", a[0][0] == "oil" and a[0][1] == js("biggest()"), [a[0], js("biggest()")])
    gaps = [q[2] - p_[2] for p_, q in zip([s for s in a if s[0] == "oil"], [s for s in a if s[0] == "oil"][1:])]
    check("oil spots in clusters and gaps, not evenly", min(gaps) < 520 and max(gaps) > 780, gaps)
    # 6. Overfill, a dry spot, the tank's size
    got = js("""(() => { const s = newSpot({ kind: 'oil', z: odo + 900, count: 4, rate: 0.1, reserve: 1 }); progress.levels.overfill = 4;
        const c = cap(s); progress.levels.overfill = 0; return [c, cap(s)]; })()""")
    check("Overfill 4: a 0/4 spot takes 8; without it, 4", got == [8, 4], got)
    got = js("""(() => { Object.assign(run, { phase: 'run', spots: [newSpot({ kind: 'oil', z: odo + 900, count: 2, rate: 0.5, reserve: 0.3 })], t: 0, crude: 0, fuel: 0, worked: 0 });
        const s = run.spots[0]; s.crew = 2; progress.crude = 0; for (let i = 0; i < 120; i++) crewTick(1 / 60); return [s.done, +progress.crude.toFixed(2), free('oil')]; })()""")
    check("a spot run dry: done, its crew free again", got == [True, 0.3, 2], got)
    got = js("""(() => { Object.assign(run, { spots: [newSpot({ kind: 'oil', z: odo + 900, count: 2, rate: 5, reserve: 999 })] });
        run.spots[0].crew = 2; progress.crude = 0; for (let i = 0; i < 600; i++) crewTick(1 / 60); run.phase = 'garage'; return [progress.crude, tankSize()]; })()""")
    check("the tank's size: no more crude than it holds", got[0] == got[1], got)
    got = js("""(() => { const was = [progress.oil, progress.crude]; progress.oil = 1; progress.crude = 4; crewRun(); const r = [run.spots.length];
        run.phase = 'run'; for (let i = 0; i < 312; i++) crewTick(1 / 60); const s = run.spots[0]; r.push(s && s.kind, s && Math.round(s.z - odo), progress.roles.brewer);
        s.crew = 2; crewTick(1); crewEnd(); r.push(progress.oil); run.phase = 'garage'; [progress.oil, progress.crude] = was; return r; })()""")
    check("the run over before the refinery: it comes 1.1 km on, about 5 s into the next; brewing at the finish, the oil is on", got == [0, "refinery", 1100, 2, 2], got)
    # 7. team places pay points; at the gang the whole crew races and the oil stops
    check("team places pay points", "team places" in js("runLine()") and "pts" in js("runLine()") or js("run.team") == 0, js("runLine()"))
    got = js("(() => { progress.levels.fleet = 51; const r = [crewOn(), riders(), raceField().filter(c => c.fleet).length]; progress.levels.fleet = 5; return r; })()")
    check("at the gang: the whole crew races, nobody rides", got == [False, 0, 51], got)
    got = js("(() => { const was = [progress.oil, progress.levels.fleet]; progress.oil = 0; progress.levels.fleet = 51; const r = whyNot('dues'); [progress.oil, progress.levels.fleet] = was; return r; })()")
    check("a save that reached the gang before the oil: Racing still on sale (the Hunting pack needs it)", got in ("", "short"), got)
    # 8. desktop: , and . pick a spot, S sends a car (a held key sends one); ‹ SEND › and the tracker clear of the cockpit
    pg = b.new_context(viewport={"width": 1440, "height": 900}).new_page(); js = pg.evaluate
    pg.on("pageerror", lambda e: errors.append(str(e))); pg.on("dialog", lambda d: d.accept())
    pg.goto(URL); js("localStorage.clear()"); pg.reload()
    js(f"Object.assign(progress, {{ racing: true, finish: 1, runs: 30, bank: 50000, fuel: 20, oil: 2, roles: {{ harvester: 6, brewer: 3 }}, levels: {{ ...{json.dumps(CAR)}, fleet: 9, sonarRange: 2 }}, toured: TUTORIALS.map(t => t.id) }}); save()")
    pg.click('[data-play="distance"]'); pg.wait_for_timeout(300); pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
    js("traffic.forEach(c => { if (!c.racer) c.z = odo + 5000; })"); pg.wait_for_timeout(1500)
    got = js("[run.spots.length > 3, spotsAhead().length, run.pick && spotsAhead().indexOf(run.pick)]")
    check("a drawn run: spots up the road, some on the tracker, the nearest short one picked", got[0] and got[1] >= 1 and got[2] is not None, got)
    pg.keyboard.press("."); first = js("spotsAhead().indexOf(run.pick)"); pg.keyboard.press(",")
    check(", and .: the next spot and back", first == min(1, js("spotsAhead().length") - 1) and js("spotsAhead().indexOf(run.pick)") == 0, [first, js("spotsAhead().indexOf(run.pick)")])
    before = js("run.pick.crew + run.pick.coming.length"); pg.keyboard.down("s"); pg.wait_for_timeout(600); pg.keyboard.up("s")
    check("S held: one car, not a stream (a press a car)", js("run.pick.crew + run.pick.coming.length") == before + 1, [before, js("run.pick.crew + run.pick.coming.length")])
    before = js("busy('oil') + busy('refinery')"); js("progress.crude = 10; progress.levels.foreman = 1"); pg.wait_for_timeout(2500)
    got = js("[busy('oil') + busy('refinery'), $('crew-send').firstChild.nodeValue]")
    check("the Foreman: cars sent with no press, AUTO on the button", got[0] > before and got[1] == "AUTO", [before] + got)
    js("progress.off.foreman = true"); pg.wait_for_timeout(200)
    check("switched off: SEND again", js("$('crew-send').firstChild.nodeValue") == "SEND", js("$('crew-send').firstChild.nodeValue"))
    boxes = js("""['tracker', 'crew-ctl', 'sonar', 'tank', 'shifter', 'cluster', 'wheel', 'pedals', 'ignition', 'menu-button', 'timer'].map(id => {
        const r = $(id).getBoundingClientRect(); return [id, r.left, r.top, r.right, r.bottom, getComputedStyle($(id)).display]; })""")
    shown = {b_[0]: b_[1:5] for b_ in boxes if b_[5] != "none"}
    over = lambda a, c: a[0] < c[2] and c[0] < a[2] and a[1] < c[3] and c[1] < a[3]
    hits = [(a, c) for a in ("tracker", "crew-ctl") for c in shown if c not in ("tracker", "crew-ctl", "sonar") and a in shown and over(shown[a], shown[c])]
    check("desktop: the tracker and ‹ SEND › show, on the screen, clear of the cockpit", "tracker" in shown and "crew-ctl" in shown and not hits
          and all(0 <= v for v in shown["crew-ctl"]), {"tracker": shown.get("tracker"), "crew-ctl": shown.get("crew-ctl"), "overlaps": hits})
    pg.screenshot(path=f"{OUT}/oil_desktop.png")
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
