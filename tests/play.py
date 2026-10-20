"""Plays the incremental game with real mouse drags: manual run, garage purchases, aided runs, save across reload."""
import json
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
errors = []
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL); js = pg.evaluate; m = pg.mouse
    js("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(300); js("progress.toured = TUTORIALS.map(t => t.id)"); pg.click("[data-play=distance]"); pg.wait_for_timeout(200)
    st = lambda: js("({ phase: run.phase, left: +run.left.toFixed(1), state, gear, kmh: Math.round(speed * 3.6), rpm: Math.round(rpm), "
                    "m: Math.round(odo), clutch: +clutchPedal.toFixed(2), gas: +gasPedal.toFixed(2), lever: [+lever.x.toFixed(2), +lever.y.toFixed(2)] })")
    def gate_xy(gx, gy):
        bb = pg.locator("#shifter").bounding_box()
        return bb["x"] + (gx + 1.6) / 3.2 * bb["width"], bb["y"] + (gy + 1.75) / 3.5 * bb["height"]
    def lever_path(points):
        m.move(*gate_xy(*js("[lever.x, lever.y]"))); m.down()
        for (x0, y0), (x1, y1) in zip(points, points[1:]):
            for i in range(1, 9): m.move(*gate_xy(x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8)); pg.wait_for_timeout(10)
        m.up(); pg.wait_for_timeout(50)
    def pedal(id_, to, ms=200):
        bb = pg.locator(f"#{id_}").bounding_box(); box = pg.locator(f"#{id_}").locator("..").bounding_box()
        cur = js({'clutch': 'clutchPedal', 'brake': 'brakePedal', 'gas': 'gasPedal'}[id_])
        x, y = bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2
        m.move(x, y); m.down()
        steps = max(1, ms // 20)
        for i in range(1, steps + 1): m.move(x, y + (to - cur) * box["height"] * i / steps); pg.wait_for_timeout(20)
        m.up()
    def wait_phase(ph, limit=80000):
        pg.wait_for_function(f"run.phase === '{ph}'", timeout=limit)
    def shift_when_high(frm, to, path, manual_clutch=True):
        pg.wait_for_function(f"rpm > engine.redline - 300 && gear === {frm} && locked", timeout=20000)
        if manual_clutch: pedal("clutch", 1.0, 100)
        lever_path(path)
        if manual_clutch: pedal("clutch", 0.0, 300)

    # ---- run 1: everything by hand, 3-speed box ----
    pg.click("#drive"); wait_phase("countdown")
    pedal("clutch", 1.0); lever_path([(0, 0), (-1, 0), (-1, -1)]); pedal("gas", 1.0)
    print("staged:", st()); pg.screenshot(path=f"{OUT}/p_countdown.png")
    wait_phase("run"); pedal("clutch", 0.0, 700)
    shift_when_high(1, 2, [(-1, -1), (-1, 1)])
    shift_when_high(2, 3, [(-1, 1), (-1, 0), (0, 0), (0, -1)])
    print("in 3rd:", st()); pg.screenshot(path=f"{OUT}/p_run.png")
    lever_path([(0, -1), (0, 0), (0, 1)])  # no 4th slot: lever must stay out of gear on the rail
    print("tried 4th (not cut):", st())
    lever_path([(0, 0), (0, -1)]) if js("gear") != 3 else None
    wait_phase("garage"); pg.wait_for_timeout(300)
    print("garage after run 1:", js("({...progress})")); pg.screenshot(path=f"{OUT}/p_garage1.png")

    # ---- buy through the garage UI ----
    js("progress.bank += 3000; renderGarage()")
    for sel in ['[data-tab="autopilot"]', '[data-buy="clutch"]', '[data-tab="workshop"]', '[data-buy="power"]', '[data-buy="gears"]', '[data-buy="rev"]']:
        pg.click(sel); pg.wait_for_timeout(100)
    print("after buying:", js("({ bank: progress.bank, levels: progress.levels, top: topGear(), redline: engine.redline })"))
    pg.screenshot(path=f"{OUT}/p_garage2.png")

    # ---- run 2: auto clutch, lever by hand ----
    pg.click("#drive"); wait_phase("countdown")
    lever_path([(0, 0), (-1, 0), (-1, -1)]); pedal("gas", 1.0)
    print("staged (auto clutch):", st())
    wait_phase("run"); pg.wait_for_timeout(300); print("launch:", st())
    shift_when_high(1, 2, [(-1, -1), (-1, 1)], manual_clutch=False)
    shift_when_high(2, 3, [(-1, 1), (-1, 0), (0, 0), (0, -1)], manual_clutch=False)
    shift_when_high(3, 4, [(0, -1), (0, 1)], manual_clutch=False)
    print("in 4th:", st())
    wait_phase("garage"); print("run 2:", js("run.gain"), "m")

    # ---- run 3: all aids, hands off ----
    js("progress.bank += 4000; renderGarage()")
    pg.click('[data-tab="autopilot"]'); pg.click('[data-buy="gas"]'); pg.wait_for_timeout(100); pg.click('[data-buy="shift"]'); pg.wait_for_timeout(100)
    pg.click("#drive"); wait_phase("run"); pg.wait_for_timeout(6000); print("hands off 6 s:", st())
    pg.screenshot(path=f"{OUT}/p_auto.png")
    wait_phase("garage"); print("run 3:", js("run.gain"), "m")

    # ---- toggle an aid off, then reload: progress kept ----
    pg.click('[data-toggle="shift"]'); pg.wait_for_timeout(100)
    pg.reload(); pg.wait_for_timeout(300); pg.click("[data-play=distance]"); pg.wait_for_timeout(200); pg.click('[data-tab="autopilot"]')
    print("after reload:", js("({ bank: progress.bank, best: progress.best, runs: progress.runs, levels: progress.levels, off: progress.off })"))
    print("shift button:", pg.inner_text('[data-toggle="shift"]'))
    b.close()
print("ERRORS:", errors or "none")
