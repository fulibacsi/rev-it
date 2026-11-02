"""Act 5's road (docs/design-notes.md, Act 5, layer 5): on the war rig the reticle takes only the notable enemies (the
army's tank, the rival gang's war rigs), and the raiders' car, the quarry, is picked from the rest, a rival gang car
first; it is Hunter's too, and tagged on the windshield when picked. The racers you never paid off are a gang: they
come from behind, cut into your lane and brake, in the gang's welded-up look; each one totaled gives the cannon two
shells. The cannon needs shells: the count on its pedal, none left and it fires nothing. A rival rig (the gang's
ambushes send them, two at a time at most) comes up from behind, holds the road ahead in the reticle, and its War Boys
throw grenades that knock out the cannon, guns and engines they land among (layer 11): a tap restarts one, or 10 s;
totaled, its scrap; its tutorial pops up as the first one shows. The police's pursuit SUV (the police's
ambushes send them; the heat sends none on the rig): armored, it comes head-on, kamikaze, slamming your front and
wrecking itself, and one that missed comes again; its tutorial as it first shows; in the reticle head-on too. A police
car on the rig rams you, from behind or a PIT from the side, three times, then it is gone. The gang's harpoon truck
(layer 11) holds the road beside you, the reticle on it once it takes aim, harpoons a part off the board (the tank's
cannon too, slower to reel in) and reels it in; totaled first, the part drops in a crate. Over a notable one the reticle's tag: what it is, its health, the shells it would take, how far. Before the rig, act 4's reticle as it was. Phone and desktop."""
import json, re
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
LEVELS = dict(workshopTab=1, autopilotTab=1, blackTab=1, fleetTab=1, warrigTab=1, fortressTab=1, rebuild=1, power=10, rev=4, gears=3,
              tyres=4, time=6, clutch=1, gas=1, shift=1, steer=1, cruise=1, autoflash=1, engine=2, flash=5, grid=100, rolling=6,
              reckless=1, chicken=1, ecuRev=4, recklessCruise=1, cooling=3, ecuPower=4, nitro=5, fleet=80, bullbar=3, armour=3,
              spikes=1, guns=1, autogun=1, hunter=1, pack=1, dues=3, fleetPace=3)
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
# the road cleared but for the car (or cars) a check puts there: everything else far off, the clocks held
CLEAR = "traffic.forEach((c, i) => { if (!c.racer && !c.fleet) Object.assign(c, { dir: -1, x: LANES.oncoming[i % 2], z: odo + 1500 + 40 * i, " \
        "rig: false, police: false, suv: false, hp: null, wreck: false }); else if (c.racer && !c.fleet) Object.assign(c, { z: odo - 3000, stage: null }); }); " \
        "target = quarry = null; gangClock = 1e9; ambushes = []"  # oncoming, a way off: nothing on your side of the road for a while
