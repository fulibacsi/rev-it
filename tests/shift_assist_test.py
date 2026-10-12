"""The finger shift assist: a sloppy finger path through the H lands in the slot it heads for, the revs tip it between
two columns, and a flick, a wrong-way pull or an off-centre grab does nothing. Mouse stays exact."""
from playwright.sync_api import sync_playwright
from common import URL, launch
errors, fails = [], []
class Fingers:
    def __init__(self, cdp): self.cdp, self.down = cdp, {}
    def _send(self, kind): self.cdp.send("Input.dispatchTouchEvent", {"type": kind, "touchPoints": [{"x": x, "y": y, "id": i} for i, (x, y) in self.down.items()]})
    def start(self, i, x, y): self.down[i] = (x, y); self._send("touchStart")
    def move(self, i, x, y): self.down[i] = (x, y); self._send("touchMove")
    def end(self, i): x, y = self.down.pop(i); self.cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": [{"x": x, "y": y, "id": i}]})
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    ctx = b.new_context(viewport={"width": 844, "height": 390}, is_mobile=True, has_touch=True); pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
    cdp = ctx.new_cdp_session(pg); cdp.send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5}); f = Fingers(cdp)
    pg.goto(URL); pg.wait_for_timeout(300); js = pg.evaluate
    pg.tap('[data-play="free"]'); pg.wait_for_timeout(200); js("startEngine()"); pg.wait_for_timeout(1800)
    js("traffic.length = 0")
    def to_px(gx, gy):  # gate units -> page pixels
        bb = pg.locator("#shifter").bounding_box(); w = 4.2 if js("gateGears()") >= 7 else 3.2
        return bb["x"] + (gx + 1.6) / w * bb["width"], bb["y"] + (gy + 1.75) / 3.5 * bb["height"]
    set_gear = "(g, revs) => { const [x, y] = g ? slotOf(g) : [0, 0]; gear = g; Object.assign(lever, { x, y, path: null }); " \
               "speed = revs * engine.redline * CAR.wheel * RAD / (CAR.gears[g || 1] * engine.final); locked = false; }"
    def case(name, g, revs, path, want, clutch=True, kmh=None):
        js("if (state !== 'running') { state = 'running'; rpm = engine.idle; }")
        js(f"({set_gear})({g}, {revs})")
        if kmh is not None: js(f"speed = {kmh} / 3.6")
        pg.wait_for_timeout(80)
        if clutch:
            c = pg.locator("#clutch").bounding_box(); f.start(1, c["x"] + c["width"] / 2, c["y"] + c["height"] / 2); pg.wait_for_timeout(200)
        hint = js("hintGear(gear)")
        pts = [path[0]]
        for (x0, y0), (x1, y1) in zip(path, path[1:]):  # small steps, like touch samples
            n = max(1, round(max(abs(x1 - x0), abs(y1 - y0)) / 0.1))
            pts += [(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n) for k in range(1, n + 1)]
        f.start(2, *to_px(*pts[0]))
        for pt in pts[1:]: f.move(2, *to_px(*pt)); pg.wait_for_timeout(16)
        pg.wait_for_timeout(500); f.end(2)
        if clutch: f.end(1)
        pg.wait_for_timeout(150)
        got = js("gear"); ok = got == want
        if not ok: fails.append(name)
        print(f"{'ok ' if ok else 'FAIL'} {name:58} hint {hint} -> gear {got} (want {want})" + ("" if clutch else f" | {js('document.getElementById(\"flash\").textContent')}"))
    # the revs tip it between columns, the finger decides when it is clearly in one
    case("2nd at the limiter, up, drifting between 1st and 3rd", 2, 0.9, [(-1, 1), (-1, 0.2), (-0.6, -0.8)], 3)
    case("2nd at the limiter, straight up into 1st", 2, 0.9, [(-1, 1), (-1, -0.8)], 1)
    case("2nd, middling revs, up, drifting between 1st and 3rd", 2, 0.6, [(-1, 1), (-1, 0.2), (-0.6, -0.8)], 1)
    case("3rd, revs sagging, down, between 2nd and 4th", 3, 0.3, [(0, -1), (0, -0.2), (-0.4, 0.8)], 2)
    case("3rd, middling revs, down, between 2nd and 4th", 3, 0.6, [(0, -1), (0, -0.2), (-0.4, 0.8)], 4)
    # sloppy paths: corners cut
    case("2nd -> 3rd in one diagonal line", 2, 0.6, [(-1, 1), (0, -1)], 3)
    case("3rd -> 2nd in one diagonal line", 3, 0.6, [(0, -1), (-1, 1)], 2)
    case("4th -> 5th in one diagonal line", 4, 0.6, [(0, 1), (1, -1)], 5)
    case("neutral, standing, up and a bit off to the left", 0, 0, [(0, 0), (-0.75, -0.7)], 1)
    # no help without the finger going there
    case("2nd at the limiter, a short flick up (stays in the slot)", 2, 0.9, [(-1, 1), (-1, 0.6)], 2)
    case("2nd at the limiter, a pull the wrong way (left)", 2, 0.9, [(-1, 1), (-1.4, 1)], 2)
    case("neutral, grab off-centre and wiggle", 0, 0, [(-0.4, 0.4), (-0.45, 0.42), (-0.4, 0.38)], 0)
    case("2nd at the limiter, diagonal to 3rd, NO clutch", 2, 0.9, [(-1, 1), (0, -1)], 0, clutch=False)
    # broken 3rd: the revs point to 4th, the next one up
    js("brokenGears = [3]; buildGate()")
    case("broken 3rd: 2nd at the limiter, out and back down between 2nd and 4th", 2, 0.9, [(-1, 1), (-1, 0.2), (-0.6, 0.8)], 4)
    js("brokenGears = []; buildGate()")
    # mouse: exact, no assist (a diagonal drag stays on the rail between the columns)
    js("if (state !== 'running') { state = 'running'; rpm = engine.idle; }")
    js(f"({set_gear})(2, 0.6)"); pg.wait_for_timeout(80)
    c = pg.locator("#clutch").bounding_box(); f.start(1, c["x"] + c["width"] / 2, c["y"] + c["height"] / 2); pg.wait_for_timeout(200)
    x0, y0 = to_px(-1, 1); x1, y1 = to_px(-0.5, -0.8)
    pg.mouse.move(x0, y0); pg.mouse.down()
    for k in range(1, 21): pg.mouse.move(x0 + (x1 - x0) * k / 20, y0 + (y1 - y0) * k / 20); pg.wait_for_timeout(16)
    got = js("[gear, lever.x, lever.y]"); pg.mouse.up(); f.end(1)
    ok = got[0] == 0
    if not ok: fails.append("mouse")
    print(f"{'ok ' if ok else 'FAIL'} {'mouse: 2nd, diagonal to between 1st and 3rd':58} -> gear {got[0]} at ({got[1]:.2f}, {got[2]:.2f}) (want 0)")
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
