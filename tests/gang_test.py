"""Mad Max: nothing before 51 fleet cars; then the gang's first job (total a car) in the garage and the AR layer on the
windscreen: a reticle and a health bar on the nearest car ahead, kept until you pass it. Bumps hurt the car you hit;
at 0 health it skids onto the shoulder, out of your way, and pays parts. A totalled rival is out of the race. The
first total opens the Mad Max page, paid in parts; a bull bar hurts them more and costs you less speed."""
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
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
