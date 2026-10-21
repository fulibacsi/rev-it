"""The final boss: at 100% heat the garage warns of the tank, and the next race has it. It holds the road about 80 m
ahead of you in your lane, is the AR target ("TANK"), shells you (8% damage each, less with armour), and shrugs off
rams; your guns and the gang's wear it down. Destroyed: TANK DOWN, the run stops there; the ending (heat back to 0,
parts), and the next tank is tougher. Not destroyed by the bell: a DNF, and the heat drops to half."""
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
CAR = ("power: 10, rev: 4, gears: 3, tyres: 4, time: 6, clutch: 1, gas: 1, shift: 1, engine: 2, reckless: 1, flash: 5, "
       "fleet: 51, bullbar: 1, spikes: 1, guns: 3")
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errors.append(str(e))); js = pg.evaluate
    pg.goto(URL)
    def garage(wanted, tanks=0, armour=0):
        js(f"localStorage.clear(); Object.assign(progress, {{ racing: true, finish: 1, runs: 80, bank: 10000, totals: 5, wanted: {wanted}, tanks: {tanks}, damage: 0, broken: [], levels: {{ {CAR}, armour: {armour} }}, engine: 2 }})")
        if js("game.id") != "distance": pg.click('[data-play="distance"]'); pg.wait_for_timeout(200)
        elif js("run.phase") != "garage": js("run.left = 0.05"); pg.wait_for_function("run.phase === 'garage'", timeout=15000)
        js("refreshCar(); forgetRun(); renderGarage()")
    def race():
        pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
        js("traffic.forEach(c => { if (c.racer) c.z = odo - (c.fleet ? 3000 : 9000); else if (!c.tank) Object.assign(c, { dir: -1, x: LANES.oncoming[1], police: false }); }); copClock = 999; 0")
    # 1. 99%: no tank; 100%: the act's card (the pause menu's, the garage's title) warns of it
    card = lambda: js("[currentCard().id, currentCard().text(), currentCard().now()].join(' | ')")
    garage(0.99); check("99% heat: no tank", not js("bossRace()") and card().startswith("nolaw |"), card())
    garage(1); check("100% heat: the act's card warns of the tank", js("bossRace()") and card().startswith("tanksent |") and "the army has sent a tank" in card(), card())
    js("progress.levels.guns = 0; renderGarage()")
    check("100% heat but no guns: no tank yet, the card says it waits", not js("bossRace()") and card().startswith("nolaw |") and "a tank ready for when you are armed" in card(), card())
    js("progress.levels.guns = 3; refreshCar(); renderGarage()")
    # 2. the race: the tank appears up the road, comes back to about 80 m ahead, in your lane, the AR on it
    race(); pg.wait_for_function("run.tank", timeout=5000)
    pg.wait_for_function("speed > 25", timeout=20000); pg.wait_for_timeout(5000)
    got = js("({ gap: Math.round(run.tank.z - odo), lane: run.tank.lane === lane, target: target === run.tank, label: $('ar-label').textContent })")
    check("the tank: about 80 m ahead of you, in your lane, in the reticle as TANK", 60 <= got["gap"] <= 110 and got["lane"] and got["target"] and got["label"] == "TANK", got)
    pg.screenshot(path=f"{OUT}/boss_tank.png")
    # 3. it shells you: 8% a hit every 2.5 s
    d0 = js("progress.damage"); pg.wait_for_timeout(2700); d1 = js("progress.damage")
    check("it shells you: 8% damage a hit", round(d1 - d0) in (8, 16), round(d1 - d0, 1))
    # 4. a ram barely scratches it; guns wear it down
    got = js("(() => { const t = run.tank, h0 = t.hp ?? health(t); ram({ car: t, kmh: 100, headOn: false, side: false }); return [Math.round(h0), Math.round(h0 - t.hp)]; })()")
    check("a 100 km/h ram: a fifth of a hit (11 of its 1,000 with bull bar 1; the gang may have shot it already)", got[1] == 11, got)
    got = js("(() => { const t = run.tank, h0 = t.hp; ram({ car: t, kmh: 300, headOn: false, side: false }); return [!!t.wreck, Math.round(h0 - t.hp)]; })()")
    check("no OHKO for the tank: a 300 km/h ram is still a fifth of a hit", got == [False, 11], got)
    js("progress.damage = 0"); h0 = js("run.tank.hp"); pg.keyboard.down("g"); pg.wait_for_timeout(1000); pg.keyboard.up("g")
    check("guns 3: about 18 a shot, 4 a second", 50 <= h0 - js("run.tank.hp") <= 95, h0 - js("run.tank.hp"))
    # 5. destroyed: the ending
    js("progress.damage = 0; run.tank.hp = 10"); pg.keyboard.down("g"); pg.wait_for_function("run.tank.wreck", timeout=5000); pg.keyboard.up("g")
    got = js("({ wanted: progress.wanted, tanks: progress.tanks, parts: run.parts })")
    check("destroyed: heat back to 0, 300 parts, one tank beaten", got == {"wanted": 0, "tanks": 1, "parts": 300}, got)
    pg.wait_for_timeout(300)
    got = js("({ phase: run.phase, left: Math.round(run.left), hud: $('run-dist').textContent, flash: $('flash').textContent })")
    check("TANK DOWN on the head-up display, the run stopped with time to spare", got["phase"] == "finish" and got["left"] > 5 and got["hud"] == "TANK DOWN" and got["flash"] == "TANK DOWN!", got)
    pg.screenshot(path=f"{OUT}/boss_tank_down.png")
    pg.wait_for_timeout(3000); check("held a while (4 s), longer than a finish", js("run.phase") == "finish", js("run.phase"))
    pg.wait_for_function("run.phase === 'garage'", timeout=5000)
    rep = js("$('report').textContent") # the garage is out of sight behind the ending
    check("the ending, then play on: a result, not a DNF; the act's card says to push for the next", "+300 parts" in rep and "DNF" not in rep
          and "The tank is scrap" in card() and "the next one is tougher" in card(), [rep, card()])
    check("the next tank is half as tough again", js("tankHealth()") == 1500, js("tankHealth()"))
    got = js("({ menu: menuOpen, screen, text: $('menu').innerText })")
    check("then the ending: WARLORD OF THE COAST ROAD, the stats, a tank beaten", got["menu"] and got["screen"] == "win"
          and "WARLORD OF THE COAST ROAD" in got["text"] and "Tanks beaten\n1" in got["text"], {k: v for k, v in got.items() if k != "text"})
    buttons = js("[...document.querySelectorAll('[data-screen=win] button')].map(b => b.textContent)")
    check("its buttons: MAIN MENU, SHARE, BACK TO THE GARAGE (no NEW GAME)", buttons == ["MAIN MENU", "SHARE", "BACK TO THE GARAGE"], buttons)
    check("over the road: the garage not behind it", js("getComputedStyle($('garage')).visibility") == "hidden", js("getComputedStyle($('garage')).visibility"))
    pg.screenshot(path=f"{OUT}/boss_win.png")
    pg.click("#win-garage"); pg.wait_for_timeout(100)
    check("BACK TO THE GARAGE: playing on, the garage there", js("[menuOpen, run.phase, getComputedStyle($('garage')).visibility]") == [False, "garage", "visible"],
          js("[menuOpen, run.phase, getComputedStyle($('garage')).visibility]"))
    js("openMenu('win')")
    pg.click("#win-main"); got = js("[screen, $('continue').textContent, $('continue').classList.contains('done')]")
    check("exit to the main menu: CONTINUE with the tick, and it plays on in the garage", got == ["main", "CONTINUE", True], got)
    pg.click("#continue"); pg.wait_for_timeout(100)
    check("CONTINUE: back in the garage, playing on", js("[menuOpen, run.phase]") == [False, "garage"], js("[menuOpen, run.phase]"))
    # 6. lost at the bell: a DNF, the heat down to half
    garage(1); race(); pg.wait_for_function("run.tank", timeout=5000); js("run.left = 0.05"); pg.wait_for_function("run.phase === 'garage'", timeout=15000)
    got = js("({ dnf: run.race && run.race.dnf, wanted: progress.wanted, report: $('report').innerText })")
    check("the bell with the tank still going: DNF, heat 50%", got["dnf"] == "tank" and got["wanted"] == 0.5 and "the tank held the road" in got["report"], {k: v for k, v in got.items() if k != "report"})
    # 7. wrecked by its shells: a DNF too; armour takes the sting out
    garage(1, armour=2); race(); pg.wait_for_function("run.tank", timeout=5000)
    js("progress.damage = 0; run.tank.z = odo + 100; run.tank.shell = 0"); pg.wait_for_timeout(300)
    check("armour 2: a shell does 4%", round(js("progress.damage")) == 4, js("progress.damage"))
    js("progress.damage = 99; run.tank.shell = 0"); pg.wait_for_function("run.phase !== 'run'", timeout=5000)
    check("wrecked by the tank: DNF, heat 50%", js("[run.race.dnf, progress.wanted]") == ["wrecked", 0.5], js("[run.race.dnf, progress.wanted]"))
    # 8. Reckless auto-drive doesn't try to pass the tank: boxed in behind it, nothing coming, it stays on your side
    garage(1); js("Object.assign(progress.levels, { steer: 1, cruise: 1, recklessCruise: 1 }); refreshCar()"); race()
    pg.wait_for_function("run.tank", timeout=5000); pg.wait_for_function("speed > 25", timeout=20000)
    js("progress.damage = 0")
    box = """(() => { lane = fromLane = 1; carX = MY_LANES[1]; const cs = traffic.filter(c => !c.racer && !c.tank && !c.police);
        [[0, 30], [1, 35]].forEach(([l, d], i) => Object.assign(cs[i], { dir: 1, lane: l, x: MY_LANES[l], z: odo + d, v: 5, want: 5, cool: 99 }));
        run.tank.shell = 99; })()"""
    lanes = js(f"""() => new Promise(res => {{ const out = []; {box}; const h = setInterval(() => {{ out.push(lane);
        if (out.length >= 25) {{ clearInterval(h); res(out); }} }}, 100); }})""")
    check("Reckless auto-drive behind the tank: boxed in, it stays on your side", max(lanes) <= 1, lanes)
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
