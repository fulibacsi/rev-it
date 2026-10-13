from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
def rect(pg, sel): return pg.evaluate(f"(() => {{ const r = document.querySelector('{sel}').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }})()")
def hit(a, b): return not (a[2] <= b[0] or b[2] <= a[0] or a[3] <= b[1] or b[3] <= a[1])
with sync_playwright() as p:
    b = launch(p); errs = []
    for w, h, touch in [(844, 390, True), (1180, 820, True), (1000, 700, False), (1440, 900, False)]:
        ctx = b.new_context(viewport={"width": w, "height": h}, has_touch=touch, is_mobile=touch); pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        if touch: ctx.new_cdp_session(pg).send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
        pg.goto(URL); pg.wait_for_timeout(300)
        pg.evaluate("localStorage.clear(); Object.assign(progress, { racing: true, finish: 1, bank: 9000, levels: { flash: 1, reckless: 1, ecuPower: 1, nitro: 2, gears: 3, gear7: 1 } })")
        pg.click('[data-play="distance"]'); pg.wait_for_timeout(200); pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000); pg.wait_for_timeout(300)
        boxes = {s: rect(pg, s) for s in ["#stalk-hit", "#timer", "#nos", "#ignition", "#shifter", "#cluster", "#pedals", "#menu-button", "#hud-main"]}
        part = {"#nos", "#pedals"}  # the nitro pedal rides on the gas pedal
        clashes = [f"{a}/{c}" for i, a in enumerate(boxes) for c in list(boxes)[i + 1:] if hit(boxes[a], boxes[c]) and {a, c} != part]
        print(f"{w}x{h}: overlaps:", clashes or "none")
        pg.screenshot(path=f"{OUT}/buttons_{w}.png"); ctx.close()
    b.close(); print("ERRORS:", errs or "none")
