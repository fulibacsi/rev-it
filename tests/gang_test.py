"""Mad Max: nothing before 51 fleet cars; then the gang's first job (total a car) in the garage and the AR layer on the
windscreen: a reticle and a health bar on the nearest car ahead, kept until you pass it. Bumps hurt the car you hit;
at 0 health it skids onto the shoulder, out of your way, and pays parts. A totalled rival is out of the race. The
first total opens the Mad Max page, paid in parts; a bull bar hurts them more and costs you less speed. Armour takes
off your damage, spiked hubs make a side-swipe free and harder; with a bull bar the gang side-swipes rivals. Guns,
last: the wheel's red marker turns into the trigger (FIRE on it), shots hurt the car in the reticle within 200 m, and
the gang shoots at rivals. The reticle moves to a nearer car when its own is out of reach, and starts afresh each race."""
import re
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
CAR = "power: 10, rev: 4, gears: 3, tyres: 4, time: 6, clutch: 1, gas: 1, shift: 1, engine: 2, reckless: 1"  # no steering aids
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errors.append(str(e))); js = pg.evaluate
    pg.goto(URL)
    def start(fleet):
        js(f"localStorage.clear(); Object.assign(progress, {{ racing: true, finish: 1, runs: 40, bank: 10000, levels: {{ {CAR}, fleet: {fleet} }}, engine: 2 }})")
        if js("game.id") != "distance": pg.click('[data-play="distance"]'); pg.wait_for_timeout(200)
        js("refreshCar(); renderGarage()")
    tabs = lambda: js("[...document.querySelectorAll('#tabs button')].map(b => b.textContent)")
    # 1. 50 fleet cars: no gang, no word of it
    start(50)
    check("50 fleet cars: no Mad Max, no task", "Mad Max" not in tabs() and not re.search(r"gang|total|parts", js("$('garage').innerText"), re.I), tabs())
    # 2. 51: the gang's first job, in the garage; still no page
    start(51)
    check("51 fleet cars: the gang's first job in the garage", "total a car" in js("$('report').innerText") and "Mad Max" not in tabs(), js("$('report').innerText")[-140:])
    # 3. on the road: the reticle on the nearest car ahead, at full health, labelled
    pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
    js("""traffic.forEach(c => { if (!c.racer) { c.dir = -1; c.x = LANES.oncoming[0]; c.z = odo + 4000; } else if (!c.fleet) c.z = odo - 9000; else c.z = odo - 3000; });
        window.crashes = 0; if (!DISTANCE.crash0) { DISTANCE.crash0 = DISTANCE.crash; DISTANCE.crash = i => { crashes++; DISTANCE.crash0(i); }; } 0""")
    pg.wait_for_function("speed > 20", timeout=20000)
    js("""window.cs = traffic.filter(c => !c.racer); [[0, 60], [1, 90]].forEach(([l, d], i) => Object.assign(cs[i], { dir: 1, lane: l, x: MY_LANES[l], z: odo + d, v: 12, want: 12, cool: 99, hp: null }));
        lane = fromLane = 0; carX = MY_LANES[0]""")
    pg.wait_for_timeout(300)
    got = js("""(() => { const r = $('ar').getBoundingClientRect(), k = canvas.clientWidth / canvas.width, s = target && target.seen;
        return { on: getComputedStyle($('ar')).display, target: target === cs[0], label: $('ar-label').textContent,
                 around: !!s && r.left <= s[0] * k + 1 && r.right >= (s[0] + s[2]) * k - 1 && r.top <= s[1] * k + 1 && r.bottom >= (s[1] + s[3]) * k - 1,
                 hp: +getComputedStyle($('ar')).getPropertyValue('--hp') }; })()""")
    check("the reticle round the nearest car ahead, full health, 'TOTAL IT'", got == {"on": "block", "target": True, "label": "TOTAL IT", "around": True, "hp": 1}, got)
    pg.screenshot(path=f"{OUT}/gang_reticle.png")
    # 4. ram it: it loses health by the speed you hit it at, shown on the bar
    pg.wait_for_function("cs[0].hp !== null", timeout=15000); pg.wait_for_timeout(100)
    got = js("({ hp: Math.round(cs[0].hp), bar: +getComputedStyle($('ar')).getPropertyValue('--hp'), kmh: Math.round(impact.kmh) })")
    check("a bump takes 0.4 of its speed off the car's health, and the bar shows it", abs(got["hp"] - (100 - 0.4 * got["kmh"])) <= 1 and abs(got["bar"] - got["hp"] / 100) < 0.02 and got["kmh"] > 10, got)
    # 5. at 0 it is totalled: parts, off onto the shoulder, out of your way; the reticle moves on to the next car
    js("cs[0].hp = 1; Object.assign(cs[0], { z: odo + 25, v: 5, want: 5 }); cs[0].hit = -1e9; Object.assign(cs[1], { z: odo + 120 })")
    trace = js("""() => new Promise(res => { const out = []; const f = () => { if (cs[0].wreck) out.push([+cs[0].x.toFixed(2), +cs[0].v.toFixed(2), Math.round(cs[0].z - odo)]);
        out.length < 12 ? requestAnimationFrame(f) : res(out); }; requestAnimationFrame(f); })""")
    got = js("({ parts: progress.parts, totals: progress.totals, run: run.parts, next: target === cs[1] })")
    check("totalled: 10 parts, the next car in the reticle", got == {"parts": 10, "totals": 1, "run": 10, "next": True}, got)
    xs, vs = [t[0] for t in trace], [t[1] for t in trace]
    check("the wreck skids towards the shoulder, slowing (then falls behind and is gone)", all(a < b for a, b in zip(xs, xs[1:])) and all(a >= b for a, b in zip(vs, vs[1:])) and js("crashes") <= 3,
          {"x": xs[::3], "v": vs[::3], "shoulder": js("+SHOULDER.toFixed(2)")})
    pg.screenshot(path=f"{OUT}/gang_wreck.png")
    # 6. a totalled rival is out of the race: you move up
    js("window.r = rivals().find(c => c.racer === 30); Object.assign(r, { z: odo + 400, lane: 1, x: MY_LANES[1] })")
    p0 = js("position()"); js("total(r)"); p1 = js("position()")
    check("a totalled rival is out of the race: up a place", p1 == p0 - 1, f"P{p0} -> P{p1}")
    # 7. the first total opens Mad Max, paid in parts
    js("run.left = 0.05"); pg.wait_for_function("run.phase === 'garage'", timeout=15000)
    rep = js("$('report').innerText")
    check("the garage: the first job done, Mad Max open", "Mad Max page is open" in rep and "Mad Max" in tabs() and "parts to spend" in js("$('bank').textContent"), [rep[-120:], tabs()])
    pg.click('[data-tab="madmax"]'); pg.wait_for_timeout(100)
    check("the Bull bar, paid in parts", js("document.querySelector('[data-buy=\"bullbar\"]').textContent") == "10 parts", js("document.querySelector('[data-buy=\"bullbar\"]')?.textContent"))
    js("progress.parts = 100"); pg.click('[data-buy="bullbar"]'); pg.wait_for_timeout(100)
    check("bought: bull bar 1", js("[lvl('bullbar'), bullBar, progress.parts]") == [1, 1, 90], js("[lvl('bullbar'), bullBar, progress.parts]"))
    pg.screenshot(path=f"{OUT}/gang_garage.png")
    # 8. the bull bar at 3: you carry on at the car's speed, and it takes 2.5 times the damage
    js("progress.levels.bullbar = 3; refreshCar()")
    got = js("(() => { const c = { v: 20, hp: null, racer: 0 }; speed = 60; bump(c); const kept = speed; ram(impact); return [Math.round(kept), c.wreck]; })()")
    check("bull bar 3: a bump at 144 km/h leaves you at its 72 km/h and totals it (144 of its 100)", got == [20, True], got)
    # 9. armour: a quarter off your damage a level
    got = js("[0, 2].map(l => { progress.levels.armour = l; progress.damage = 0; hurt(100, false); return +progress.damage.toFixed(2); })")
    check("armour 2: a 100 km/h bump does half the damage", got == [25, 12.5], got)
    js("progress.damage = 0; progress.levels.armour = 0")
    # 10. spiked hubs: a side-swipe while moving over costs no speed and does 50 more
    def swipe(spiked):
        js(f"progress.levels.spikes = {spiked}; progress.levels.bullbar = 0; refreshCar()")
        return js("""(() => { const c = { v: 30, hp: null, racer: 0 }; speed = 32; lane = 1; fromLane = 0; carX = 3.5; bump(c);
            const kept = speed; ram(impact); return { side: impact.side, kept: Math.round(kept), hp: Math.round(c.hp) }; })()""")
    got = [swipe(0), swipe(1)]
    check("spiked hubs: a side-swipe keeps your speed and does 50 more", got[0]["side"] and got[1]["kept"] == 32 and got[0]["kept"] < 20 and got[0]["hp"] - got[1]["hp"] == 50, got)
    # 11. the gang: with a bull bar a fleet car side-swipes a rival beside it, every 3 s; parts are yours
    pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
    def gang(bull):
        js(f"progress.levels.bullbar = {bull}; progress.levels.spikes = 0; refreshCar()")
        return js("""() => new Promise(res => { const f = racers().find(c => c.fleet), r = rivals().find(c => c.racer === 20);
            traffic.forEach(c => { if (c !== f && c !== r) c.z = c.racer ? odo - 9000 : odo + 5000; });
            Object.assign(f, { lane: 0, x: MY_LANES[0], z: odo + 300, v: 30, want: 30, cool: 99, rammed: 0 });
            Object.assign(r, { lane: 1, x: MY_LANES[1], z: odo + 300, v: 30, want: 30, cool: 99, hp: null, wreck: false });
            setTimeout(() => res(Math.round(r.hp ?? 150)), 1000); })""")
    got = [gang(0), gang(2)]
    check("bull bar 2: the gang side-swipes the rival beside it (40); without one it doesn't", got == [150, 110], got)
    # 12. guns: before them the marker is part of the rim; with them it is the trigger
    js("progress.levels.bullbar = 0; progress.levels.guns = 0; refreshCar()"); pg.wait_for_timeout(100)
    m = js("(() => { const r = $('trigger').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()")
    pg.mouse.move(*m); pg.mouse.down(); pg.wait_for_timeout(100); got = js("({ wheel: wheel.held, firing, fire: getComputedStyle($('fire')).display })"); pg.mouse.up()
    check("no guns: the marker is the wheel's, no FIRE", got == {"wheel": True, "firing": False, "fire": "none"}, got)
    js("progress.levels.guns = 2; refreshCar()"); pg.wait_for_timeout(100)
    place = """(d) => { const c = traffic.find(c => !c.racer); traffic.forEach(o => { if (o !== c && !o.fleet) o.z = o.racer ? odo - 9000 : odo + 5000; });
        racers().filter(o => o.fleet).forEach(o => o.z = odo - 4000);
        Object.assign(c, { dir: 1, lane: 1, x: MY_LANES[1], z: odo + d, v: speed, want: speed, cool: 99, hp: null, wreck: false }); window.tg = c; lane = fromLane = 0; carX = MY_LANES[0]; target = null; }"""
    js(f"({place})(60)"); pg.wait_for_function("target === tg && tg.seen", timeout=5000)
    fire = lambda secs: js(f"() => new Promise(res => {{ const t0 = run.left; const f = () => run.left > t0 - {secs} ? requestAnimationFrame(f) : res(); requestAnimationFrame(f); }})")
    pg.mouse.move(*m); pg.mouse.down(); held = js("({ firing, fire: getComputedStyle($('fire')).display, wheel: wheel.held })"); fire(1)
    hp = js("Math.round(tg.hp ?? 100)"); pg.mouse.up(); hp = [hp, js("Math.round(tg.hp ?? 100)")]  # at 1 s, and let go
    check("guns 2: the marker is the trigger (FIRE on it); a second of fire, 5 shots of 12 (a frame either way)",
          held["firing"] and held["fire"] != "none" and not held["wheel"] and 100 - hp[0] in (48, 60, 72), {"held": held, "hp": hp})
    pg.wait_for_timeout(500); check("let go: the guns stop", js("[firing, Math.round(tg.hp)]") == [False, hp[1]], js("[firing, Math.round(tg.hp)]"))
    hp = hp[1]
    pg.keyboard.down("g"); fire(0.5); pg.keyboard.up("g")
    check("G fires too", js("Math.round(tg.hp)") < hp, [hp, js("Math.round(tg.hp)")])
    js(f"({place})(250)"); pg.wait_for_function("target === tg", timeout=5000); pg.keyboard.down("g"); fire(0.6)
    pg.screenshot(path=f"{OUT}/gang_guns.png")  # firing, out of reach: the tracers miss
    check("out of reach (250 m): no damage", js("tg.hp") is None, js("tg.hp"))
    js("window.near = traffic.find(c => !c.racer && c !== tg); Object.assign(near, { dir: 1, lane: 0, x: MY_LANES[0], z: odo + 80, v: speed, want: speed, cool: 99, hp: null, wreck: false })")
    pg.wait_for_timeout(200); pg.keyboard.up("g")
    check("a nearer car while the reticle's is out of reach: the reticle moves to it", js("target === near"), js("target && Math.round(target.z - odo)"))
    # 13. the gang shoots: a fleet car with a rival 50 m ahead of it, a shot a second
    got = js("""() => new Promise(res => { const f = racers().find(c => c.fleet), r = rivals().find(c => c.racer === 25);
        traffic.forEach(c => { if (c !== f && c !== r) c.z = c.racer ? odo - 9000 : odo + 5000; });
        Object.assign(f, { lane: 0, x: MY_LANES[0], z: odo + 300, v: 30, want: 30, cool: 99, gun: 0 });
        Object.assign(r, { lane: 0, x: MY_LANES[0], z: odo + 350, v: 30, want: 30, cool: 99, hp: null, wreck: false });
        setTimeout(() => res(Math.round(r.hp ?? 150)), 1500); })""")
    check("the gang shoots at a rival ahead: 12 a second (one or two shots in 1.5 s)", got in (126, 138), got)
    # 14. the next race: its cars are new, so the reticle doesn't stay on the last one's rival still up the road
    js("""window.tg = rivals().find(c => c.racer === 20); traffic.forEach(c => { if (c !== tg) c.z = c.racer ? odo - 9000 : odo + 5000; });
        Object.assign(tg, { lane: 0, x: MY_LANES[0], z: odo + 120, v: speed, want: speed, cool: 99, hp: null, wreck: false }); target = null""")
    pg.wait_for_function("target === tg", timeout=5000)
    js("Object.assign(tg, { z: odo + 2000, v: 60, want: 60 }); run.left = 0.05"); pg.wait_for_function("run.phase === 'garage'", timeout=15000)
    pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000); pg.wait_for_timeout(200)
    got = js("({ old: target === tg, onRoad: !target || traffic.includes(target) })")
    check("the next race: the last one's car is gone from the reticle", got == {"old": False, "onRoad": True}, got)
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
