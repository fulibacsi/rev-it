"""Raiders (the owner, 27 Oct; the Hunting pack until then): the War Rig page's Raiders card, once Hunter, Racing and a
level of Crew tuning are bought, makes raiding a role of the crew's: a Raiders row on the role card, none before. On
the road the car in the reticle is on the tracker, a red row; picked, SEND sends a raider up the shoulder and into it
without braking for it, a ram every 1.5 s or so, till it is totalled; several on one car take turns (its scrap yours), and the raider is free again; three at most a car, and FULL
after. The tank takes a fifth of a raider's ram, as of yours; the Foreman sends raiders first."""
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
CAR = ("power: 10, rev: 4, gears: 3, tyres: 4, time: 6, clutch: 1, gas: 1, shift: 1, engine: 2, reckless: 1, fleet: 60, fleetTab: 1, "
       "warrigTab: 1, cruise: 1, recklessCruise: 1, hunter: 1, dues: 1, fleetPace: 1")
errors, fails = [], []


def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)


# a car `ahead` m up the road in the passing lane, going as fast as you, out of the way of everything else; you in the
# right lane, slow
PLACE = """(ahead) => { traffic.forEach((c, i) => { if (c.raider) c.gone = true; else if (!c.racer) Object.assign(c, { dir: -1, x: LANES.oncoming[1], z: odo + 6000 });
    else c.z = odo - 9000 - 200 * i; });
  window.tg = traffic.find(c => !c.racer && !c.police && !c.tank && !c.raider && !c.runner && (window.tg ? c !== tg : true));
  Object.assign(tg, { dir: 1, lane: 1, x: MY_LANES[1], z: odo + ahead, v: 25, want: 25, cool: 99, hp: null, wreck: false, hit: -Infinity, jumped: true, d: ahead });
  lane = fromLane = 0; carX = MY_LANES[0]; speed = 25; target = null; window.s0 = progress.scrap; 0 }"""
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errors.append(str(e))); js = pg.evaluate
    pg.goto(URL)
    js(f"localStorage.clear(); Object.assign(progress, {{ racing: true, finish: 1, oil: 2, gang: true, runs: 40, totals: 1, bank: 10000, fuel: 50, scrap: 500, "
       f"roles: {{ harvester: 0, brewer: 0, raider: 0 }}, levels: {{ {CAR} }}, engine: 2, off: {{ gas: true }}, toured: TUTORIALS.map(t => t.id) }}); 0")  # rolling: no Auto gas
    pg.click('[data-play="distance"]'); pg.wait_for_timeout(200)
    # 1. the garage: no word of raiders on the Crew page before the card; the card on the War Rig page; bought, the row
    js("garageTab = 'fleet'; renderGarage()")
    check("before the card: no raiders on the role card", "aider" not in js("$('cards').innerText"), "")
    pg.click('[data-tab="warrig"]'); pg.wait_for_timeout(100)
    got = js("document.querySelector('[data-buy=\"pack\"]')?.closest('.card').querySelector('b').textContent")
    check("the Raiders card on the War Rig page, with Hunter, Racing and Crew tuning", got == "Raiders", got)
    pg.click('[data-buy="pack"]'); pg.wait_for_timeout(100)
    check("bought, 150 scrap", js("[lvl('pack'), progress.scrap]") == [1, 350], js("[lvl('pack'), progress.scrap]"))
    js("if (menuOpen) closeMenu(); garageTab = 'fleet'; renderGarage()")
    check("the role card: a Raiders row", js("!!document.querySelector('.roles .role.raider input')"), js("$('cards').innerText")[:200])
    for _ in range(4): pg.click('.role.raider [data-by="1"]'); pg.wait_for_timeout(50)
    check("four raiders: four fewer racers", js("[role('raider'), racersOf(), riders()]") == [4, 56, 4], js("[role('raider'), racersOf(), riders()]"))
    # 2. on the road: the car in the reticle on the tracker; SEND: a raider up the shoulder, into it, till it is totalled
    pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
    js(f"({PLACE})(90)"); pg.wait_for_function("raidAhead() && raidAhead().car === tg", timeout=5000); pg.wait_for_timeout(200)
    check("the reticle's car on the tracker: a red row", js("!!document.querySelector('#track-spots .raid')"), js("$('track-spots').innerHTML")[:200])
    check("the Foreman's choice, raiders free: the raid", js("bestSpot() === raidAhead()"), "")
    js("run.pick = raidAhead()"); pg.click("#crew-send"); pg.wait_for_timeout(100)
    # how fast it closes on its car, until the first ram (the owner, 27 Oct: they lined up, then braked before it)
    js("window.trace = []; (function f() { const c = raiding()[0]; if (tg.hp !== null) return; if (c) trace.push([tg.z - c.z - CAR_LEN, c.v - tg.v]); requestAnimationFrame(f); })()")
    got = js("[raiding().length, free('raid'), raiding()[0] && raiding()[0].raider === tg, raiding()[0] && raiding()[0].x > LANES.mine]")
    check("SEND: a raider on its way, from the shoulder; three free", got == [1, 3, True, True], got)
    pg.screenshot(path=f"{OUT}/raiders_sent.png")
    pg.wait_for_function("tg.hp !== null", timeout=10000)
    check("into it: a ram, 34 off its 100", js("Math.round(tg.hp)") == 66, js("tg.hp"))
    got = js("(() => { const near = trace.filter(([g]) => g < 15); return [near.length, Math.min(...near.map(t => t[1])).toFixed(1)]; })()")
    check("no braking for it: the last 15 m at 10 m/s or more on its car", got[0] > 0 and float(got[1]) >= 10, got)
    pg.wait_for_function("tg.wreck", timeout=15000); pg.wait_for_timeout(100)
    got = js("[progress.scrap - s0, $('flash').textContent, raiding().length, free('raid')]")
    check("totalled: its scrap yours, the raider back with you", got == [22, "THE GANG TOTALLED A CAR +22 SCRAP", 0, 4], got)
    # 3. three at most on a car
    js(f"({PLACE})(150)"); pg.wait_for_function("raidAhead() && raidAhead().car === tg", timeout=5000)
    js("run.pick = raidAhead()")
    # each ram: which of them (in the order sent), when, and how far behind the car the others waiting are
    js("""window.rams = []; window.raidRam0 ??= raidRam; raidRam = (c, o) => { if (!c.rammed) { const on = raiding().filter(r => r.raider === o);
        rams.push([on.indexOf(c), run.t, Math.min(...on.filter(r => r !== c && !r.rammed).map(r => o.z - r.z - CAR_LEN))]); } raidRam0(c, o); }; 0""")
    for _ in range(4): pg.click("#crew-send"); pg.wait_for_timeout(60)
    got = js("[raidersOn(raidAhead()), free('raid'), $('flash').textContent]")
    check("SEND ×4: three on it, the fourth FULL", got == [3, 1, "FULL"], got)
    pg.screenshot(path=f"{OUT}/raiders_three.png")
    # 3b. they take turns (the owner, 27 Oct: the first hits it and drops back, the next comes through it and hits)
    pg.wait_for_function("tg.wreck", timeout=15000)
    got = js("rams.map(([i, t, gap]) => [i, +t.toFixed(2), +gap.toFixed(1)])")
    apart = [round(b[1] - a[1], 2) for a, b in zip(got, got[1:])]
    check("three rams, one at a time, in the order sent, at least 0.5 s apart, the others 6 m or more behind it as each lands",
          [r[0] for r in got] == [0, 1, 2] and min(apart) >= 0.5 and all(r[2] >= 6 for r in got[:2]), [got, apart])
    # 4. the tank: a fifth of a raider's ram
    got = js("(() => { const t = { tank: true, v: 20, hp: 1000 }; raidRam({ rammed: 0, v: 30 }, t); return +(1000 - t.hp).toFixed(1); })()")
    check("the tank: a fifth of a ram (6.8 of 34)", got == 6.8, got)
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
