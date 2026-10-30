"""The aids leave a control to you only while you touch it: your foot on the clutch or the brake keeps Auto clutch and
autocruise off that pedal. The nitro pedal (not the gas pedal) leaves traction control on, but autocruise neither brakes
nor lifts while you push it. Your foot on the brake lifts Auto gas off the gas on the move (not on the line, nor while
you push the nitro pedal) and Reckless auto-drive off the nitro."""
from playwright.sync_api import sync_playwright
from common import URL, launch
CAR = "power: 10, rev: 4, gears: 3, tyres: 4, time: 6, clutch: 1, gas: 1, shift: 1, engine: 2, steer: 1, cruise: 1, reckless: 1, ecuPower: 1, nitro: 2"
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL); js = pg.evaluate; kb = pg.keyboard
    js(f"localStorage.clear(); Object.assign(progress, {{ racing: true, finish: 1, bank: 9e6, levels: {{ {CAR} }}, engine: 2, runs: 1, toured: TUTORIALS.map(t => t.id) }})")
    pg.click('[data-play="distance"]'); pg.wait_for_timeout(200); js("refreshCar()"); pg.click("#drive")
    pg.wait_for_function("run.phase === 'run'", timeout=15000)
    js("traffic.forEach(c => c.z = odo + 4000); racers().forEach(c => c.z = odo - 9000); progress.nitro = 4")
    pg.wait_for_function("gear >= 3", timeout=20000)
    sample = lambda expr, ms=600: js(f"""() => new Promise(res => {{ const out = []; const h = setInterval(() => {{ out.push({expr});
        if (out.length * 50 >= {ms}) {{ clearInterval(h); res(out); }} }}, 50); }})""")
    # 1. your foot on the clutch (Shift): Auto clutch, which would let it out in gear, leaves it down
    kb.down("Shift"); got = sample("+clutchPedal.toFixed(2)"); kb.up("Shift")
    check("your foot on the clutch: Auto clutch leaves it to you", min(got[4:]) == 1, got)
    pg.wait_for_timeout(400)
    check("off the clutch: Auto clutch has it again", js("clutchPedal") < 0.1, js("clutchPedal"))
    # 2. a slow car close ahead, the other lane blocked too: autocruise brakes. With the nitro key held it neither
    #    brakes nor lifts, and lets go of the brake it had on
    block = "(() => { const cs = traffic.filter(c => !c.racer); [[0, 40], [1, 45]].forEach(([l, d], i) => Object.assign(cs[i], { dir: 1, lane: l, x: MY_LANES[l], z: odo + d, v: 15, want: 15, cool: 99 })); })()"
    js(block); pg.wait_for_function("brakePedal > 0.3", timeout=5000)
    kb.down("n"); got = sample("[+brakePedal.toFixed(2), +gasPedal.toFixed(2), nitro]", 400); kb.up("n")
    check("nitro key held: autocruise lets go of the brake and keeps off it, the gas stays down", max(r[0] for r in got[2:]) == 0 and min(r[1] for r in got[2:]) > 0.5 and any(r[2] for r in got), got[::2])
    js("traffic.forEach(c => c.z = odo + 4000)"); pg.wait_for_timeout(300)
    # 3. autocruise braking, then your foot on the brake too, then the road clears: autocruise, which lets its own
    #    braking go once the way is clear, leaves your brake alone
    js(block); pg.wait_for_function("brakePedal > 0.3", timeout=5000); kb.down("b"); pg.wait_for_timeout(200)
    got = js("""() => new Promise(res => { const out = []; traffic.forEach(c => c.z = odo + 4000); // every frame: a let-go
        const f = () => { out.push(+brakePedal.toFixed(2)); out.length < 20 ? requestAnimationFrame(f) : res(out); }; // lasts one
        requestAnimationFrame(f); })"""); kb.up("b")
    check("your foot on the brake: autocruise leaves it to you", min(got) == 1, got)
    # 4. knocked into neutral while the tires spin (a broken gear, a shift): Auto gas stays a number, the revs too
    got = js("(() => { gear = 0; spinning = true; locked = false; autoGas(); return Number.isFinite(gasPedal) ? gasPedal : String(gasPedal); })()")
    pg.wait_for_timeout(300)
    check("neutral with the tires spinning: Auto gas floors it (no NaN), the revs stay a number", got == 1 and js("Number.isFinite(rpm)"), [got, js("rpm")])
    # 5. on the move, your foot on the brake: Auto gas lifts off (it held the gas down, so braking by hand slowed the car
    #    less than half as hard), and floors it again once you let go. Measured in game time (the run's clock)
    js("traffic.forEach(c => c.z = odo + 4000)"); pg.wait_for_function("gear >= 3 && speed > 30 && gasPedal > 0.5", timeout=10000)
    kb.down("b"); pg.wait_for_timeout(200)
    got = js("""() => new Promise(res => { const v0 = speed, t0 = run.left, gas = [];
        const f = () => { gas.push(+gasPedal.toFixed(2)); t0 - run.left < 0.5 ? requestAnimationFrame(f) : res({ gas: Math.max(...gas),
          decel: +((v0 - speed) / (t0 - run.left)).toFixed(1), brakes: +brakeDecel().toFixed(1) }); };
        requestAnimationFrame(f); })""")
    kb.up("b")
    check("your foot on the brake: Auto gas lifts off, the car slows as hard as the brakes go", got["gas"] == 0 and got["decel"] >= 0.9 * got["brakes"], got)
    pg.wait_for_timeout(500)
    check("off the brake: Auto gas has the gas down again", js("gasPedal") > 0.5, js("gasPedal"))
    # 6. standing on the line with your foot on the brake: the launch revs, as before; your nitro pedal and the brake
    #    together: the nitro floors the gas, traction control trims it
    got = js("""(() => { const was = [speed, gear, clutch, rpm]; speed = 0; gear = 1; clutch = 0; rpm = 1000; PEDALS.brake.hold = 1;
        autoGas(); const g = gasPedal; PEDALS.brake.hold = null; [speed, gear, clutch, rpm] = was; return g; })()""")
    check("on the line, your foot on the brake: Auto gas holds the launch revs", got > 0.5, got)
    got = js("(() => { PEDALS.brake.hold = 1; nitroHeld = true; autoGas(); const g = gasPedal; PEDALS.brake.hold = null; nitroHeld = false; return g; })()")
    check("the nitro pedal and the brake together: the gas stays down", got > 0.5, got)
    # 7. Reckless auto-drive, a rival 300 m ahead in your other lane: it pushes the nitro pedal; your foot on the brake
    #    takes it off
    js("progress.levels.recklessCruise = 1; progress.nitro = 4; traffic.forEach(c => c.z = odo + 4000)")
    js("(() => { const r = rivals()[0], l = 1 - lane; Object.assign(r, { z: odo + 300, lane: l, x: MY_LANES[l], v: speed, want: speed, cool: 99 }); })()")
    pg.wait_for_function("nitroByAid", timeout=5000)
    kb.down("b"); pg.wait_for_timeout(150); got = sample("[nitroByAid, nitro]", 300); kb.up("b")
    check("Reckless auto-drive's nitro: off while your foot is on the brake", not any(r[0] or r[1] for r in got), got)
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
