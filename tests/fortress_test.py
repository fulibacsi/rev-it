"""Act 5's Rebuild (docs/design-notes.md, Act 5): the Fortress page's first card makes the car a war rig. The gear
shifter and all three pedals go (the owner, 30 Oct: "we brake for no-one"), a firing pedal in their place; the aids that
drive it bolted on, their cards under a metal plate; in the shifter's place the fortress's board, 1x1, and the hold
with the tank's cannon. On the road only (in the garage the board only shows), a part dragged from the hold goes on
only once it has rested (a flick goes back), and dropped onto a mounted part it replaces it; pressed and held, a part
is thrown off for good. The cannon fires a shell a press (Space, or the pedal) at the car in the reticle, then
reloads. The keys and the help follow; Free drive keeps its pedals. Phone (touch, the notch) and desktop."""
import json
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
LEVELS = dict(workshopTab=1, autopilotTab=1, blackTab=1, fleetTab=1, warrigTab=1, fortressTab=1, power=10, rev=4, gears=3, tyres=4,
              time=6, clutch=1, gas=1, shift=1, steer=1, cruise=1, autoflash=1, engine=2, flash=5, grid=100, rolling=6, reckless=1,
              chicken=1, ecuRev=4, recklessCruise=1, cooling=3, ecuPower=4, nitro=5, fleet=80, bullbar=3, armour=3, spikes=1, guns=1,
              autogun=1, hunter=1, pack=1, dues=3, fleetPace=3)
IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    for layout in ["phone", "desktop"]:
        phone = layout == "phone"
        ctx = b.new_context(**(dict(viewport={"width": 852, "height": 393}, device_scale_factor=2, is_mobile=True, has_touch=True,
                                    user_agent=IPHONE) if phone else dict(viewport={"width": 1440, "height": 900})))
        pg = ctx.new_page(); js = pg.evaluate; pg.on("pageerror", lambda e: errors.append(str(e))); pg.on("dialog", lambda d: d.accept())
        cdp = ctx.new_cdp_session(pg)
        if phone:
            cdp.send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
            cdp.send("Emulation.setSafeAreaInsetsOverride", {"insets": {"left": 59, "right": 59, "bottom": 21, "top": 0}})
        W, H = (852, 393) if phone else (1440, 900)
        tap = pg.tap if phone else pg.click
        def touch(kind, x, y, id=1): cdp.send("Input.dispatchTouchEvent", {"type": kind, "touchPoints": [{"x": x, "y": y, "id": id}]})
        def center(sel): return js(f"(() => {{ const r = document.querySelector('{sel}').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }})()")
        def box(sel): return js(f"(() => {{ const r = document.querySelector('{sel}').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }})()")
        def drag_to_board(rest_ms, peek=None, jitter=0, during=None, corner=False):  # from the hold's part (or its slot's
            # corner), off to the left, then across onto the board's last row (where it floats over it: above the finger),
            # a cell a step, then a rest, the finger still or wobbling (jitter px), something happening as it rests (during)
            s, cell = center("#fort-hold .part"), js("parseFloat($('board').style.getPropertyValue('--cell'))")
            if corner: sl = box("#fort-hold .slot"); s = [sl[0] + 3, sl[3] - 3]
            g = box("#fort-grid"); tx, ty = (g[0] + g[2]) / 2, g[3] + cell * 0.6
            path = [(tx - 4 * cell + k * cell, ty) for k in range(5)]
            press, move, lift = ((lambda x, y: touch("touchStart", x, y)), (lambda x, y: touch("touchMove", x, y)), (lambda x, y: touch("touchEnd", x, y))) \
                if phone else ((lambda x, y: (pg.mouse.move(x, y), pg.mouse.down())), pg.mouse.move, (lambda x, y: pg.mouse.up()))
            press(*s)
            for x, y in path: move(x, y)
            during and during()
            for k in range(rest_ms // 30):
                if jitter: move(tx + jitter * (1 if k % 2 else -1), ty + jitter * (1 if k % 3 else -1))
                pg.wait_for_timeout(30)
            peek and peek(); lift(tx, ty)
            pg.wait_for_timeout(100)
        def hold_part(ms, slide=0):
            c = center("#fort-grid .part")
            if phone:
                touch("touchStart", *c, id=2)
                if slide: touch("touchMove", c[0] + slide, c[1], id=2)
                pg.wait_for_timeout(ms); touch("touchEnd", c[0] + slide, c[1], id=2)
            else:
                pg.mouse.move(*c); pg.mouse.down()
                if slide: pg.mouse.move(c[0] + slide, c[1], steps=3)
                pg.wait_for_timeout(ms); pg.mouse.up()
            pg.wait_for_timeout(100)
        pg.goto(URL); js("localStorage.clear()")
        js(f"Object.assign(progress, {{ racing: true, finish: 1, gang: true, totals: 60, tanks: 1, oil: 2, runs: 80, races: 60, bank: 9000, points: 2000, "
           f"roles: {{ harvester: 17, brewer: 9, raider: 6 }}, levels: {json.dumps(LEVELS)}, toured: TUTORIALS.map(t => t.id).filter(id => id !== 'rig') }}); save()")
        if phone: js("settings.layout = 'touch'; applyLayout()")
        pg.click('[data-play="distance"]'); pg.wait_for_timeout(300)

        # 1. before the Rebuild: the car as it was; the card on the Fortress page
        js("garageTab = 'fortress'; renderGarage()")
        got = js("[$('cards').innerText.includes('Rebuild'), $('cards').innerText.includes('1,500 pts'), getComputedStyle($('shifter')).display, "
                 "getComputedStyle($('board')).display, TUTORIALS.find(t => t.id === 'driving').open(), TUTORIALS.find(t => t.id === 'rig').open()]")
        check(f"{layout}: before it: the Rebuild for 1,500 points, the shifter there, no board, Driving's tutorial, not the rig's",
              got == [True, True, "block" if not phone else got[2], "none", True, False] and got[2] != "none", got)
        # 2. bought: the cannon in the hold, the cockpit the rig's, the rig's tutorial up
        pg.click('[data-buy="rebuild"]'); pg.wait_for_timeout(300)
        got = js("[progress.points, JSON.stringify(progress.fortress), menuOpen && screen, tour.id]")
        check(f"{layout}: bought: 500 points left, the tank's cannon in the hold, the rig's tutorial pops up",
              got == [500, '{"parts":[],"hold":[{"kind":"cannon","cells":[[0,0]]}]}', "tour", "rig"], got)
        while js("menuOpen"): js("turnTour(1)"); pg.wait_for_timeout(50)
        js("garageTab = 'fortress'; renderGarage()"); pg.wait_for_timeout(100)
        before = js("[progress.shells, progress.points]"); tap("[data-shells]"); pg.wait_for_timeout(150)
        got = js("[progress.shells, progress.points, $('cards').querySelector('.shells small').textContent]")
        check(f"{layout}: a crate of shells on the Fortress page: 10 for 100 points, as often as you like", before == [10, 500]
              and got == [20, 400, "10 for 100 points · 20 in the rig"], [before, got])
        drag_to_board(350)
        got = js("[progress.fortress.parts.length, progress.fortress.hold.length, getComputedStyle($('board')).display]")
        check(f"{layout}: in the garage the board only shows: a drag there mounts nothing", got == [0, 1, "flex"], got)
        js("garageTab = 'autopilot'; renderGarage()"); pg.wait_for_timeout(100)
        got = js("[...document.querySelectorAll('#cards .card')].map(c => [c.querySelector('b').textContent, !!c.querySelector('.plate'), !!c.querySelector('button')])")
        plated = sorted(n for n, pl, _ in got if pl)
        check(f"{layout}: the aids it drives with, under a plate, no switch; Auto flash as it was",
              plated == ["Auto clutch", "Auto gas", "Auto shift", "Autocruise", "Lane assist"] and all(not bt for _, pl, bt in got if pl)
              and any(n == "Auto flash" and not pl and bt for n, pl, bt in got), got)
        pg.screenshot(path=f"{OUT}/fortress_{layout}_plates.png")
        js("openMenu('help')"); help = js("document.querySelector('[data-screen=help] .' + (touchLayout() ? 'touch-only' : 'desk-only')).innerText"); js("closeMenu()")
        check(f"{layout}: the help: the cannon and the board, no pedals or gears",
              ("Cannon" in help and "Fortress" in help and "Pedals" not in help) if phone else ("Space fire the cannon" in help and "Space gas" not in help and "N nitro" not in help), help[:200])

        # 3. on the road: no shifter, no pedals, the firing pedal; the aids drive, whatever their switches say
        js("progress.off.cruise = progress.off.gas = true"); pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=20000)
        js("traffic.forEach(c => { if (!c.racer) c.z = odo + 3000; })"); pg.wait_for_timeout(1500)
        got = js("[document.body.classList.contains('rig'), getComputedStyle($('shifter')).display, getComputedStyle($('gas').parentNode).display, "
                 "getComputedStyle($('brake').parentNode).display, getComputedStyle($('board')).display, getComputedStyle($('cannon-pedal').parentNode).display, "
                 "['clutch', 'gas', 'shift', 'steer', 'cruise'].map(aid).every(Boolean), Math.round(speed * 3.6) > 60]")
        check(f"{layout}: the rig: no shifter, no pedals, the board and the firing pedal; it drives itself, switched off or not",
              got == [True, "none", "none", "none", "flex", "flex", True, True], got)
        pg.keyboard.down("Shift"); pg.keyboard.down("b"); pg.wait_for_timeout(100)
        got = js("[PEDALS.clutch.hold, PEDALS.brake.hold]"); pg.keyboard.up("Shift"); pg.keyboard.up("b")
        check(f"{layout}: Shift and B press no pedal", got == [None, None], got)
        bd, pd, wh = box("#board"), box(".cannon-box"), box("#wheel-rim")
        inside = lambda r: r[0] >= 0 and r[1] >= 0 and r[2] <= W and r[3] <= H
        check(f"{layout}: the board and the firing pedal on the screen" + (", clear of the notch" if phone else ""),
              inside(bd) and inside(pd) and (not phone or (bd[0] >= 59 and pd[2] <= W - 59)), [bd, pd])
        if phone:
            ctl = box("#crew-ctl")
            check("phone: the board clear of ‹ SEND › above it", bd[1] >= ctl[3] - 1, [bd, ctl])
        pg.screenshot(path=f"{OUT}/fortress_{layout}_hold.png")

        # 4. a part on: a flick goes back to the hold; rested on green, it goes on
        drag_to_board(0)
        check(f"{layout}: dragged and let go at once: back in the hold", js("[progress.fortress.parts.length, progress.fortress.hold.length]") == [0, 1],
              js("JSON.stringify(progress.fortress)"))
        drag_to_board(350)
        got = js("[JSON.stringify(progress.fortress.parts), progress.fortress.hold.length, cannonOn(), $('fort-drag').hidden]")
        check(f"{layout}: rested on green, let go: the cannon on the board, the hold empty", got == ['[{"kind":"cannon","cells":[[0,0]],"x":0,"y":0}]', 0, True, True], got)
        pg.screenshot(path=f"{OUT}/fortress_{layout}_mounted.png")
        # a part dropped onto mounted ones replaces them, in one move: the ghost amber, what it would throw off marked
        js("progress.fortress.hold.push({ kind: 'armor', from: 'rig', cells: [[0, 0]] })"); pg.wait_for_timeout(100)
        seen = {}
        def peek():
            seen.update(js("({ ghost: $('fort-ghost').className, doomed: [...document.querySelectorAll('#fort-grid .doomed')].map(e => e.classList[1]), drag: [...$('fort-drag').classList].sort().join() })"))
            pg.screenshot(path=f"{OUT}/fortress_{layout}_swap.png")
        drag_to_board(350, peek)
        got = js("[progress.fortress.parts.map(p => p.kind).join(), progress.fortress.hold.length, cannonOn()]")
        check(f"{layout}: dropped onto the cannon: the ghost amber over it, the cannon marked, the part glowing amber; let go, the armor on and the cannon thrown off",
              seen == {"ghost": "swap", "doomed": ["cannon"], "drag": "armed,swap"} and got == ["armor", 0, False], [seen, got])
        js("progress.fortress.parts = [{ kind: 'cannon', cells: [[0, 0]], x: 0, y: 0 }]; applyUpgrades()")  # the cannon back, for its shells
        # on the owner's phone (1 Nov) a drop took two tries or more: a thumb's wobble kept the beat from arming, a hit on a
        # part redrew the board from under the finger, and only a part's blocks took a touch, not its slot
        js("progress.levels.lengthen = 1; applyUpgrades()"); pg.wait_for_timeout(100)  # two rows: room behind the cannon
        got = []
        for kw in [dict(jitter=8), dict(during=lambda: js("strike(4, carX, odo + 5)")), dict(corner=True)]:
            js("progress.fortress.hold = [{ kind: 'armor', from: 'rig', cells: [[0, 0]] }]"); pg.wait_for_timeout(100)
            drag_to_board(330, **kw)
            got.append(js("progress.fortress.parts.length")); js("progress.fortress.parts = progress.fortress.parts.slice(0, 1)")
        check(f"{layout}: it goes on with the thumb wobbling 8 px, with a part hit as it rests, and taken by its slot's corner", got == [2, 2, 2], got)
        js("progress.levels.lengthen = 0; progress.fortress.parts = [{ kind: 'cannon', cells: [[0, 0]], x: 0, y: 0 }]; applyUpgrades()")

        # 5. the cannon: a shell a press at the reticle's car, then a reload; heavy
        shot = """(kind) => { const c = traffic.find(c => c.dir > 0 && !c.racer && !c.wreck && !c.police && !c.tank);
            Object.assign(c, { z: odo + 80, x: carX, lane, hp: null, police: kind === 'police' }); target = c; c.seen = [0, 0, 1, 1];
            const s0 = run.scrap, fired = fireCannon(); return [fired, c.wreck, run.scrap - s0, target !== c]; }"""
        got = js(f"({shot})('car')")
        check(f"{layout}: Space or the pedal: one shell totals a car (+22 scrap), the reticle moves on", got == [True, True, 22, True], got)
        got = js(f"({shot})('car')")
        check(f"{layout}: at once again: reloading, no shell", got[0] is False, got)
        pg.wait_for_timeout(2100); pg.keyboard.press(" "); pg.wait_for_timeout(50)
        check(f"{layout}: reloaded, Space fires", js("reloading > 1.5"), js("reloading"))
        js("reloading = 0"); got = js(f"({shot})('police')")
        check(f"{layout}: a police car (200) in one too", got[:2] == [True, True], got)
        js("reloading = 0"); x, y = center("#cannon-pedal")
        if phone: touch("touchStart", x, y, id=3); pg.wait_for_timeout(600); touch("touchEnd", x, y, id=3)
        else: pg.mouse.move(x, y); pg.mouse.down(); pg.wait_for_timeout(600); pg.mouse.up()
        check(f"{layout}: the pedal held: one shell, no more", 1.3 < js("reloading") < 1.5, js("reloading"))
        pg.screenshot(path=f"{OUT}/fortress_{layout}_shot.png")

        # 6. thrown off: a tap or a slide doesn't; held until the ring closes, gone for good
        hold_part(200); check(f"{layout}: a short press: still on", js("progress.fortress.parts.length") == 1, js("progress.fortress.parts.length"))
        hold_part(700, slide=js("parseFloat($('board').style.getPropertyValue('--cell'))")); check(f"{layout}: a slide (a cell): still on", js("progress.fortress.parts.length") == 1, js("progress.fortress.parts.length"))
        hold_part(700)
        got = js("[progress.fortress.parts.length, progress.fortress.hold.length, cannonOn(), fireCannon()]")
        check(f"{layout}: held: thrown off, gone for good; the pedal fires nothing", got == [0, 0, False, False], got)

        # 7. kept in the save; Free drive keeps its shifter and pedals
        js("progress.fortress.parts.push({ kind: 'cannon', cells: [[0, 0]], x: 0, y: 0 }); save()"); pg.reload(); pg.wait_for_timeout(300)
        check(f"{layout}: kept in the save", js("JSON.stringify(progress.fortress.parts)") == '[{"kind":"cannon","cells":[[0,0]],"x":0,"y":0}]', js("JSON.stringify(progress.fortress)"))
        js("play(ARCADE.find(g => g.id === 'free'))"); pg.wait_for_timeout(300)
        got = js("[document.body.classList.contains('rig'), getComputedStyle($('shifter')).display, getComputedStyle($('gas').parentNode).display]")
        check(f"{layout}: Free drive: the shifter and the pedals as ever", got[0] is False and got[1] != "none" and got[2] != "none", got)
        ctx.close()
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
