"""War Rig: nothing before 51 crew cars, nor in the garage at 51 (the owner, 27 Oct); then, about 5 s into the next run,
the gang's moment on the road: its tutorial (total a car) and the AR layer on the windscreen, a reticle and a health
bar on the nearest car ahead, kept until you pass it. The first car totalled leaves 3 s on the clock, then act IV. Bumps hurt the car you hit;
at 0 health it skids onto the shoulder, out of your way, and pays scrap. A totalled rival is out of the race. The
first total puts the War Rig's tab on sale, the page paid in scrap; a bull bar hurts them more and costs you less speed. Armour takes
off your damage, spiked hubs make a side-swipe free and harder; your racers only race (no side-swipes, no shots: the
war is the raiders', raiders_test). Guns, last: the wheel's red marker turns into the trigger (FIRE on it), shots hurt
the car in the reticle within 200 m. The reticle moves to a nearer car when its own is out of reach, and starts afresh each race.
Auto gun fires for you at the reticle's car while it is in reach, and the marker reads AUTO."""
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
        js(f"localStorage.clear(); Object.assign(progress, {{ racing: true, finish: 1, oil: 2, runs: 40, bank: 10000, levels: {{ {CAR}, fleet: {fleet} }}, engine: 2, toured: TUTORIALS.map(t => t.id) }})")
        if js("game.id") != "distance": pg.click('[data-play="distance"]'); pg.wait_for_timeout(200)
        js("refreshCar(); renderGarage()")
    tabs = lambda: js("[...document.querySelectorAll('#tabs button')].map(b => b.textContent)")
    # 1. 50 fleet cars: no gang, no word of it
    start(50)
    check("50 fleet cars: no War Rig, no task", "War Rig" not in tabs() and not re.search(r"gang|total|scrap", js("$('garage').innerText"), re.I), tabs())
    # 2. 51: nothing changes in the garage: still act III, no reticle, no page
    start(51)
    got = js("[$('act-title').textContent, arOn(), crewOn()]")
    check("51 crew cars: still act III in the garage, no gang yet", got == ["ACT III · RECRUIT ▸", False, True] and "War Rig" not in tabs(), [got, tabs()])
    # 3. on the road: about 5 s in, the gang's moment, its tutorial once a car is in the reticle; the reticle on the
    # nearest car ahead, at full health, labelled
    js("progress.toured = progress.toured.filter(id => id !== 'warrig')")
    pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
    js("""traffic.forEach(c => { if (!c.racer) { c.dir = -1; c.x = LANES.oncoming[0]; c.z = odo + 4000; } else if (!c.fleet) c.z = odo - 9000; else c.z = odo - 3000; });
        window.crashes = 0; if (!DISTANCE.crash0) { DISTANCE.crash0 = DISTANCE.crash; DISTANCE.crash = i => { crashes++; DISTANCE.crash0(i); }; } 0""")
    pg.wait_for_function("speed > 20", timeout=20000)
    js("""window.cs = traffic.filter(c => !c.racer); Object.assign(cs[2], { dir: 1, lane: 1, x: MY_LANES[1], z: odo + 150, v: speed, want: 90, cool: 99 })""") # one well ahead
    pg.wait_for_function("menuOpen && screen === 'tour'", timeout=20000)
    got = js("[tour.id, progress.gang, arOn(), +(runTime() - run.left).toFixed(1), $('tour-title').textContent]")
    check("about 5 s in: the gang's moment, its tutorial over the paused run", got[:3] == ["warrig", True, True] and 5 <= got[3] < 8 and got[4] == "THE RETICLE", got)
    pg.screenshot(path=f"{OUT}/gang_moment.png")
    while js("menuOpen"): js("turnTour(1)"); pg.wait_for_timeout(50)
    js("""Object.assign(cs[2], { dir: -1, x: LANES.oncoming[0], z: odo + 4000 });
        [[0, 60], [1, 90]].forEach(([l, d], i) => Object.assign(cs[i], { dir: 1, lane: l, x: MY_LANES[l], z: odo + d, v: 12, want: 12, cool: 99, hp: null }));
        lane = fromLane = 0; carX = MY_LANES[0]; target = null""")
    pg.wait_for_timeout(300)
    got = js("""(() => { const r = $('ar').getBoundingClientRect(), k = canvas.clientWidth / canvas.width, s = target && target.seen;
        return { on: getComputedStyle($('ar')).display, target: target === cs[0], label: $('ar-label').textContent,
                 around: !!s && r.left <= s[0] * k + 1 && r.right >= (s[0] + s[2]) * k - 1 && r.top <= s[1] * k + 1 && r.bottom >= (s[1] + s[3]) * k - 1,
                 hp: +getComputedStyle($('ar')).getPropertyValue('--hp') }; })()""")
    check("the reticle round the nearest car ahead, full health, 'TOTAL IT'", got == {"on": "block", "target": True, "label": "TOTAL IT", "around": True, "hp": 1}, got)
    pg.screenshot(path=f"{OUT}/gang_reticle.png")
    # 4. ram it: a hit, a third of a car's health, shown on the bar
    pg.wait_for_function("cs[0].hp !== null", timeout=15000); pg.wait_for_timeout(100)
    got = js("({ hp: Math.round(cs[0].hp), bar: +getComputedStyle($('ar')).getPropertyValue('--hp'), kmh: Math.round(impact.kmh), on: target === cs[0] })")
    check("a ram is a hit: 34 off the car's 100, the reticle still on it, and the bar shows it",
          got["hp"] == 66 and got["on"] and abs(got["bar"] - 0.66) < 0.02 and 30 <= got["kmh"] <= 200, got)
    # mid-ram, one long frame can carry you past its back before the bump settles: the reticle moved on to the next car,
    # at full health. Passed is its front behind you: your eye 1 m past its back, then 1 m past its front, between frames
    got = js("""(() => { const was = odo, at = d => { odo = cs[0].z + d; updateGang(0); const on = target === cs[0];
        odo = was; target = cs[0]; return on; }; return [at(1), at(CAR_LEN + 1)]; })()""")
    check("the reticle stays on a car you are into, and moves on once you are past it", got == [True, False], got)
    aside = lambda expr: js(f"""(() => {{ const p = {{ scrap: progress.scrap, totals: progress.totals, wanted: progress.wanted }},
        r = {{ scrap: run.scrap, totals: run.totals, firstTotal: run.firstTotal, left: run.left }}, out = {expr}; Object.assign(progress, p); Object.assign(run, r);
        return out; }})()""")  # made-up cars: the game's counts (and the clock a first total cuts) stay as they were
    got = aside("""[[100, false], [20, false], [250, false], [10, true]].map(([kmh, side]) => { const c = { v: 20, hp: null, racer: 0 };
        ram({ car: c, kmh, side, headOn: false }); return c.wreck ? 'total' : Math.round(c.hp ?? 100); })""")
    check("a nudge (20 km/h) does nothing, over 200 km/h it's an instant total, a side-swipe always counts", got == [66, 100, "total", 66], got)
    got = aside("""[{ v: 20, racer: 0 }, { v: 20, racer: 5 }, { v: 20, police: true }].map(c => { let n = 0;
        while (!c.wreck && n < 10) { ram({ car: c, kmh: 100, side: false, headOn: false }); n++; } return n; })""")
    check("hits to total, no bull bar: traffic 3, a racer 5, police 6", got == [3, 5, 6], got)
    # 5. at 0 it is totalled: scrap, off onto the shoulder, out of your way; the reticle moves on to the next car
    js("cs[0].hp = 1; Object.assign(cs[0], { z: odo + 25, v: 5, want: 5 }); cs[0].hit = -1e9; Object.assign(cs[1], { z: odo + 120 })")
    trace = js("""() => new Promise(res => { const out = []; const f = () => { if (cs[0].wreck) out.push([+cs[0].x.toFixed(2), +cs[0].v.toFixed(2), Math.round(cs[0].z - odo)]);
        out.length < 12 ? requestAnimationFrame(f) : res(out); }; requestAnimationFrame(f); })""")
    got = js("({ scrap: progress.scrap, totals: progress.totals, run: run.scrap, next: target === cs[1] })")
    check("totalled: 22 scrap, the next car in the reticle", got == {"scrap": 22, "totals": 1, "run": 22, "next": True}, got)
    check("the first job done: 3 s left on the clock", 0 < js("run.left") <= 3 and js("run.phase") == "run", js("[run.left, run.phase]"))
    xs, vs = [t[0] for t in trace], [t[1] for t in trace]
    check("the wreck skids towards the shoulder, slowing (then falls behind and is gone)", all(a < b for a, b in zip(xs, xs[1:])) and all(a >= b for a, b in zip(vs, vs[1:])) and js("crashes") <= 3,
          {"x": xs[::3], "v": vs[::3], "shoulder": js("+SHOULDER.toFixed(2)")})
    pg.screenshot(path=f"{OUT}/gang_wreck.png")
    # 6. a totalled rival is out of the race: you move up
    js("window.r = rivals().find(c => c.racer === 30); Object.assign(r, { z: odo + 400, lane: 1, x: MY_LANES[1] })")
    p0 = js("position()"); js("total(r)"); p1 = js("position()")
    check("a totalled rival is out of the race: up a place", p1 == p0 - 1, f"P{p0} -> P{p1}")
    # 7. the first total puts the War Rig's tab on sale (1 scrap), a tap buys it; paid in scrap
    js("run.left = 0.05"); pg.wait_for_function("run.phase === 'garage'", timeout=15000)
    got = js("[$('act-title').textContent, currentCard().text(), currentCard().now?.()]")
    check("the first job done: ACT IV, the War Rig's tab for sale", got[0] == "ACT IV · WAR ▸" and "War Rig tab is for sale" in got[1] and "War Rig1 scrap" in tabs() and "scrap to spend" in js("$('bank').textContent"), [got, tabs()])
    pg.click('[data-tab="warrig"]'); pg.wait_for_timeout(100)
    check("a tap buys it: the War Rig page", "War Rig" in tabs() and js("garageTab") == "warrig", [tabs(), js("garageTab")])
    check("the Bull bar, paid in scrap", js("document.querySelector('[data-buy=\"bullbar\"]').textContent") == "20 scrap", js("document.querySelector('[data-buy=\"bullbar\"]')?.textContent"))
    js("progress.scrap = 100"); pg.click('[data-buy="bullbar"]'); pg.wait_for_timeout(100)
    check("bought: bull bar 1", js("[lvl('bullbar'), bullBar, progress.scrap]") == [1, 1, 80], js("[lvl('bullbar'), bullBar, progress.scrap]"))
    pg.screenshot(path=f"{OUT}/gang_garage.png")
    # Fuel madness (the owner, 18 Oct): levels of 25%, and a switch beside the next level's price once bought
    card = "[...document.querySelector('[data-buy=\"baddrivers\"], [data-toggle=\"baddrivers\"]').closest('.card').querySelectorAll('b, small, button:not(.tip)')].map(e => e.textContent)"
    got = js(card)
    check("Fuel madness: its card, 30 scrap, 25% at the first level", got[0] == "Fuel madness" and "double scrap" in got[1] and got[1].endswith("→ 25% of drivers mad for fuel") and got[2:] == ["30 scrap"], got)
    js("progress.scrap = 1000"); pg.click('[data-buy="baddrivers"]'); pg.wait_for_timeout(100)
    got = js(card)
    check("bought: the next level's price and an ON switch", got[2:] == ["75 scrap", "ON"] and got[1] == "25% of drivers mad for fuel → 50% of drivers mad for fuel", got)
    pg.click('[data-toggle="baddrivers"]'); pg.wait_for_timeout(100)
    check("switched off", js(card)[2:] == ["75 scrap", "OFF"] and js("progress.off.baddrivers") is True, js(card))
    js("progress.levels.baddrivers = 4; renderGarage()")
    check("at the top (90%: still the odd sane driver): the switch alone", js(card)[1:] == ["90% of drivers mad for fuel", "OFF"], js(card))
    js("delete progress.off.baddrivers; progress.levels.baddrivers = 0; progress.scrap = 80; renderGarage()")
    # 8. the bull bar at 3: you carry on at the car's speed, and it takes 2.5 times the damage
    js("progress.levels.bullbar = 3; refreshCar()")
    got = js("(() => { const c = { v: 20, hp: null, racer: 0 }; speed = 60; bump(c); const kept = speed; ram(impact); return [Math.round(kept), c.wreck]; })()")
    check("bull bar 3: a bump at 144 km/h leaves you at its 72 km/h and totals it in one hit (102 of its 100)", got == [20, True], got)
    got = aside("""[{ v: 20, racer: 0 }, { v: 20, racer: 5 }, { v: 20, police: true }].map(c => { let n = 0;
        while (!c.wreck && n < 10) { ram({ car: c, kmh: 100, side: false, headOn: false }); n++; } return n; })""")
    check("hits to total, full bull bar: traffic 1, a racer 2, police 2", got == [1, 2, 2], got)
    # 9. armour: a quarter off your damage a level
    got = js("[0, 2].map(l => { progress.levels.armour = l; progress.damage = 0; hurt(100, false); return +progress.damage.toFixed(2); })")
    check("armour 2: a 100 km/h bump does half the damage", got == [25, 12.5], got)
    js("progress.damage = 0; progress.levels.armour = 0")
    # 10. spiked hubs: a side-swipe while moving over costs no speed and counts one more hit
    def swipe(spiked):
        js(f"progress.levels.spikes = {spiked}; progress.levels.bullbar = 0; refreshCar()")
        return js("""(() => { const c = { v: 30, hp: null, racer: 0 }; speed = 32; lane = 1; fromLane = 0; carX = 3.5; bump(c);
            const kept = speed; ram(impact); return { side: impact.side, kept: Math.round(kept), hp: Math.round(c.hp) }; })()""")
    got = [swipe(0), swipe(1)]
    check("spiked hubs: a side-swipe keeps your speed and counts one more hit (34)", got[0]["side"] and got[1]["kept"] == 32 and got[0]["kept"] < 20 and got[0]["hp"] - got[1]["hp"] == 34, got)
    # 11. act IV: your racers only race (the owner, 27 Oct): a bull bar or not, a racer of yours leaves a rival beside it be
    pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
    def gang(bull):
        js(f"progress.levels.bullbar = {bull}; progress.levels.spikes = 0; refreshCar()")
        return js("""() => new Promise(res => { const f = racers().find(c => c.fleet), r = rivals().find(c => c.racer === 20);
            traffic.forEach(c => { if (c !== f && c !== r) c.z = c.racer ? odo - 9000 : odo + 5000; });
            Object.assign(f, { lane: 0, x: MY_LANES[0], z: odo + 300, v: 30, want: 30, cool: 99, rammed: 0 });
            Object.assign(r, { lane: 1, x: MY_LANES[1], z: odo + 300, v: 30, want: 30, cool: 99, hp: null, wreck: false });
            setTimeout(() => res(Math.round(r.hp ?? 150)), 1000); })""")
    got = [gang(0), gang(2)]
    check("your racers only race: no side-swipe at the rival beside them, bull bar or not", got == [150, 150], got)
    # 12. guns: before them the marker is part of the rim; with them it is the trigger
    js("progress.levels.bullbar = 0; progress.levels.guns = 0; refreshCar()"); pg.wait_for_timeout(100)
    m = js("(() => { const r = $('trigger').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()")
    pg.mouse.move(*m); pg.mouse.down(); pg.wait_for_timeout(100); got = js("({ wheel: wheel.held, firing, fire: getComputedStyle($('fire')).display })"); pg.mouse.up()
    check("no guns: the marker is the wheel's, no FIRE", got == {"wheel": True, "firing": False, "fire": "none"}, got)
    js("progress.levels.guns = 2; refreshCar()"); pg.wait_for_timeout(100)
    place = """(d) => { const c = traffic.find(c => !c.racer); traffic.forEach(o => { if (o !== c && !o.fleet) o.z = o.racer ? odo - 9000 : odo + 5000; });
        racers().filter(o => o.fleet).forEach(o => o.z = odo - 4000);
        Object.assign(c, { dir: 1, lane: 1, x: MY_LANES[1], z: odo + d, v: speed, want: speed, cool: 99, hp: null, wreck: false }); window.tg = c; lane = fromLane = 0; carX = MY_LANES[0]; target = null; }"""
    js(f"({place})(60)"); pg.wait_for_function("target === tg && tg.seen", timeout=5000)
    fire = lambda secs: js(f"() => new Promise(res => {{ const t0 = run.left; const f = () => run.left > t0 - {secs} ? requestAnimationFrame(f) : res(); requestAnimationFrame(f); }})")
    pg.mouse.move(*m); pg.mouse.down(); held = js("({ firing, fire: getComputedStyle($('fire')).display, wheel: wheel.held })"); fire(1)
    hp = js("Math.round(tg.hp ?? 100)"); pg.mouse.up(); hp = [hp, js("Math.round(tg.hp ?? 100)")]  # at 1 s, and let go
    check("guns 2: the marker is the trigger (FIRE on it); a second of fire, 5 shots of 12 (a frame either way)",
          held["firing"] and held["fire"] != "none" and not held["wheel"] and 100 - hp[0] in (48, 60, 72), {"held": held, "hp": hp})
    pg.wait_for_timeout(500); check("let go: the guns stop", js("[firing, Math.round(tg.hp)]") == [False, hp[1]], js("[firing, Math.round(tg.hp)]"))
    hp = hp[1]
    pg.keyboard.down("g"); fire(0.5); pg.keyboard.up("g")
    check("G fires too", js("Math.round(tg.hp)") < hp, [hp, js("Math.round(tg.hp)")])
    js(f"({place})(250)"); pg.wait_for_function("target === tg", timeout=5000); pg.keyboard.down("g"); fire(0.6)
    pg.screenshot(path=f"{OUT}/gang_guns.png")  # firing, out of reach: the tracers miss
    check("out of reach (250 m): no damage", js("tg.hp") is None, js("tg.hp"))
    js("window.near = traffic.find(c => !c.racer && c !== tg); Object.assign(near, { dir: 1, lane: 0, x: MY_LANES[0], z: odo + 80, v: speed, want: speed, cool: 99, hp: null, wreck: false })")
    pg.wait_for_timeout(200); pg.keyboard.up("g")
    check("a nearer car while the reticle's is out of reach: the reticle moves to it", js("target === near"), js("target && Math.round(target.z - odo)"))
    # 13. nor do they shoot: a racer of yours with a rival 50 m ahead of it, guns or not
    got = js("""() => new Promise(res => { const f = racers().find(c => c.fleet), r = rivals().find(c => c.racer === 25);
        traffic.forEach(c => { if (c !== f && c !== r) c.z = c.racer ? odo - 9000 : odo + 5000; });
        Object.assign(f, { lane: 0, x: MY_LANES[0], z: odo + 300, v: 30, want: 30, cool: 99, gun: 0 });
        Object.assign(r, { lane: 0, x: MY_LANES[0], z: odo + 350, v: 30, want: 30, cool: 99, hp: null, wreck: false });
        setTimeout(() => res(Math.round(r.hp ?? 150)), 1500); })""")
    check("your racers don't shoot at a rival ahead", got == 150, got)
    # 14. Auto gun: it fires by itself at the reticle's car in reach, not out of reach; switched off, it doesn't
    js("progress.levels.autogun = 1; refreshCar()")
    js(f"({place})(60)"); pg.wait_for_function("target === tg && tg.seen", timeout=5000); pg.wait_for_timeout(1000)
    got = js("({ hp: Math.round(tg.hp ?? 100), marker: $('fire').textContent, firing })")
    check("Auto gun: shoots the car in reach without the trigger; the marker reads AUTO", got["hp"] < 100 and got["marker"] == "AUTO" and not got["firing"], got)
    js(f"({place})(250)"); pg.wait_for_function("target === tg", timeout=5000); w0 = js("progress.wanted"); pg.wait_for_timeout(800)
    check("Auto gun: out of reach (250 m), no shots and no heat", js("[tg.hp, progress.wanted]") == [None, w0], js("[tg.hp, progress.wanted - " + str(w0) + "]"))
    js("progress.off.autogun = true"); js(f"({place})(60)"); pg.wait_for_function("target === tg", timeout=5000); pg.wait_for_timeout(800)
    check("Auto gun switched off: no shots, the marker reads FIRE", js("[tg.hp, $('fire').textContent]") == [None, "FIRE"], js("[tg.hp, $('fire').textContent]"))
    js("progress.levels.autogun = 0; delete progress.off.autogun")
    # 15. the next race: its cars are new, so the reticle doesn't stay on the last one's rival still up the road
    js("""window.tg = rivals().find(c => c.racer === 20 && !c.wreck) ?? rivals().find(c => !c.wreck); /* the gang may have totalled #20 */ traffic.forEach(c => { if (c !== tg) c.z = c.racer ? odo - 9000 : odo + 5000; });
        Object.assign(tg, { lane: 0, x: MY_LANES[0], z: odo + 120, v: speed, want: speed, cool: 99, hp: null, wreck: false }); target = null""")
    pg.wait_for_function("target === tg", timeout=5000)
    js("Object.assign(tg, { z: odo + 2000, v: 60, want: 60 }); run.left = 0.05"); pg.wait_for_function("run.phase === 'garage'", timeout=15000)
    pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000); pg.wait_for_timeout(200)
    got = js("({ old: target === tg, onRoad: !target || traffic.includes(target) })")
    check("the next race: the last one's car is gone from the reticle", got == {"old": False, "onRoad": True}, got)
    # 16. Fuel madness (the owner, 18 Oct): a share of the drivers goes mad in a run, 25% a level (road.js asks the game)
    got = [js("game.madness()")]
    js("progress.levels.baddrivers = 1; delete progress.off.baddrivers; 0"); got.append(js("game.madness()"))
    js("progress.levels.baddrivers = 3; 0"); got.append(js("game.madness()"))
    js("progress.levels.baddrivers = 4; 0"); got.append(js("game.madness()"))
    js("progress.off.baddrivers = true; 0"); got.append(js("game.madness()"))
    js("delete progress.off.baddrivers; progress.levels.baddrivers = 0; 0")
    check("Fuel madness: none until bought, 25% a level to 90%, none with its switch off", got == [0, 0.25, 0.75, 0.9, 0], got)
    # the mad ones: rusty, weaving, never indicating, even as they move over; the sane ones as they were
    js("progress.levels.baddrivers = 2; 0")
    got = js("""(() => { const ord = traffic.filter(c => !c.racer && !c.police && !c.wreck && !c.fleet && !c.tank); // earlier checks turned them round
        ord.forEach((c, i) => Object.assign(c, { dir: 1, z: odo + 2000 + 60 * i, lane: 0, x: MY_LANES[0], v: 20, want: 20 }));
        const m = ord.find(mad), s = ord.find(c => !mad(c));
        if (!m || !s) return 'no mad and sane pair: ' + ord.map(c => c.serial);
        window.m = m; Object.assign(m, { z: odo + 45, lane: 1 - lane, x: MY_LANES[lane], cool: 99, jumped: true, v: speed, want: speed });
        Object.assign(s, { z: odo + 70, lane: lane, x: MY_LANES[lane], cool: 99 });
        return { madLook: lookOf(m).madOf === m.look, saneLook: lookOf(s) === s.look, signals: indicator(m), weave: weave(m), still: weave(s) }; })()""")
    pg.wait_for_timeout(300)
    ws = [js("window.m ? weave(m) : null")] + [pg.wait_for_timeout(200) or js("window.m ? weave(m) : null") for _ in range(5)]  # over a second
    check("a mad car: its own car gone to rust, no indicator as it moves over, weaving; a sane one as it was", isinstance(got, dict) and got["madLook"] and got["saneLook"]
          and got["signals"] == 0 and got["still"] == 0 and all(w is not None and abs(w) <= 0.3 for w in ws) and max(ws) - min(ws) > 0.1, [got, ws])
    pg.screenshot(path=f"{OUT}/fuel_madness.png")
    got = js("""(() => { const o = traffic.find(c => !c.racer && !c.police && !c.wreck && !c.fleet && !c.tank && c !== m && mad(c));
        if (!o) return 'no other mad car'; o.dir = -1; const r = { mad: mad(o), own: lookOf(o) === madLook(o.look), front: lookOf(o).front.pixel && lookOf(o).front !== o.look.front };
        o.dir = 1; return r; })()""")
    check("an oncoming mad driver: its own car's mad front", got == {"mad": True, "own": True, "front": True}, got)
    got = aside("""(() => { Object.assign(m, { z: odo + 30, hp: null, wreck: false }); total(m); const r = [m.wreck, $('flash').textContent]; m.wreck = false; m.z = odo + 5000; return r; })()""")
    check("a mad car's stolen fuel: double scrap", got == [True, "TOTALLED +44 SCRAP"], got)
    js("progress.levels.baddrivers = 0; 0")
    # with a bull bar, the aids take the ram of a car that has just cut in: lane assist and autocruise look past it
    got = js("""(() => { const c = traffic.find(c => !c.racer && !c.police && !c.wreck); Object.assign(c, { dir: 1, z: odo + 30, x: MY_LANES[lane], cut: 2 });
        const seen = () => nextCar(MY_LANES[lane], takeRam) === c, out = [];
        progress.levels.baddrivers = 1; progress.levels.bullbar = 1; out.push(seen());
        progress.levels.bullbar = 0; out.push(seen());
        progress.levels.bullbar = 1; c.cut = 0; out.push(seen());
        progress.levels.baddrivers = 0; c.z = odo + 5000; return out; })()""")
    check("a mad driver's cut-in, with a bull bar: the aids take the ram (not without one, nor once it has settled)", got == [False, True, True], got)
    got = aside("""(() => { const c = traffic.find(c => !c.racer && !c.police && !c.wreck); Object.assign(c, { dir: 1, z: odo + 30, cut: 2, hp: null });
        ram({ car: c, kmh: 60, side: false, headOn: false }); const r = [c.wreck, $('flash').textContent]; c.wreck = false; c.z = odo + 5000; return r; })()""")
    check("Fuel madness: ram a car that cut in, it's totalled", got == [True, "HAD IT COMING! +22 SCRAP"], got)
    # 17. the war kit shows on your car as bought, each part from its level up (the owner, 18 Oct); not in other games
    kit = "[...document.querySelectorAll('#kit > g')].filter(g => getComputedStyle(g).display !== 'none').map(g => g.dataset.kit)"
    js("Object.assign(progress.levels, { bullbar: 0, armour: 0, guns: 0, autogun: 0 }); renderKit(); 0")  # drawn now, not next frame
    check("no kit bought: none shows", js(kit) == [], js(kit))
    js("Object.assign(progress.levels, { bullbar: 2, armour: 1, guns: 1 }); renderKit(); 0")
    check("bull bar 2, armour 1, guns 1: those parts", js(kit) == ["armour 1", "bullbar 1", "bullbar 2", "guns 1"], js(kit))
    js("Object.assign(progress.levels, { bullbar: 3, armour: 3, guns: 3, autogun: 1 }); renderKit(); 0")
    check("all of it, and the Auto gun's lamps", len(js(kit)) == 10, js(kit))
    pg.screenshot(path=f"{OUT}/war_kit.png")
    js("progress.off.autogun = true; renderKit(); 0")
    check("Auto gun switched off: its lamps go out", "autogun 1" not in js(kit), js(kit))
    # one shot, fired in the same call (a tracer lives 100 ms: a busy machine's next frame can miss it)
    got = js("""(() => { tracers.length = 0; firing = true; reload = 0; fireGuns(0.016); firing = false; const t = tracers.find(t => !t[0]);
        if (!t) return null; const side = Math.round(t[2] / 250) % 2 ? 1 : -1; return MUZZLES[side]; })()""")
    check("a shot leaves a drawn muzzle", got is not None and abs(got[1] - 512 / 900) < 0.01, got)
    js("play(FREE); 0"); pg.wait_for_timeout(100)
    check("Free drive: no kit", js("getComputedStyle($('kit')).display") == "none", js("getComputedStyle($('kit')).display"))
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
