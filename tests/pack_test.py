"""The Hunting pack (the War Rig page): each fleet car hunts the nearest car ahead of it going your way within 150 m,
rivals and traffic alike, as Hunter hunts for you: into its lane and into it, a hit a ram, until it is totalled (its
scrap is yours). It never takes your lane in front of you, and without the upgrade the gang leaves traffic be."""
from playwright.sync_api import sync_playwright
from common import URL, launch
CAR = ("power: 10, rev: 4, gears: 3, tyres: 4, time: 6, clutch: 1, gas: 1, shift: 1, engine: 2, reckless: 1, fleet: 60")
errors, fails = [], []


def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)


# one fleet car `ahead` m up the road in your lane 0, one slow car (a rival if `racer`) 60 m further on in lane 1,
# everything else out of the way (the other racers 200 m apart, out of each other's reach); you in lane `yours`
SETUP = """([pack, racer, ahead, yours]) => { progress.levels.pack = pack; progress.damage = 0;
  traffic.forEach((c, i) => { if (!c.racer) Object.assign(c, { dir: -1, x: LANES.oncoming[1], z: odo + 6000 }); else c.z = odo - 9000 - 200 * i; });
  lane = fromLane = yours; carX = MY_LANES[yours]; slide = 0; speed = 30;
  window.hunter = traffic.find(c => c.fleet);
  window.prey = traffic.find(c => !c.police && !c.tank && (racer ? c.racer && !c.fleet : !c.racer));
  Object.assign(hunter, { lane: 0, x: MY_LANES[0], z: odo + ahead, v: 30, want: 30, cool: 0, prey: null, seek: 0, rammed: 0, wreck: false, hp: null });
  Object.assign(prey, { dir: 1, lane: 1, x: MY_LANES[1], z: odo + ahead + 60, v: 22, want: 22, cool: 99, hp: null, wreck: false,
                        hit: -Infinity, jumped: true, d: ahead + 60 }); window.p0 = progress.scrap; 0 }"""
# what happens over `secs` s: the hunter's lanes, the prey's health, and whether it was totalled
WATCH = """(secs) => new Promise(res => { const t0 = performance.now(), out = { lanes: new Set(), hp: [] };
  const f = () => { speed = Math.min(speed, hunter.v - 1); out.lanes.add(hunter.lane); if (prey.hp !== null) out.hp.push(Math.round(prey.hp));
    performance.now() - t0 < secs * 1000 && !prey.wreck ? requestAnimationFrame(f) : res({ lanes: [...out.lanes], hits: [...new Set(out.hp)],
      wreck: prey.wreck, scrap: progress.scrap - p0, flash: $('flash').textContent, hunting: hunter.prey === prey }); };
  requestAnimationFrame(f); })"""
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errors.append(str(e))); js = pg.evaluate
    pg.goto(URL)
    js(f"localStorage.clear(); Object.assign(progress, {{ racing: true, finish: 1, runs: 40, totals: 1, bank: 10000, levels: {{ {CAR} }}, engine: 2 }}); 0")
    pg.click('[data-play="distance"]'); pg.wait_for_timeout(200); js("refreshCar(); renderGarage(); 0")
    pg.click('[data-tab="warrig"]'); pg.wait_for_timeout(100)
    got = js("document.querySelector('[data-buy=\"pack\"]')?.closest('.card').querySelector('b').textContent")
    check("on the War Rig page", got == "Hunting pack", got)
    pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
    # 1. without it: the fleet car keeps to its lane and leaves the car be
    js(f"({SETUP})([0, false, 100, 0])"); got = js(f"({WATCH})(5)")
    check("no Hunting pack: no hunting", got["lanes"] == [0] and not got["hits"] and not got["wreck"], got)
    # 2. with it: into the car's lane and into it, a hit a ram, till it is totalled; its scrap is yours
    js(f"({SETUP})([1, false, 100, 0])"); got = js(f"({WATCH})(20)")
    check("Hunting pack: into its lane and into it, a hit at a time", 1 in got["lanes"] and len(got["hits"]) >= 2, got)
    check("... totalled, for its scrap", got["wreck"] and got["scrap"] == 22 and got["flash"] == "THE GANG TOTALLED A CAR +22 SCRAP", got)
    # 3. a rival too: out of the race
    js(f"({SETUP})([1, true, 100, 0])"); got = js(f"({WATCH})(30)")
    check("a rival too: totalled, 55 scrap", got["wreck"] and got["scrap"] == 55 and got["flash"].startswith("THE GANG TOTALLED #"), got)
    # 4. its prey in your lane, you behind: it stays out of your way (and you get the car)
    js(f"({SETUP})([1, false, 100, 1])"); got = js(f"({WATCH})(4)")
    check("never into your lane in front of you", got["lanes"] == [0] and got["hunting"] and not got["hits"], got)
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