PUT = """(kind, ahead, inLane) => { const c = kind === 'racer' ? rivals().find(c => !c.wreck)
          : traffic.find(c => !c.racer && !c.fleet && !c.wreck && !c.police && !c.tank && !c.rig);
        Object.assign(c, { dir: 1, z: odo + ahead, v: speed, lane: inLane ? lane : 1 - lane, x: MY_LANES[inLane ? lane : 1 - lane], hp: null, stage: null });
        return c; }"""
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    for layout in ["phone", "desktop"]:
        phone = layout == "phone"
        ctx = b.new_context(**(dict(viewport={"width": 844, "height": 390}, device_scale_factor=2, is_mobile=True, has_touch=True)
                               if phone else dict(viewport={"width": 1440, "height": 900})))
        pg = ctx.new_page(); js = pg.evaluate; pg.on("pageerror", lambda e: errors.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(URL); js("localStorage.clear()")
        js(f"Object.assign(progress, {{ racing: true, finish: 1, gang: true, totals: 60, tanks: 1, oil: 2, runs: 80, races: 60, bank: 9000, "
           f"points: 2000, shells: 10, fortress: {{ parts: [{{ kind: 'cannon', cells: [[0, 0]], x: 0, y: 0 }}], hold: [] }}, "
           f"roles: {{ harvester: 17, brewer: 9, raider: 6 }}, levels: {json.dumps(LEVELS)}, "
           f"toured: TUTORIALS.map(t => t.id).filter(id => id !== 'rivals') }}); save()")
        if phone: js("settings.layout = 'touch'; applyLayout()")
        pg.click('[data-play="distance"]'); pg.wait_for_timeout(300)
        pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=20000)
        js(CLEAR); pg.wait_for_timeout(300)

        # 1. the reticle: not an ordinary car, not a gang car; the quarry is, the gang's first; Hunter's car is the quarry
        car = js(f"(() => {{ const c = ({PUT})('car', 60, true); updateGang(0); return [target, quarry === c, crewTarget() === c]; }})()")
        check(f"{layout}: an ordinary car ahead: no reticle on it, the raiders' (and Hunter's) car", car == [None, True, True], car)
        got = js(f"(() => {{ const g = ({PUT})('racer', 120, false); updateGang(0); return [target, quarry === g, raidAhead()?.car === g]; }})()")
        check(f"{layout}: a rival gang car comes in reach: the quarry goes to it, nearer cars or not; the tracker's raid row too", got == [None, True, True], got)
        js("run.pick = raidAhead()"); pg.wait_for_timeout(300)
        got = js("[document.body.classList.contains('tag-on'), $('crew-tag').textContent]")
        check(f"{layout}: picked, the raiders' car is tagged on the windshield", got[0] and got[1].startswith("RAID 0/3 · 100% ·"), got)
        check(f"{layout}: in the gang's look, welded up", js("(() => { const g = quarry; return g.look.rear === RACERS.get('g' + g.racer); })()"))

        # 2. shells: the count on the pedal; a gang car totaled brings two; a shell a press; none left, none fired
        check(f"{layout}: the pedal reads 10", js("$('shell-count').textContent") == "10", js("$('shell-count').textContent"))
        got = js("(() => { const s0 = progress.shells; total(quarry, true); return [progress.shells - s0, run.shells, $('flash').textContent]; })()")
        check(f"{layout}: a gang car totaled: +2 shells, said so", got[:2] == [2, 2] and "+2 SHELLS" in got[2], got)
        rig = """(ahead) => { const c = traffic.find(c => !c.racer && !c.fleet && !c.wreck && !c.police && !c.tank && !c.rig && c !== quarry);
            Object.assign(c, { dir: 1, rig: true, stage: 'hold', t: 1e9, z: odo + ahead, v: speed, lane: 1 - lane, x: MY_LANES[1 - lane], look: { rear: RIG_SPRITE },
                               w: RIG.w, h: RIG.h, hp: null, wreck: false }); return c; }"""
        got = js(f"(() => {{ const c = ({rig})(60); updateGang(0); c.seen = [0, 0, 1, 1]; reloading = 0; const fired = fireCannon(); "
                 f"return [target === c, notable(c), fired, progress.shells, c.hp]; }})()")
        check(f"{layout}: a rival rig ahead: in the reticle; a shell fired at it (11 left), 250 off its 1,500", got == [True, True, True, 11, 1250], got)
        pg.wait_for_timeout(400)
        got = js("[menuOpen && screen, tour.id, $('ar-label').textContent]")
        check(f"{layout}: the first rig in sight: the rival gang's tutorial pops up; the reticle's tag: RIG, 83%, 5 shots to go, how far",
              got[:2] == ["tour", "rivals"] and re.fullmatch(r"RIG · 83% · 5 SHOTS · \d+ m", got[2]) is not None, got)
        pg.screenshot(path=f"{OUT}/rivals_{layout}_tour.png")
        got = js("(() => { const tank = { tank: true, hp: null, z: odo + 80 }, f = progress.fortress, parts = f.parts; const a = notableTag(tank); "
                 "f.parts = []; const b = notableTag(tank); f.parts = parts; return [a, b]; })()")
        check(f"{layout}: the tank's tag the same (on the rig as tough as the fortress is strong: 1,200 at one cell with the cannon, 5 shots); "
              "no cannon on the board, no shots", got == ["TANK · 100% · 5 SHOTS · 80 m", "TANK · 100% · 80 m"], got)
        while js("menuOpen"): js("turnTour(1)"); pg.wait_for_timeout(50)
        js("gangClock = 1e9; ambushes = []"); pg.wait_for_timeout(300)
        pg.screenshot(path=f"{OUT}/rivals_{layout}_rig.png")
        got = js("(() => { progress.shells = 0; reloading = 0; const fired = fireCannon(); return [fired, $('flash').textContent]; })()")
        pg.wait_for_timeout(100)
        check(f"{layout}: no shells: the pedal fires nothing, says so, and goes dim",
              got == [False, "NO SHELLS"] and js("$('cannon-pedal').parentNode.classList.contains('empty')"), got)
        js("progress.shells = 10")

        # 3. the rig's War Boys (layer 11): holding the road ahead, a grenade 2 s in and every 4 s, arcing back onto the
        # board; its blast knocks out the cannon (JAMMED): it fires nothing, can't be thrown off; a tap restarts it, or 10 s
        got = js("""(() => { const c = target, f = progress.fortress; f.parts = [{ kind: 'cannon', cells: [[0, 0]], x: 0, y: 0 }]; applyUpgrades(); lobs = []; jammed.clear();
            Object.assign(c, { stage: 'hold', t: RIG.first }); let at = [];
            for (let i = 0; i < 400; i++) { odo += speed / 60; rigDrive(c, 1 / 60); if (lobs.length > at.length) at.push(+(i / 60).toFixed(1)); if (lobs.length >= 2) break; }
            lobs = lobs.slice(0, 1); for (let i = 0; i < 60 && lobs.length; i++) lobTick(1 / 60);
            const p = f.parts[0], out = [at, jammed.has(p), $('flash').textContent, blocks('cannon')]; reloading = 0; out.push(fireCannon(), $('flash').textContent);
            renderBoard(); out.push(!!$('fort-grid').querySelector('[data-jam]')); return out; })()""")
        check(f"{layout}: the rig holds the road, its War Boys' first grenade 2 s in, the next 4 s later; landed, the cannon knocked out "
              f"(JAMMED, blue on the board): no shell fired", got[0][0] in (2.0, 2.1) and 5.9 <= got[0][1] - 0 <= 6.2 and got[1:] == [True, "JAMMED", 0, False, "JAMMED", True], got)
        pg.screenshot(path=f"{OUT}/rivals_{layout}_jammed.png")
        got = js("""(() => { const f = progress.fortress, p = f.parts[0]; holdPart({ clientX: 0, clientY: 0 }, true, 0); const r = [throwing, jammed.has(p), blocks('cannon')];
            blast([0, 0]); for (let i = 0; i < 10 * 60 + 5; i++) lobTick(1 / 60); r.push(jammed.has(p)); f.parts = [{ kind: 'armor', cells: [[0, 0]], x: 0, y: 0 }];
            blast([0, 0]); r.push(jammed.size); f.parts = [{ kind: 'cannon', cells: [[0, 0]], x: 0, y: 0 }]; applyUpgrades(); return r; })()""")
        check(f"{layout}: a tap restarts it (not a throw); knocked out again, it restarts on its own after 10 s; armor shrugs it off",
              got == [None, False, 1, False, 0], got)
        got = js("""(() => { const c = target, hp = c.hp; ram({ car: c, kmh: 100, side: false }); const scratch = hp - c.hp;
            const s0 = run.scrap; hurtCar(c, 5000); return [Math.round(scratch), c.wreck, run.scrap - s0]; })()""")
        check(f"{layout}: a ram takes a fifth of a hit (102 with the bull bar: 20); totaled, 150 scrap", got == [20, True, 150], got)

        # 4. the gang, unlimited (layer 11): a car of the traffic's taken over, numbered at random, sent from behind beyond
        # the sonar; not in the race; it comes past and cuts into your lane, brakes; totaled, its rank's points
        js(CLEAR)
        got = js("""(() => { Object.assign(traffic.find(c => !c.racer && !c.fleet && !c.police), { z: odo + 800 }); // to take over
            const p0 = position(), n0 = rivals().length; gangClock = 0; updateGangCars(0.01); gangClock = 1e9; const g = window.g = traffic.find(c => c.gang && !c.wreck);
            return [g.stage, Math.round(g.z - odo), Math.round((g.v - speed) * 3.6), g.racer >= 1 && g.racer <= 100, position() === p0, rivals().length === n0]; })()""")
        check(f"{layout}: the gang sends a car of its own, its number at random: from 260 m back, 108 km/h quicker; your place "
              f"and the race's field as they were", got == ["chase", -260, 108, True, True, True], got)
        js("Object.assign(g, { stage: 'chase', miner: false, z: odo - 5, hp: 1e9 })")  # its handle (raiders go for the gang first:
        pg.wait_for_function("traffic.some(c => c.gang && c.stage === 'brake')", timeout=5000)  # tough while it is checked)
        got = js("(() => { const g = traffic.find(c => c.gang && c.stage === 'brake'); return [g.lane === lane, Math.round(g.z - odo) > 15]; })()")
        check(f"{layout}: past you, it cuts into your lane ahead of you and brakes", got == [True, True], got)
        pg.screenshot(path=f"{OUT}/rivals_{layout}_gang.png")
        got = js("""(() => { const g = traffic.find(c => c.gang && !c.wreck), pts = progress.points, s0 = progress.shells, r0 = run.ranks; g.racer = 37;
            hurtCar(g, 5000); return [progress.points - pts, run.ranks - r0, progress.shells - s0, $('flash').textContent.endsWith('+64 PTS')]; })()""")
        check(f"{layout}: totaled, #37 pays its rank: 64 points (101 - 37), and 2 shells", got == [64, 64, 2, True], got)
        got = js("""(() => { const g = traffic.find(c => c.gang && c.wreck); g.z = odo - 50; updateTraffic(0, 1e6); return [g.gang, g.racer]; })()""")
        check(f"{layout}: left behind, back into the traffic: no longer the gang's", got == [False, 0], got)

        # the gang's mines (layer 11), run frame by frame with the road moving under them: a gang car up the road in your
        # lane, slower; 120 m off it drops three in its lane and pulls onto the shoulder; each run over hits the board's front
        # cell (15 less 75%: 3.75); dropped in your other lane, they miss
        js(CLEAR)
        mines = """(other) => { lane = fromLane = 0; carX = MY_LANES[0]; // settled in a lane (the robot may be changing lanes)
            Object.assign(traffic.find(c => !c.racer && !c.fleet && !c.police && !c.wreck), { z: odo + 800 }); mines = [];
            const cannon = progress.fortress.parts[0], seen = [], was = window.flash; cannon.hp = 100; window.flash = (t, ...a) => { seen.push(t); return was(t, ...a); };
            sendMiner(); const m = traffic.find(c => c.miner); if (other) m.x = ROAD_LANES[1 - lane]; const at = [Math.round(m.z - odo), m.x === ROAD_LANES[lane]];
            for (let i = 0; i < 4000 && (m.miner || !mines.length || mines.some(x => !x.over)); i++) { odo += speed / 60; gangDrive(m, 1 / 60); mineTick(); }
            window.flash = was; return [...at, m.dropped, seen.filter(t => t.startsWith('MINE')).join(), +hpOf(cannon).toFixed(2), Math.abs(m.x - (SHOULDER - 0.6)) < 0.3]; }"""
        got = js(f"({mines})(false)")
        check(f"{layout}: a gang car 200 m up your lane drops three mines 120 m off (MINES!) and pulls onto the shoulder; run over, "
              f"MINE! three times, 3.75 off the cannon each", got == [200, True, 3, "MINES!,MINE!,MINE!,MINE!", 88.75, True], got)
        got = js(f"({mines})(true)")
        check(f"{layout}: dropped in your other lane: missed, nothing hit", got[3:5] == ["MINES!", 100], got)
        pg.screenshot(path=f"{OUT}/rivals_{layout}_mines.png")

        # the gang's harpoon truck (layer 11), run frame by frame with the road moving under it: from 60 m behind up the lane
        # beside you, it holds the road 30 m ahead, takes aim (the part blinks on the board), harpoons the part nearest its
        # side off the board and reels it in; totaled while reeling, the part is on the road in a crate; else it is gone
        js(CLEAR)
        harpoon = """(kill, kind = 'gun') => { lane = fromLane = 0; carX = MY_LANES[0]; Object.assign(traffic.find(c => takeable(c) && !c.wreck), { z: odo + 800 });
            progress.levels.lengthen = 1; const f = progress.fortress; f.parts = [{ kind, cells: [[0, 0]], x: 0, y: 0 }, { kind: 'armor', cells: [[0, 0]], x: 0, y: 1 }];
            applyUpgrades(); run.loot = []; target = null; // two rows, two parts: what it waits for (sendHarpoon); the front one it takes
            const seen = [], was = window.flash; window.flash = (t, ...a) => { seen.push(t); return was(t, ...a); };
            const ok = sendHarpoon(), c = traffic.find(c => c.harpoon && !c.wreck);
            const out = [ok, c.x === MY_LANES[1], Math.round(c.z - odo), notableTag(c).startsWith('HARPOON · 100% · ')] // no cannon on the board: no shots in it;
            const step = until => { for (let i = 0; i < 1200 && !until(); i++) { odo += speed / 60; harpoonDrive(c, 1 / 60); } };
            step(() => c.stage === 'wind' || c.stage === 'leave'); if (c.stage === 'leave') return [...out, 'left', f.parts.length];
            updateGang(0); out.push(Math.round(c.z - odo), target === c); renderBoard(); out.push(!!$('fort-grid').querySelector('[data-hooked]'));
            step(() => c.stage === 'reel'); out.push(f.parts.length - 1, c.prize?.kind);
            // totaled: its own drop table off, so the crate on the road is the part it took
            if (kill) { const d = DROPS.harpoon[0]; DROPS.harpoon[0] = 0; hurtCar(c, 1e4); DROPS.harpoon[0] = d; out.push(run.loot.length, run.loot[0]?.part.kind); }
            else { step(() => c.stage === 'leave'); out.push(f.parts.length - 1, c.prize); }
            window.flash = was; out.push(seen.filter(t => /HARPOON|GONE/.test(t)).join()); return out; }"""
        got = js(f"({harpoon})(true)")
        check(f"{layout}: a harpoon truck (HARPOON · 100%) from 60 m behind up your other lane holds the road 30 m ahead, takes "
              f"aim (the reticle on it at once, the gun blinking), harpoons the gun off the board; totaled while it reels, the gun on "
              f"the road in a crate", got[:4] == [True, True, -60, True] and 28 <= got[4] <= 33 and got[5:] == [True, True, 0, "gun", 1, "gun",
              "HARPOON TRUCK!,HARPOON!,GUN 1 HARPOONED"], got)
        pg.screenshot(path=f"{OUT}/rivals_{layout}_harpoon.png")
        got = js(f"({harpoon})(false)")
        check(f"{layout}: one that reels it in: the gun gone", got[5:] == [True, True, 0, "gun", 0, None,
              "HARPOON TRUCK!,HARPOON!,GUN 1 HARPOONED,GUN 1 GONE"], got)
        js("traffic.forEach(c => { if (c.harpoon) spawnCar(c, 1500); })")
        got = js("""(() => { const p = { kind: 'cannon', cells: [[0, 0]] }, q = { kind: 'gun', cells: [[0, 0]] }; return [reelTime(q), reelTime(p)].map(t => +t.toFixed(2)); })()""")
        check(f"{layout}: a heavier part is slower to reel in: a gun 4.56 s, the tank's cannon 6 s", got == [4.56, 6], got)
        got = js(f"({harpoon})(true, 'cannon')")
        check(f"{layout}: the tank's cannon harpooned too; totaled while it reels, the cannon in a crate", got[5:] == [True, True, 0, "cannon", 1, "cannon",
              "HARPOON TRUCK!,HARPOON!,CANNON 1 HARPOONED"], got)
        got = js("(() => { progress.fortress.parts = [{ kind: 'cannon', cells: [[0, 0]], x: 0, y: 0 }]; Object.assign(traffic.find(c => takeable(c) && !c.wreck), { z: odo + 800 }); "
                 "traffic.forEach(c => { if (c.harpoon) spawnCar(c, 1500); }); return sendHarpoon(); })()")
        check(f"{layout}: on a board of one part, none comes", got is False, got)
        js("traffic.forEach(c => { if (c.harpoon) spawnCar(c, 1500); }); progress.levels.lengthen = 0; progress.fortress.parts = [{ kind: 'cannon', cells: [[0, 0]], x: 0, y: 0 }]; applyUpgrades(); run.loot = []")

        # 5. the gang's ambushes send rigs: two at a time at most
        js(CLEAR)
        got = js("(() => { traffic.filter(c => !c.racer && !c.fleet).slice(0, 3).forEach((c, i) => Object.assign(c, { z: odo + 800 + 40 * i })); " # to take over, out of sight
                 "const sent = [sendRig(), sendRig(), sendRig()]; return [...sent, traffic.filter(c => c.rig && !c.wreck).length]; })()")
        check(f"{layout}: rigs sent: two at a time at most", got == [True, True, False, 2], got)
        js("traffic.forEach(c => { if (c.rig) spawnCar(c, 1500); })")  # gone: cars of the traffic again, their looks too

        # 6. the police on the rig: the ambushes send SUVs and police cars (the heat none); a police car comes up from behind
        # to ram you, an SUV head-on from far up the road (layer 10)
        js(CLEAR)
        send = """(suv) => { lane = fromLane = 0; carX = MY_LANES[0]; // on your side of the road: a lane beside you
            for (const c of racers()) c.z = odo - 3000; // your crew's racers too: room to come past you
            Object.assign(traffic.find(c => !c.racer && !c.fleet && !c.police), { z: odo + 800 });
            const had = new Set(traffic.filter(c => c.police)); sendCop(suv); return traffic.find(c => c.police && !had.has(c)); }"""
        got = js(f"""(() => {{ const a = ({send})(true), first = [a.suv, notable(a), health(a), a.w, a.dir, Math.round(a.z - odo), a.x === ROAD_LANES[2]];
            const b = ({send})(false), second = [b.suv, b.dir, b.stage, Math.round(b.z - odo), b.rams];
            Object.assign(traffic.find(c => !c.racer && !c.fleet && !c.police), {{ z: odo + 800 }});
            const n = traffic.filter(c => c.police).length; progress.wanted = 1; copClock = 0; updatePolice(0.01); copClock = 1e9;
            return [...first, ...second, traffic.filter(c => c.police).length === n]; }})()""")
        check(f"{layout}: an SUV sent head-on (notable, 600 health, 2.1 m wide) 900 m up the oncoming lane; a police car from 60 m "
              f"behind, to ram; the heat sends none on the rig", got == [True, True, 600, 2.1, -1, 900, True, False, 1, "chase", -60, 0, True], got)

        # a police car's rams, run frame by frame with the road moving under them (odo): straight into your back, then
        # after dropping back 25 m a PIT from the lane beside you, then a third, and it falls behind for good
        got = js("""(() => { const b = traffic.find(c => c.police && !c.suv && !c.wreck), cannon = progress.fortress.parts[0], out = [];
            const run = (until, n = 900) => { for (let i = 0; i < n && !until(); i++) { odo += speed / 60; rammerDrive(b, 1 / 60); } };
            cannon.hp = 100; Object.assign(b, { pit: false, stage: 'chase', at: carX, x: carX, z: odo - MY_REAR - CAR_LEN - 3, rams: 0, hp: null });
            const v0 = speed; run(() => b.stage === 'back');
            out.push($('flash').textContent, +hpOf(cannon).toFixed(2), Math.round(health(b) - b.hp), speed > v0);
            run(() => b.stage === 'chase'); out.push(Math.round(b.z - odo));
            Object.assign(b, { pit: true, at: MY_LANES[1], x: MY_LANES[1], hp: 1e4 }); const s0 = slide; run(() => b.stage === 'back'); // 1e4: the
            out.push($('flash').textContent, +hpOf(cannon).toFixed(2), Math.sign(slide - s0) === Math.sign(carX - b.x)); // bull bar would total it
            run(() => b.stage === 'chase'); b.pit = false; run(() => b.stage === 'back'); run(() => b.stage === 'gone' || b.stage === 'chase');
            out.push(b.rams, b.stage); return out; })()""")
        check(f"{layout}: a police car rams your back (RAMMED: 4% less Armor plating, 1 off the cannon, the bull bar's 102 off it, "
              f"you shoved on), drops back 25 m and comes again; a PIT from beside you (PIT!: 5%, 1.25, knocked away from it); "
              f"after its third, gone", got[:4] == ["RAMMED", 99, 102, True] and -27 <= got[4] <= -24 and got[5:] == ["PIT!", 97.75, True, 3, "gone"], got)

        # an SUV head-on: into you it slams the front of your column and wrecks itself, no DNF even a lane wide, no scrap,
        # no crate; one that missed turns and comes again
        got = js("""(() => { const a = traffic.find(c => c.suv && !c.wreck), cannon = progress.fortress.parts[0], s0 = run.scrap, l0 = run.loot.length;
            cannon.hp = 100; Object.assign(a, { dir: -1, x: carX, z: odo + 1, v: 40, hit: -Infinity }); updateTraffic(0, 1e6);
            const r = [a.wreck, $('flash').textContent, run.phase, +hpOf(cannon).toFixed(2), run.scrap - s0, run.loot.length - l0];
            const b = traffic.find(c => !c.racer && !c.fleet && !c.police && c !== a); Object.assign(b, { police: true, suv: true, dir: -1, x: MY_LANES[1], z: odo - 31, v: 40, want: 40, hp: null, wreck: false });
            policeDrive(b, 0.01); return [...r, b.dir, Math.round(b.z - odo), b.x === ROAD_LANES[2]]; })()""")
        check(f"{layout}: an SUV into you: SLAMMED, wrecked, the race goes on (a lane wide), 30% less Armor plating off the front "
              f"cell (7.5), no scrap or crate; one that missed comes again from 900 m up the oncoming lane",
              got == [True, "SLAMMED", "run", 92.5, 0, 0, -1, 900, True], got)
        js("traffic.forEach(c => { if (c.suv && c.wreck) Object.assign(c, { suv: false, police: false, wreck: false, dir: -1, z: odo + 1500 }); })")
        got = js("""(() => { progress.toured = progress.toured.filter(id => id !== 'pursuit');
            traffic.forEach(c => { if (c.police && !c.suv) Object.assign(c, { police: false, dir: -1, z: odo + 1500 }); });
            const c = traffic.find(c => c.suv && !c.wreck); Object.assign(c, { dir: -1, want: 0, v: 0, z: odo + 150, x: MY_LANES[1 - lane] });
            c.hp = null; target = null; updateGang(0); return [target === c, notableTag(c)]; })()""")  # whole (a gun's round may have hit it)
        check(f"{layout}: head-on, in the reticle, its tag: SUV, its health, 3 shots", got[0] and re.match(r"SUV · (100|99)% · 3 SHOTS · ", got[1]), got)  # 99: the auto gun's first round
        pg.wait_for_timeout(400)
        got = js("[menuOpen && screen, tour.id, $('ar-label').textContent.slice(0, 4)]")
        check(f"{layout}: the first SUV in sight: its tutorial pops up", got == ["tour", "pursuit", "SUV "], got)
        pg.screenshot(path=f"{OUT}/rivals_{layout}_suv_tour.png")
        while js("menuOpen"): js("turnTour(1)"); pg.wait_for_timeout(50)
        pg.wait_for_timeout(300)
        pg.screenshot(path=f"{OUT}/rivals_{layout}_suv.png")
        got = js("""(() => { const c = traffic.find(c => c.suv && !c.wreck), hp = c.hp ?? health(c); ram({ car: c, kmh: 100, side: false });
            const scratch = hp - c.hp, s0 = run.scrap; hurtCar(c, 5000); return [Math.round(scratch), c.wreck, run.scrap - s0]; })()""")
        check(f"{layout}: a ram takes a fifth of a hit (20); totaled, 110 scrap", got == [20, True, 110], got)
        js("progress.wanted = 0")

        # 7. before the Rebuild, act 4's reticle as it was: the nearest car, the raiders' too
        js(CLEAR)
        got = js(f"(() => {{ progress.levels.rebuild = 0; const c = ({PUT})('car', 60, true); updateGang(0); "
                 f"const r = [target === c, quarry, crewTarget() === c]; progress.levels.rebuild = 1; return r; }})()")
        check(f"{layout}: before the Rebuild: the reticle on the nearest car, the raiders' car with it", got == [True, None, True], got)
        ctx.close()
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
