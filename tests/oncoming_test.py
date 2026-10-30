"""Fuel madness in the oncoming traffic (the War Rig page): a mad driver coming at you steers for you while you are on
its side, and doesn't swerve for a game of chicken; a head-on with one is a hard crash, not the end of the run (it is
totaled, for double scrap); with a sane driver a head-on still ends it. Back on your side, the mad ones leave you be."""
from playwright.sync_api import sync_playwright
from common import URL, launch
CAR = ("power: 10, rev: 4, gears: 3, tyres: 4, time: 6, clutch: 1, gas: 1, shift: 1, engine: 2, flash: 5, reckless: 1, "
       "chicken: 1, fleet: 60, bullbar: 1, baddrivers: 4")
errors, fails = [], []


def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)


# you in the near oncoming lane (or your own); one oncoming car `ahead` m up the road in the far oncoming lane, mad or
# sane (Fuel madness switched off), everything else out of the way
SETUP = """([madOne, ahead, yourLane]) => { progress.damage = 0; run.flashes = 5; progress.off.baddrivers = !madOne; // sane: switched off
  traffic.forEach(c => { if (!c.racer) Object.assign(c, { dir: -1, x: LANES.oncoming[1], z: odo + 6000 }); else c.z = odo - 9000; });
  lane = fromLane = yourLane; carX = ROAD_LANES[yourLane]; slide = 0;
  window.them = traffic.find(c => !c.racer && !c.police && !c.tank && mad(c) === madOne);
  Object.assign(them, { dir: -1, x: LANES.oncoming[1], z: odo + ahead, v: 25, want: 25, swerve: null, wreck: false, hp: null,
                        hit: -Infinity, warned: true, beams: 0, d: ahead }); return !!them; }"""
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errors.append(str(e))); js = pg.evaluate
    pg.goto(URL)
    js(f"localStorage.clear(); Object.assign(progress, {{ racing: true, finish: 1, runs: 40, totals: 1, bank: 10000, levels: {{ {CAR} }}, engine: 2 }}); 0")
    pg.click('[data-play="distance"]'); pg.wait_for_timeout(200); js("refreshCar(); renderGarage(); 0")
    pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
    check("90% of drivers mad", js("game.madness()") == 0.9, js("game.madness()"))
    # 1. on its side, a mad driver comes at you: it steers into your lane
    check("set up a mad one", js(f"({SETUP})([true, 200, 2])"))
    pg.wait_for_timeout(1200)
    got = js("[+them.x.toFixed(2), +carX.toFixed(2), them.wreck]")
    check("on its side: a mad driver steers for you", abs(got[0] - got[1]) < 0.3, got)
    # 2. it won't swerve for a game of chicken; a sane one does
    js(f"({SETUP})([true, 150, 2])"); js("them.x = carX; flashAhead(); 0")
    got = js("them.swerve"); check("a mad driver won't chicken out", got is None, got)
    js(f"({SETUP})([false, 150, 2])"); js("them.x = carX; flashAhead(); 0")
    got = js("them.swerve"); check("a sane one swerves", got is not None, got)
    # 3. a head-on with a mad driver: not the end, a hard crash; it is totaled, for double scrap
    js(f"({SETUP})([true, 3, 2])"); js("them.x = carX; window.v0 = speed = 30; window.p0 = progress.scrap; 0")
    pg.wait_for_function("them.wreck || run.phase !== 'run'", timeout=5000); pg.wait_for_timeout(100)
    got = js("({ phase: run.phase, slower: speed < v0 * 0.5, damage: Math.round(progress.damage), scrap: progress.scrap - p0, flash: $('flash').textContent })")
    check("a head-on with a mad driver: the run goes on, slower, hurt; it's totaled for 44 scrap",
          got["phase"] == "run" and got["slower"] and got["damage"] >= 40 and got["scrap"] == 44 and "HEAD-ON!" in got["flash"], got)
    # 4. back on your side, a mad one leaves you be
    js(f"({SETUP})([true, 200, 0])"); x0 = js("them.x"); pg.wait_for_timeout(1000)
    got = js("them.x"); check("on your own side: it keeps to its lane", abs(got - x0) < 0.05, [x0, got])
    # 5. a head-on with a sane driver still ends the run
    js(f"({SETUP})([false, 3, 2])"); js("them.x = carX; speed = 30; 0")
    pg.wait_for_function("run.phase !== 'run'", timeout=5000)
    got = js("[run.phase, run.race && run.race.dnf]"); check("a head-on with a sane driver: DNF", got[1] == "head-on", got)
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
