"""The finale, its first layer (docs/design-notes.md, Act 5, layer 15): the warlord's fight opens once the fortress is
full size (four lanes, five rows) with the Grinder on its front, its card popping up as the last of them is bought, and
FIGHT beside DRIVE in the garage. In the fight his fortress stands head-on 70 m up the road, nothing else on it, and
you stand too; no aid, no Auto cannon, no War chief. The dashboard is cleared (no oil, no SEND, no hold, no key, no
stereo, no reticle), the board kept, and your weapons are instruments of their own, each there only if you have it:
the CB radio (a raiding party: three raiders, a ram each), the pedal (the cannon), the lever (a burst of the guns); no
launch button without a rocket pod. They share one cooldown (Dispatch shortens it), so a second press too soon does
nothing. Your health is in the mirror, his over his fortress. He fires his cannon at your front row and rockets at a
cell of the board. Wrecked, back to the garage (FIGHT waits for a repair); his fortress down, the WARLORD screen.
Phone and desktop."""
import json
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
LEVELS = dict(workshopTab=1, autopilotTab=1, blackTab=1, fleetTab=1, warrigTab=1, fortressTab=1, rebuild=1, power=10, rev=4, gears=3,
              tyres=4, time=6, clutch=1, gas=1, shift=1, steer=1, cruise=1, autoflash=1, engine=2, flash=5, grid=100, rolling=6,
              reckless=1, chicken=1, ecuRev=4, recklessCruise=1, cooling=3, ecuPower=4, nitro=5, fleet=80, bullbar=3, armour=3,
              spikes=1, guns=3, autogun=1, hunter=1, pack=1, dues=3, fleetPace=3, widen=3, lengthen=4, inventory=2, minePicker=1,
              warChief=1, autocannon=1)
PARTS = [dict(kind="armor", cells=[[0, 0]], x=0, y=0, frm="gang"), dict(kind="cannon", cells=[[0, 0], [1, 0]], x=1, y=0, frm="tank"),
         dict(kind="armor", cells=[[0, 0]], x=3, y=0, frm="gang"), dict(kind="gun", cells=[[0, 0], [1, 0]], x=0, y=1, frm="heli"),
         dict(kind="engine", cells=[[0, 0], [1, 0]], x=0, y=4, frm="tank")]
