"""Hunter (the War Rig page): autocruise hunts the car in the reticle within 150 m, into its lane and into it, instead
of steering round it or braking for it. Not the tank, not past 60% damage, and your hand on the wheel overrides it;
switched off, autocruise is itself again. Nor does autocruise brake for a slower car beyond the one it hunts (the ram
slows you to that one's speed). (The aids taking a mad driver's cut-in as a ram: gang_test.py.)"""
from playwright.sync_api import sync_playwright
from common import URL, launch
CAR = ("power: 10, rev: 4, gears: 3, tyres: 4, time: 6, clutch: 1, gas: 1, shift: 1, steer: 1, cruise: 1, engine: 2, "
       "reckless: 1, fleet: 60, bullbar: 1")
errors, fails = [], []


def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)


# a slow car 120 m ahead in your other lane, the only one on your side, in the reticle; then what the car does
SETUP = """(hunter) => { progress.levels.hunter = hunter; progress.damage = 0; target = null;
  traffic.forEach(c => { if (!c.racer) { c.dir = -1; c.x = LANES.oncoming[1]; c.z = odo + 4000; } else c.z = odo - 9000; });
  lane = fromLane = 0; carX = MY_LANES[0]; slide = 0;
  window.prey = traffic.find(c => !c.racer && !c.police);
  Object.assign(prey, { dir: 1, lane: 1, x: MY_LANES[1], z: odo + 120, v: speed - 20, want: speed - 20, cool: 99, hp: null, wreck: false,
                        tank: false, hit: -Infinity, d: 120 }); 0 }"""
WATCH = """(secs) => new Promise(res => { const t0 = performance.now(), out = { lanes: [], brake: 0, hit: false };
  const f = () => { out.lanes.push(lane); out.brake = Math.max(out.brake, brakePedal); out.hit ||= prey.hp !== null || prey.wreck;
    performance.now() - t0 < secs * 1000 && !out.hit ? requestAnimationFrame(f) : res({ lane, brake: +out.brake.toFixed(2), hit: out.hit,
      gap: Math.round(prey.z - odo), target: target === prey }); };
  requestAnimationFrame(f); })"""
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errors.append(str(e))); js = pg.evaluate
    pg.goto(URL)
    js(f"localStorage.clear(); Object.assign(progress, {{ racing: true, finish: 1, runs: 40, totals: 1, bank: 10000, levels: {{ {CAR} }}, engine: 2 }}); 0")
    pg.click('[data-play="distance"]'); pg.wait_for_timeout(200); js("refreshCar(); renderGarage(); 0")
    pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000); pg.wait_for_function("speed > 30", timeout=20000)
    # 1. without Hunter: autocruise passes the slow car in the other lane (stays in its own), no ram
    js(f"({SETUP})(0)"); got = js(f"({WATCH})(6)")
    check("no Hunter: autocruise keeps its lane, no ram", got["lane"] == 0 and not got["hit"], got)
    # 2. Hunter: into its lane and into it, without braking for it
    js(f"({SETUP})(1)"); got = js(f"({WATCH})(8)")
    check("Hunter: into the reticle car's lane and into it, no braking for it", got["lane"] == 1 and got["hit"] and got["brake"] < 0.3, got)
    # 2b. a slower car 40 m beyond it, and one in your other lane (no way round): no braking for the one beyond before
    #     the ram either (autocruise did, 18 Oct)
    js(f"({SETUP})(1); speed = 60; Object.assign(prey, {{ v: 45, want: 45 }}); "
       "traffic.filter(c => !c.racer && !c.police && c !== prey).slice(0, 2).forEach((c, i) => Object.assign(c, { dir: 1, lane: 1 - i, "
       "x: MY_LANES[1 - i], z: prey.z + 40 - 10 * i, v: 30, want: 30, cool: 99, hp: null, wreck: false, tank: false, hit: -Infinity, d: 160 })); 0")
    got = js(f"({WATCH})(10)")
    check("a slower car beyond it: no braking before the ram", got["lane"] == 1 and got["hit"] and got["brake"] < 0.3, got)
    # 3. past 60% damage it backs off: autocruise is itself again
    js(f"({SETUP})(1); progress.damage = 70; 0"); got = js(f"({WATCH})(6)")
    check("past 60% damage: no hunting", got["lane"] == 0 and not got["hit"], got)
    # 4. the tank is left to the guns
    js(f"({SETUP})(1); prey.tank = true; 0"); pg.wait_for_timeout(300)
    check("the tank: not hunted", not js("hunted(prey)"), js("hunted(prey)"))
    js("prey.tank = false; 0")
    # 5. switched off, and your hand on the wheel: no hunting
    js(f"({SETUP})(1); progress.off.hunter = true; 0"); pg.wait_for_timeout(300)
    check("switched off: no hunting", not js("hunted(prey)"), js("hunted(prey)"))
    js(f"delete progress.off.hunter; ({SETUP})(1); wheel.held = true; 0"); pg.wait_for_timeout(1500)
    check("your hand on the wheel: it doesn't steer", js("lane") == 0, js("lane"))
    js("wheel.held = false; progress.damage = 0; 0")
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
