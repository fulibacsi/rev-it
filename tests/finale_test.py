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

        # 3. one cooldown for them all (1.5 s, 0.08 of it less a level of Dispatch): the cannon fires (a shell: 250, Heavy
        # shells none, two blocks), then the lever too soon does nothing; a beat later its burst (8 rounds of 6 x (3 + 2));
        # no Auto cannon, no War chief meanwhile
        got = js("""(() => { cooling.him = { cannon: 99, rockets: 99 }; const hp0 = health(warlord), shells = progress.shells;
            const a = move('cannon'), b = move('guns'), hp1 = warlord.hp, cd = +cooling.you.guns.toFixed(2);
            return [a, b, hp0 - hp1, shells - progress.shells, cd, +beatOf('you').toFixed(2), (progress.levels.workRate = 5, +beatOf('you').toFixed(2))]; })()""")
        js("progress.levels.workRate = 0")
        pg.wait_for_timeout(1700)
        got += js("""(() => { const hp = warlord.hp, ok = move('guns'); return [ok, run.burst]; })()""")
        pg.wait_for_timeout(1200)
        got += js("""[raiding().length, Math.round(8000 - 500 - warlord.hp)]""")
        check(f"{layout}: one cooldown: the cannon fires (500 off his 8,000, a shell spent), the lever at once does nothing, 1.5 s "
              f"(0.9 at Dispatch 5); a beat later the burst, 8 rounds of 30; no Auto cannon, no raiders sent by the War chief",
              got == [True, False, 500, 1, 1.5, 1.5, 0.9, True, 8, 0, 240], got)

        # 4. the CB radio: a raiding party of three, a ram each (102 with the bull bar), and back
        pg.wait_for_timeout(1600)
        got = js("""(() => { const hp = warlord.hp, ok = move('raid'); return [ok, raiding().length, hp]; })()""")
        pg.wait_for_function("raiding().length === 0", timeout=15000)
        got2 = js("Math.round(warlord.hp)")
        check(f"{layout}: the CB radio sends three raiders; they ram him once each and are gone, 306 and their guns' rounds off him",
              got[:2] == [True, 3] and got[2] - got2 >= 306, [got, got2])

        # 5. his moves: a shell at your front row (10% less Armor plating's 75% off the part there), a rocket locked on a cell
        got = js("""(() => { const f = progress.fortress, hp = f.parts.map(hpOf), r0 = rockets.length; cooling.him = {};
            const roll = rng; rng = 1; hisMove(); const shot = f.parts.map((p, i) => +(hp[i] - hpOf(p)).toFixed(2)).filter(x => x > 0);
            cooling.him = {}; let k = 0; while (rockets.length === r0 && k++ < 20) { cooling.him = {}; hisMove(); }
            rng = roll; return [shot, rockets.length > r0, rockets.at(-1)?.c === warlord]; })()""")
        check(f"{layout}: his shell takes 2.5 off a part on your front row; his rocket locks on a cell of the board", got[0] == [2.5] and got[1:] == [True, True], got)

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
        got += js("""(() => { cooling.you = {}; cooling.him = { cannon: 99, rockets: 99 }; const shown = !$('fight-rockets').hidden;
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
        js("progress.fortress.parts.pop(); applyUpgrades()")

        # 7. wrecked: back to the garage, FIGHT waiting for a repair; repaired, FIGHT again
        js("progress.damage = 99.9; cooling.him = {}; rng = 1; hisMove()")
        pg.wait_for_function("run.phase === 'garage'", timeout=15000)
        got = js("[run.won, $('report').textContent, $('fight').disabled, $('drive').textContent]")
        js("progress.damage = 0; renderGarage()")
        got += js("[$('fight').disabled]")
        check(f"{layout}: wrecked, back to the garage (WRECKED by the warlord), FIGHT waits for a repair, DRIVE limps; repaired, FIGHT",
              got[0] is False and got[1].startswith("WRECKED by the warlord") and got[2:] == [True, "LIMP 40 m ▶", False], got)
        pg.screenshot(path=f"{OUT}/finale_{layout}_lost.png")

        # 8. his fortress down: THE WARLORD IS DOWN, then the ending's screen
        pg.click("#fight"); pg.wait_for_function("run.phase === 'run'", timeout=20000)
        js("cooling.him = { cannon: 99, rockets: 99 }; warlord.hp = 1; hurtCar(warlord, 5)")
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