PARTS = [{**{k: v for k, v in p.items() if k != "frm"}, "from": p["frm"]} for p in PARTS]
HOLD = "FINALE.react = 0; cooling.him = { raid: 99, cannon: 99, guns: 99, rockets: 99 }"  # him held: no move, no answer
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    for layout in ["phone", "desktop"]:
        phone = layout == "phone"
        ctx = b.new_context(**(dict(viewport={"width": 844, "height": 390}, device_scale_factor=2, is_mobile=True, has_touch=True)
                               if phone else dict(viewport={"width": 1440, "height": 900})))
        pg = ctx.new_page(); js = pg.evaluate; pg.on("pageerror", lambda e: errors.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(URL); js("localStorage.clear()")
        js(f"Object.assign(progress, {{ racing: true, finish: 1, gang: true, totals: 300, tanks: 5, oil: 2, runs: 120, races: 100, bank: 99000, "
           f"points: 2000, scrap: 9000, shells: 20, fortress: {{ parts: {json.dumps(PARTS)}, hold: [] }}, "
           f"roles: {{ harvester: 17, brewer: 9, raider: 0 }}, levels: {json.dumps(LEVELS)}, "
           f"toured: TUTORIALS.map(t => t.id).filter(id => id !== 'warlord') }}); save()")
        if phone: js("settings.layout = 'touch'; applyLayout()")
        pg.click('[data-play="distance"]'); pg.wait_for_timeout(300)

        # 0. the warning signs: from a 2x2 board his fortress on the horizon, nearer as yours grows (0 at 2x2, 1 at 4x5);
        # none below 2x2, none once he is beaten. Drawn in a run (road.js drawSky's game.horizon)
        got = js("""(() => { const at = (w, l) => { Object.assign(progress.levels, { widen: w, lengthen: l }); return +warning().toFixed(2); };
            const r = [at(0, 4), at(1, 0), at(1, 1), at(2, 3), at(3, 4)]; progress.warlord = 1; r.push(at(3, 4)); delete progress.warlord;
            at(1, 1); return r; })()""")
        pg.wait_for_function("document.body.classList.contains('garage')", timeout=20000)
        pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=20000); pg.wait_for_timeout(1500)
        got += [js("""(() => { let n = 0; const was = window.drawOmen; window.drawOmen = (...a) => { n++; return was(...a); };
            return new Promise(done => setTimeout(() => { window.drawOmen = was; done(n > 0); }, 300)); })()""")]
        pg.screenshot(path=f"{OUT}/finale_{layout}_omen_2x2.png")
        js("Object.assign(progress.levels, { widen: 3, lengthen: 3 })"); pg.wait_for_timeout(300)
        pg.screenshot(path=f"{OUT}/finale_{layout}_omen_4x4.png")
        js("game.endRun()"); pg.wait_for_function("run.phase === 'garage'", timeout=15000)
        js("Object.assign(progress.levels, { widen: 3, lengthen: 4 }); closeMenu(); renderGarage()")
        check(f"{layout}: his fortress on the horizon: none at 1x5 or 2x1, from 2x2 (0) nearer as yours grows (0.5 at 3x4, 1 at "
              f"4x5), none once he is beaten; drawn in a run", got == [-1, -1, 0, 0.5, 1, -1, True], got)

        # 1. the trigger: full size, and the Grinder; its card as the Grinder is bought; FIGHT beside DRIVE from then on
        got = js("[finaleOpen(), !$('fight').hidden, TUTORIALS.find(t => t.id === 'warlord').open()]")
        js("garageTab = 'fortress'; renderGarage()")
        pg.click('[data-buy="grinder"]'); pg.wait_for_timeout(400)
        got += js("[finaleOpen(), menuOpen && screen, $('act-name').textContent, !$('fight').hidden, $('fight').textContent]")
        check(f"{layout}: four lanes and five rows, no Grinder: no fight; the Grinder bought, THE WARLORD's card pops up, FIGHT beside DRIVE",
              got == [False, False, False, True, "act", "THE WARLORD", True, "FIGHT ▶"], got)
        pg.screenshot(path=f"{OUT}/finale_{layout}_card.png")
        js("closeMenu(); renderGarage()")
        pg.screenshot(path=f"{OUT}/finale_{layout}_garage.png")

        # 2. the fight: his fortress head-on 70 m up the road, nothing else on it; you standing, no aid; your health in the
        # mirror; the dashboard cleared, the board kept; the instruments you have (CB radio, lever, pedal), no launch button
        pg.click("#fight"); pg.wait_for_function("run.phase === 'run'", timeout=20000); pg.wait_for_timeout(1500)
        got = js("""[run.fight, traffic.length, traffic[0] === warlord, warlord.dir, Math.round(warlord.z - odo), speed, aid('cruise'),
                     $('timer-left').textContent, ['raid', 'guns', 'rockets'].map(m => !$('fight-' + m).hidden),
                     ['tracker', 'crew-ctl', 'ignition', 'fort-hold', 'stereo', 'ar'].map(id => getComputedStyle($(id)).display),
                     getComputedStyle($('board')).display, $('cannon-label').textContent, !$('warlord-bar').hidden]""")
        check(f"{layout}: FIGHT: his fortress alone on the road, head-on, 70 m off; standing, no aid; 100% in the mirror; the CB "
              f"radio, the lever and the pedal (CANNON), no launch button; no tracker, SEND, key, hold, stereo or reticle; the board; "
              f"his health bar over him", got == [True, 1, True, -1, 70, 0, False, "100%", [True, True, False], ["none"] * 6, "flex",
                                                   "CANNON", True], got)
        pg.screenshot(path=f"{OUT}/finale_{layout}_fight.png")

        # 3. one cooldown for them all (1.5 s, 0.08 of it less a level of Dispatch): the cannon winds up (1.2 s) and fires (a
        # shell: 250, Heavy shells none, two blocks), the lever too soon does nothing; a beat later its burst (8 rounds of
        # 6 x (3 + 2)); no Auto cannon, no War chief meanwhile
        got = js(f"""(() => {{ {HOLD}; const hp0 = health(warlord), shells = progress.shells;
            const a = move('cannon'), b = move('guns'), hp1 = warlord.hp, cd = +cooling.you.guns.toFixed(2);
            return [a, b, hp0 - (hp1 ?? hp0), shells - progress.shells, cd, +beatOf('you').toFixed(2), (progress.levels.workRate = 5, +beatOf('you').toFixed(2))]; }})()""")
        js("progress.levels.workRate = 0")
        pg.wait_for_timeout(1700)
        got += js("""(() => { const hp = warlord.hp, ok = move('guns'); return [ok, run.burst]; })()""")
        pg.wait_for_timeout(1200)
        got += js("""[raiding().length, Math.round(health(warlord) - 500 - warlord.hp)]""")
        check(f"{layout}: one cooldown: the cannon winds up (nothing yet, a shell spent), the lever at once does nothing, 1.5 s "
              f"(0.9 at Dispatch 5); a beat later the burst, 8 rounds of 30, the shell's 500 in by then; no Auto cannon, no raiders "
              f"sent by the War chief", got == [True, False, 0, 1, 1.5, 1.5, 0.9, True, 8, 0, 240], got)

        # 4. the CB radio: a raiding party of three, a ram each (102 with the bull bar), and back
        pg.wait_for_timeout(1600)
        got = js("""(() => { const hp = warlord.hp, ok = move('raid'); return [ok, raiding().length, hp]; })()""")
        pg.wait_for_function("raiding().length === 0", timeout=15000)
        got2 = js("Math.round(warlord.hp)")
        check(f"{layout}: the CB radio sends three raiders; they ram him once each and are gone, 306 and their guns' rounds off him",
              got[:2] == [True, 3] and got[2] - got2 >= 306, [got, got2])

        # 5. his moves, each telegraphed: his cannon winds up (HIS CANNON!), its shell 15% less Armor plating's 75% off a part
        # on your front row 1.2 s later; his rockets lock on a cell of the board; his raiders come out of his gate at you;
        # his gun nests fire a burst
        js("FINALE.react = 0")
        got = js("""(() => { const f = progress.fortress; window.hp5 = f.parts.map(hpOf); cooling.him = {}; hisMove('cannon');
            return [$('flash').textContent, f.parts.every((p, i) => hpOf(p) === hp5[i]), underway.some(u => u.side === 'him' && u.m === 'cannon')]; })()""")
        pg.wait_for_timeout(1500)
        got += [js("""progress.fortress.parts.map((p, i) => +(hp5[i] - hpOf(p)).toFixed(2)).filter(x => x > 0)""")]
        got += js("""(() => { cooling.him = {}; hisMove('rockets'); const r = rockets.at(-1)?.c === warlord; cooling.him = {}; hisMove('raid');
            const cars = traffic.filter(c => c.hisRaider).length; cooling.him = {}; hisMove('guns');
            const out = [r, cars, !!hisBurst]; underway = []; rockets = []; hisBurst = null; traffic.forEach(c => { if (c.hisRaider) c.gone = true; });
            return out; })()""")
        js(HOLD)
        check(f"{layout}: HIS CANNON! winds up, nothing hit yet; 1.2 s later 3.75 off a part on your front row; his rockets lock "
              f"on; three of his raiders come at you; his guns fire", got == ["HIS CANNON!", True, True, [3.75], True, 3, True], got)

        # 6. keys: S the raiders, Space the cannon, G the guns, as the instruments
        got = js("""(() => { cooling.you = {}; const k = key => { const e = new KeyboardEvent('keydown', { key }); dispatchEvent(e); };
            const s = progress.shells; k(' '); const cannon = progress.shells === s - 1; cooling.you = {}; k('g'); const guns = run.burst > 0;
            cooling.you = {}; const n = raiding().length; k('s'); return [cannon, guns, raiding().length - n]; })()""")
        check(f"{layout}: Space fires the cannon, G the guns, S sends the raiders", got == [True, True, 3], got)

        # 6b. rocket pods (layer 2): a part the army's rocket cars drop most, the dealer's sometimes; mounted, the launch
        # button shows, and a press is a salvo from every pod block, landing a rocket's flight (1 s) later, 200 a block,
        # on the one cooldown; with every pod knocked out, JAMMED and nothing spent
        pg.wait_for_function("raiding().length === 0 && !run.burst", timeout=15000)  # section 6's raiders home, its burst over
        got = js("""(() => { const t = DROPS.rocket[1], most = Object.keys(t).sort((a, b) => t[b] - t[a])[0];
            const others = Object.entries(DROPS).filter(([k]) => k !== 'rocket').some(([, d]) => d[1].rockets);
            const runs = progress.runs; let at = -1; const f = progress.fortress, deal = f.deal;
            for (let r = 0; r < 300 && at < 0; r++) { progress.runs = r; if (dealer().offers.some(p => p.kind === 'rockets')) at = r; }
            progress.runs = runs; f.deal = deal;
            f.parts.push({ kind: 'rockets', cells: [[0, 0], [1, 0]], x: 0, y: 2, from: 'rocket' }); applyUpgrades();
            return [most, others, at >= 0]; })()""")
        pg.wait_for_timeout(200)
        js(HOLD)
        got += js("""(() => { cooling.you = {}; const shown = !$('fight-rockets').hidden;
            window.hp0 = warlord.hp; const a = move('rockets'), b = move('guns'); return [shown, a, b, salvos.length, warlord.hp === hp0]; })()""")
        pg.wait_for_timeout(500)
        pg.screenshot(path=f"{OUT}/finale_{layout}_rockets.png")  # the salvo in the air, the launch button
        pg.wait_for_timeout(800)
        got += js("[salvos.length, Math.round(hp0 - warlord.hp)]")
        got += js("""(() => { cooling.you = {}; const pod = progress.fortress.parts.at(-1); jammed.set(pod, 9); const r = [move('rockets'), salvos.length];
            jammed.delete(pod); return r; })()""")
        check(f"{layout}: rocket pods: the rocket car's drop mostly, nobody else's; the dealer offers one now and then; mounted, the "
              f"launch button; a salvo goes up (the lever then waits), lands a second later, 400 off him (200 a block, two blocks); jammed, nothing",
              got == ["rockets", False, True, True, True, False, 1, True, 0, 400, False, 0], got)
        # 6b2. the dealer before his fight (the owner): once the warlord waits, a weapon of his fight the rig lacks is
        # among the offers first: a rocket pod with none on the board; with nothing on the rig (no War Rig guns, a bare
        # board), a cannon, a gun and a pod
        got = js("""(() => { const f = progress.fortress, parts = f.parts, deal = f.deal, guns = progress.levels.guns, kinds = () => (f.deal = null, dealer().offers.map(p => p.kind));
            const noPod = kinds(); f.parts = []; progress.levels.guns = 0; const bare = kinds();
            f.parts = parts; progress.levels.guns = guns; f.parts.push({ kind: 'rockets', cells: [[0, 0]], x: 3, y: 3, from: 'rocket' }); const all = kinds();
            f.parts.pop(); f.deal = deal; return [noPod[0], bare, all.length]; })()""")
        check(f"{layout}: the dealer before his fight: a rocket pod first with none on the board; a cannon, a gun and a pod "
              f"with nothing on the rig; three offers as ever", got == ["rockets", ["cannon", "gun", "rockets"], 3], got)

        # 6c. the cycle (layer 3): each move beats one (the cannon raiders, raiders guns, guns rockets, rockets the cannon).
        # Stepped here a 60th at a time, the loop paused. Under way, his move is cancelled by the one that beats it, yours
        # doing double, and he is open a beat; yours is lost to the one that beats it (raiders shot up: wrecks), his landing;
        # neutral, both land. He answers yours now and then: with FINALE.react 1, at once, with the move that beats it
        got = js("""(() => { menuOpen = true;
            const step = s => { for (let t = 0; t < s; t += 1 / 60) { fightTick(1 / 60); updateTraffic(1 / 60, performance.now() / 1000); } };
            const f = progress.fortress, hp = () => Math.round(warlord.hp ?? health(warlord));
            let hits = 0; const cell = window.hitCell; window.hitCell = (...a) => { hits++; return cell(...a); }; const board = () => hits; // hits landed
            const clear = () => { underway = []; answer = hisBurst = null; rockets = []; salvos = []; run.burst = 0; FINALE.react = 0;
              cooling = { you: {}, him: { raid: 99, cannon: 99, guns: 99, rockets: 99 } }; traffic.forEach(c => { if (c.raider || c.hisRaider) c.gone = true; }); step(0.05); };
            const his = m => { cooling.him = {}; hisMove(m); run.hisClock = 99; }, out = {}; // his own clock held: only the move set
            clear(); his('cannon'); step(1); let b0 = board(), h0 = hp(); move('rockets'); const open = +cooling.him.cannon.toFixed(1); step(1.5);
            out.cannonByRockets = [board() === b0, h0 - hp(), open];
            clear(); his('raid'); b0 = board(); h0 = hp(); move('cannon'); const downed = traffic.filter(c => c.hisRaider && c.wreck).length; step(1.5);
            out.raidByCannon = [downed, board() === b0, h0 - hp()];
            clear(); his('rockets'); b0 = board(); h0 = hp(); move('guns'); const gone = !rockets.length; step(3);
            out.rocketsByGuns = [gone, board() === b0, h0 - hp()];
            clear(); his('guns'); step(0.2); move('raid'); const stopped = !hisBurst; h0 = hp(); step(5);
            out.gunsByRaid = [stopped, h0 - hp() >= 612];
            clear(); const down = progress.crewDown; his('cannon'); b0 = board(); move('raid'); step(1.5);
            out.raidLost = [progress.crewDown - down, board() !== b0, raiding().length];
            progress.crewDown = down; clear(); his('cannon'); b0 = board(); h0 = hp(); move('guns'); step(1.5);
            out.neutral = [board() !== b0, h0 - hp()];
            clear(); FINALE.react = 1; cooling.him = {}; run.hisClock = 99; b0 = board(); h0 = hp(); move('rockets'); step(1.5);
            out.answered = [h0 - hp(), board() !== b0];
            clear(); FINALE.react = 0.3; f.parts.pop(); applyUpgrades(); menuOpen = false; window.hitCell = cell;
            return out; })()""")
        js(HOLD)
        check(f"{layout}: rockets on his winding cannon: his shell never comes, the salvo doubled (800), he is open a beat (1.5 s)", got["cannonByRockets"] == [True, 800, 1.5], got["cannonByRockets"])
        check(f"{layout}: the cannon on his raiders: all three wrecked, none rams you, the shell doubled (1,000)", got["raidByCannon"] == [3, True, 1000], got["raidByCannon"])
        check(f"{layout}: the guns on his rockets: shot down, nothing lands, the burst doubled (480)", got["rocketsByGuns"] == [True, True, 480], got["rocketsByGuns"])
        check(f"{layout}: raiders on his gun nests: his burst stops, their rams doubled (612 and more)", got["gunsByRaid"] == [True, True], got["gunsByRaid"])
        check(f"{layout}: raiders into his winding cannon: shot up, three wrecks, and his shell lands", got["raidLost"] == [3, True, 0], got["raidLost"])
        check(f"{layout}: the guns against his cannon: neutral, both land (his shell, your 240)", got["neutral"] == [True, 240], got["neutral"])
        check(f"{layout}: he answers a salvo with his guns: the salvo shot down (nothing off him), his guns' rounds doubled on you",
              got["answered"] == [0, True], got["answered"])

        # 7. wrecked: back to the garage, FIGHT waiting for a repair; repaired, FIGHT again
        js("progress.damage = 100; hisShell(0, false)")
        pg.wait_for_function("run.phase === 'garage'", timeout=15000)
        got = js("[run.won, $('report').textContent, $('fight').disabled, $('drive').textContent]")
        js("progress.damage = 0; renderGarage()")
        got += js("[$('fight').disabled]")
        check(f"{layout}: wrecked, back to the garage (WRECKED by the warlord), FIGHT waits for a repair, DRIVE limps; repaired, FIGHT",
              got[0] is False and got[1].startswith("WRECKED by the warlord") and got[2:] == [True, "LIMP 40 m ▶", False], got)
        pg.screenshot(path=f"{OUT}/finale_{layout}_lost.png")

        # 8. his fortress down: THE WARLORD IS DOWN, then the ending's screen
        pg.click("#fight"); pg.wait_for_function("run.phase === 'run'", timeout=20000)
        js(HOLD + "; warlord.hp = 1; hurtCar(warlord, 5)")
        pg.wait_for_timeout(200)  # drawn
        got = js("[run.won, run.phase, $('run-dist').textContent, progress.warlord]")
        pg.wait_for_function("menuOpen && screen === 'win'", timeout=15000)
        got += js("[$('warlord').textContent]")
        check(f"{layout}: his fortress down: THE WARLORD IS DOWN, then WARLORD OF THE COAST ROAD", got == [True, "finish", "THE WARLORD IS DOWN", 1,
              "WARLORD OF THE COAST ROAD"], got)
        pg.screenshot(path=f"{OUT}/finale_{layout}_win.png")
        ctx.close()
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
