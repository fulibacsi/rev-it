"""The aids leave a control to you only while you touch it: your foot on the clutch or the brake keeps Auto clutch and
autocruise off that pedal. The nitro pedal (not the gas pedal) leaves traction control on, but autocruise neither brakes
nor lifts while you push it."""
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
    js(f"localStorage.clear(); Object.assign(progress, {{ racing: true, finish: 1, bank: 9e6, levels: {{ {CAR} }}, engine: 2 }})")
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
    # 4. knocked into neutral while the tyres spin (a broken gear, a shift): Auto gas stays a number, the revs too
    got = js("(() => { gear = 0; spinning = true; locked = false; autoGas(); return Number.isFinite(gasPedal) ? gasPedal : String(gasPedal); })()")
    pg.wait_for_timeout(300)
    check("neutral with the tyres spinning: Auto gas floors it (no NaN), the revs stay a number", got == 1 and js("Number.isFinite(rpm)"), [got, js("rpm")])
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
