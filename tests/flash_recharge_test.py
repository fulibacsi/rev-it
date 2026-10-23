"""Flash recharge: in sight from 5 flashes, Reckless driving a teaser (???) before the reveal; on sale with 5 flashes
and Reckless driving (the owner's graph: before the reveal it held up the first act);
a used flash comes back after 10 s at level 1 and 2 s at level 5, never past the run's full count; the refill shows as
a line under the high-beam telltale; it doesn't change the reveal's head start."""
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
CAR = "power: 10, rev: 4, gears: 3, tyres: 4, time: 6, clutch: 1, gas: 1, shift: 1, engine: 2, flash: 10"
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL); js = pg.evaluate
    # 1. the shop: only after 10 flashes, 10 s down to 2 s, the head start untouched
    js("localStorage.clear(); Object.assign(progress, { bank: 9e6, levels: { flash: 10 }, runs: 1, toured: TUTORIALS.map(t => t.id) })")
    why = lambda: js("whyNot('flashRecharge')")
    check("before the reveal: in sight from 5 flashes, Reckless driving a teaser (???)", js("shows('flashRecharge')") and why() == "needs ✓ Headlight flash 5/5 · ???", why())
    js("Object.assign(progress, { racing: true, levels: { flash: 10, blackTab: 1 } })")
    check("the Black market bought: it names Reckless driving", why() == "needs ✓ Headlight flash 5/5 · Reckless driving", why())
    js("Object.assign(progress.levels, { flash: 4, reckless: 1 })")
    check("locked with 4 flashes", why() == "needs Headlight flash 4/5 · ✓ Reckless driving", why())
    js("progress.levels.flash = 5")
    check("for sale with 5 flashes and Reckless driving", why() == "", why())
    times = js("[1, 2, 3, 4, 5].map(l => rechargeTime(l))")
    check("a flash back every 10, 8, 6, 4, 2 s", times == [10, 8, 6, 4, 2], times)
    print("   prices:", js("Array.from({ length: 5 }, (_, l) => { progress.levels.flashRecharge = l; return cost('flashRecharge'); })"))
    js(f"progress.levels = {{ {CAR} }}")  # a car nearly built, where the head start is shrinking
    h0 = js("progress.levels.flashRecharge = 0; Math.round(headStart())"); h5 = js("progress.levels.flashRecharge = 5; Math.round(headStart())")
    check("the white car's head start doesn't change", h0 == h5, f"{h0} -> {h5}")
    # 2. a run at level 5: a used flash back in 2 s, with the refill under the telltale; none past 10
    def start(levels):
        js(f"localStorage.clear(); Object.assign(progress, {{ racing: true, finish: 1, bank: 9e6, levels: {{ {levels} }}, engine: 2, runs: 1, toured: TUTORIALS.map(t => t.id) }})")
        if js("game.id") != "distance": pg.click('[data-play="distance"]'); pg.wait_for_timeout(200)
        else: js("run.left = 0.1"); pg.wait_for_function("run.phase === 'garage'", timeout=15000)
        js("refreshCar()"); pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
        js("traffic.forEach(c => { if (!c.racer) { c.dir = -1; c.x = LANES.oncoming[0]; } else c.z = odo - 9000; })")
    after = lambda secs: pg.wait_for_function(f"run.left <= window.t0 - {secs}", timeout=30000)  # by the run's clock
    start(CAR + ", flashRecharge: 5")
    js("run.flashes = 7; run.recharge = 0; window.t0 = run.left"); after(1)
    bar = js("(() => { const b = $('hud-beam'), w = parseFloat(getComputedStyle(b, '::after').width); return { line: Math.round(w), beam: Math.round(b.getBoundingClientRect().width), flashes: run.flashes }; })()")
    check("half way: the refill line half under the telltale", 0.3 < bar["line"] / bar["beam"] < 0.7 and bar["flashes"] == 7, bar)
    pg.screenshot(path=f"{OUT}/flash_recharge.png", clip={"x": 520, "y": 380, "width": 400, "height": 120})
    after(2.2)
    check("after 2 s, a flash is back", js("run.flashes") == 8, js("run.flashes"))
    js("run.flashes = 0; run.recharge = 0; window.t0 = run.left"); after(1)
    dim = js("(() => { const b = $('hud-beam'); return { empty: b.classList.contains('empty'), icon: +getComputedStyle(b.querySelector('svg')).opacity, line: Math.round(parseFloat(getComputedStyle(b, '::after').width)) }; })()")
    check("none left: the telltale dimmed, the refill line in full", dim["empty"] and dim["icon"] < 0.5 and dim["line"] > 5, dim)
    js("run.flashes = 10"); pg.wait_for_timeout(2600)
    check("never past the full count", js("[run.flashes, Math.round(parseFloat(getComputedStyle($('hud-beam'), '::after').width))]") == [10, 0],
          js("[run.flashes, Math.round(parseFloat(getComputedStyle($('hud-beam'), '::after').width))]"))
    # 3. level 1: 10 s; without the upgrade, nothing comes back
    start(CAR + ", flashRecharge: 1")
    js("run.flashes = 5; run.recharge = 0; window.t0 = run.left"); after(6); n6 = js("run.flashes"); after(10.3)
    check("level 1: back after 10 s, not 6", [n6, js("run.flashes")] == [5, 6], [n6, js("run.flashes")])
    start(CAR)
    js("run.flashes = 5"); pg.wait_for_timeout(3000)
    check("without it, a used flash stays gone", js("run.flashes") == 5, js("run.flashes"))
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
