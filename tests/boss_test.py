"""The final boss: at 100% heat the garage warns of the tank, and the next race has it (never the race the heat fills
in): its card pops up over the road as you drive off, the tank already up the road, waiting. It holds the road about 80 m
ahead of you in your lane, is the AR target ("TANK"), shells you (8% damage each, less with armor), and shrugs off
rams; your guns and the gang's wear it down. Destroyed: TANK DOWN, the run stops there (heat back to 0, scrap), and act
V opens: its card, the Fortress tab for sale (out of sight before), its page under construction; the next tank is
tougher. Not destroyed by the bell: a DNF, and the heat drops to half."""
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
    def garage(wanted, tanks=0, armor=0):
        js(f"localStorage.clear(); Object.assign(progress, {{ racing: true, finish: 1, oil: 2, runs: 80, bank: 10000, totals: 5, wanted: {wanted}, tanks: {tanks}, damage: 0, broken: [], levels: {{ {CAR}, armour: {armor} }}, engine: 2 }})")
        if js("game.id") != "distance": pg.click('[data-play="distance"]'); pg.wait_for_timeout(200)
        elif js("run.phase") != "garage": js("run.left = 0.05"); pg.wait_for_function("run.phase === 'garage'", timeout=15000)
        js("closeMenu(); openBefore = null; refreshCar(); forgetRun(); renderGarage()")  # no pop-ups from the race before
    def race():
        pg.click("#drive"); pg.wait_for_timeout(300)
        if js("menuOpen && screen === 'act'"): pg.click("#act-go")
        pg.wait_for_function("run.phase === 'run'", timeout=15000)
        js("traffic.forEach(c => { if (c.racer) c.z = odo - (c.fleet ? 3000 : 9000); else if (!c.tank) Object.assign(c, { dir: -1, x: LANES.oncoming[1], police: false }); }); copClock = 999; 0")
    # 1. 99%: no tank; 100%: the act's card (the pause menu's, the garage's title) warns of it
    card = lambda: js("[currentCard().id, currentCard().text(), currentCard().now()].join(' | ')")
    garage(0.99); check("99% heat: no tank", not js("bossRace()") and card().startswith("act4 |"), card())
    check("before the tank: no Fortress, no word of act V", not any(t.startswith("Fortress") for t in js("[...document.querySelectorAll('#tabs button')].map(b => b.textContent)"))
          and not js("CARDS.find(c => c.id === 'act5').open()"), "")
    race(); js("raiseHeat(1)"); pg.wait_for_timeout(1500)
    check("the heat filling mid-race: no tank in that race", js("[progress.wanted, run.boss, !!run.tank, traffic.some(c => c.tank)]") == [1, False, False, False],
          js("[progress.wanted, run.boss, !!run.tank, traffic.some(c => c.tank)]"))
    garage(1); check("100% heat: the act's card warns of the tank", js("bossRace()") and card().startswith("tanksent |") and "the army has sent a tank" in card(), card())
    js("progress.levels.guns = 0; renderGarage()")
    check("100% heat but no guns: no tank yet, the card says it waits", not js("bossRace()") and card().startswith("act4 |") and "a tank ready for when you are armed" in card(), card())
    js("progress.levels.guns = 3; refreshCar(); renderGarage()")
    # 2. the race: its card over the road before the lights, the tank waiting up the road; then it comes back to about
    # 80 m ahead, in your lane, the AR on it
    pg.click("#drive"); pg.wait_for_timeout(300)
    got = js("[menuOpen && screen, $('act-name').textContent, run.phase, !!run.tank && Math.round(run.tank.z - odo), run.tank && run.tank.dir]")
    check("DRIVE at 100% heat: the tank's card over the road before the lights, the tank waiting 250 m up", got == ["act", "THE ARMY SENDS A TANK", "starting", 250, 1], got)
    pg.screenshot(path=f"{OUT}/boss_card.png")
    pg.click("#act-go"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
    js("traffic.forEach(c => { if (c.racer) c.z = odo - (c.fleet ? 3000 : 9000); else if (!c.tank) Object.assign(c, { dir: -1, x: LANES.oncoming[1], police: false }); }); copClock = 999; 0")
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
    got = js("({ wanted: progress.wanted, tanks: progress.tanks, scrap: run.scrap })")
    check("destroyed: heat back to 0, 300 scrap, one tank beaten", got == {"wanted": 0, "tanks": 1, "scrap": 300}, got)
    pg.wait_for_timeout(300)
    got = js("({ phase: run.phase, left: Math.round(run.left), hud: $('run-dist').textContent, flash: $('flash').textContent })")
    check("TANK DOWN on the heads-up display, the run stopped with time to spare", got["phase"] == "finish" and got["left"] > 5 and got["hud"] == "TANK DOWN" and got["flash"] == "TANK DOWN!", got)
    pg.screenshot(path=f"{OUT}/boss_tank_down.png")
    pg.wait_for_timeout(3000); check("held a while (4 s), longer than a finish", js("run.phase") == "finish", js("run.phase"))
    pg.wait_for_function("run.phase === 'garage'", timeout=5000)
    tabs = lambda: js("[...document.querySelectorAll('#tabs button')].map(b => b.textContent)")
    got = js("({ menu: menuOpen, screen, no: $('act-no').textContent, name: $('act-name').textContent, text: $('act-text').textContent })")
    check("then act V (the owner, 29 Oct: the tank no longer ends the game): its card pops up over the garage, under construction",
          got["menu"] and got["screen"] == "act" and got["no"] == "ACT V" and got["name"] == "FORTRESS" and "Fortress" in got["text"]
          and "Under construction" in got["text"], got)
    pg.screenshot(path=f"{OUT}/boss_act5.png")
    pg.click("#act-go"); pg.wait_for_timeout(100)
    rep = js("$('report').textContent")
    check("in the garage: a result, not a DNF; the act's card says the next tank is tougher", "+300 scrap" in rep and "DNF" not in rep
          and card().startswith("act5 |") and "another tank, tougher" in card(), [rep, card()])
    check("the next tank is half as tough again", js("tankHealth()") == 1500, js("tankHealth()"))
    check("the Fortress tab for sale, for a scrap", "Fortress1 scrap" in tabs(), tabs())
    pg.click('#tabs [data-tab="fortress"]'); pg.wait_for_timeout(100)
    got = js("[garageTab, $('cards').innerText]")
    check("bought: its page, a sign: under construction, the tanks keep coming", got[0] == "fortress" and "UNDER CONSTRUCTION" in got[1]
          and "tanks keep coming" in got[1], got)
    pg.screenshot(path=f"{OUT}/boss_fortress_page.png")
    js("openMenu(); showScreen('main')"); pg.wait_for_timeout(100)
    got = js("[screen, $('continue').textContent, getComputedStyle($('continue'), '::after').content]")
    check("the main menu: CONTINUE, no check mark (that comes with act 5's ending)", got[:2] == ["main", "CONTINUE"] and got[2] in ("none", "normal", '""'), got)
    pg.click("#continue"); pg.wait_for_timeout(100)
    check("CONTINUE: back in the garage, playing on", js("[menuOpen, run.phase]") == [False, "garage"], js("[menuOpen, run.phase]"))
    # 6. lost at the bell: a DNF, the heat down to half
    garage(1); race(); pg.wait_for_function("run.tank", timeout=5000); js("run.left = 0.05"); pg.wait_for_function("run.phase === 'garage'", timeout=15000)
    got = js("({ dnf: run.race && run.race.dnf, wanted: progress.wanted, report: $('report').innerText })")
    check("the bell with the tank still going: DNF, heat 50%", got["dnf"] == "tank" and got["wanted"] == 0.5 and "the tank held the road" in got["report"], {k: v for k, v in got.items() if k != "report"})
    # 7. wrecked by its shells: a DNF too; armor takes the sting out
    garage(1, armor=2); race(); pg.wait_for_function("run.tank", timeout=5000)
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
