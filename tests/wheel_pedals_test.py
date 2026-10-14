"""Grab-to-steer wheel (mouse and finger) and the touch pedals: a finger floors a pedal, sliding up eases it off."""
import math
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
errors = []

class Fingers:  # touchStart / touchMove list every finger down; a touchEnd lists the finger that lifts
    def __init__(self, cdp): self.cdp, self.down = cdp, {}
    def _send(self, kind): self.cdp.send("Input.dispatchTouchEvent", {"type": kind, "touchPoints": [
        {"x": x, "y": y, "id": i, "radiusX": 6, "radiusY": 6} for i, (x, y) in self.down.items()]})
    def start(self, i, x, y): self.down[i] = (x, y); self._send("touchStart")
    def move(self, i, x, y): self.down[i] = (x, y); self._send("touchMove")
    def end(self, i):
        x, y = self.down.pop(i); self.cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": [{"x": x, "y": y, "id": i}]})

def rim(pg, deg):  # screen point on the rim at deg from the top (clockwise +)
    bb = pg.locator("#wheel").bounding_box(); a = math.radians(deg)
    return bb["x"] + (500 + 500 * math.sin(a)) / 1000 * bb["width"], bb["y"] + (560 - 500 * math.cos(a)) / 300 * bb["height"]

lanes = "({ lane, carX: +carX.toFixed(2), held: wheel.held, angle: Math.round(wheel.angle), steer: Math.round(steer) })"
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    # ---- mouse ----
    pg = b.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL); js = pg.evaluate; m = pg.mouse; kb = pg.keyboard
    pg.click('[data-show="arcade"]'); pg.click('[data-play="free"]'); kb.press("Enter"); pg.wait_for_timeout(1800)
    js("gear = 4; lever.x = 0; lever.y = 1; speed = 100 / 3.6; locked = false; traffic.forEach(c => { c.dir = -1; c.x = LANES.oncoming[0]; })")
    kb.down(" ")
    print("rim top is the grip:", js(f"document.elementFromPoint({rim(pg, 0)[0]}, {rim(pg, 0)[1]})?.id"))
    def turn(deg, hold_ms=0):
        m.move(*rim(pg, 0)); m.down()
        for k in range(1, 11): m.move(*rim(pg, deg * k / 10)); pg.wait_for_timeout(15)
        pg.wait_for_timeout(hold_ms); r = js(lanes); m.up(); return r
    print("turn left 40°, while held:", turn(-40, 300)); pg.wait_for_timeout(1500); print("  after letting go:", js(lanes))
    print("nudge right 20°:", turn(20)); pg.wait_for_timeout(1000); print("  after:", js(lanes))
    print("turn right 45°:", turn(45)); pg.wait_for_timeout(1500); print("  after:", js(lanes))
    m.move(700, 300); m.down(); m.move(600, 300, steps=6); m.up(); pg.wait_for_timeout(800)
    print("drag on the road (should do nothing now):", js(lanes))
    kb.up(" "); kb.press("Escape"); pg.click("#to-main"); pg.click('[data-show="arcade"]'); pg.click('[data-play="rev"]'); pg.wait_for_timeout(200)
    print("rev, turn left 40°:", turn(-40)); pg.wait_for_timeout(300); print("  parked:", js("({ lane, carX })"))
    pg.close()
    # ---- touch ----
    ctx = b.new_context(viewport={"width": 844, "height": 390}, device_scale_factor=3, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e))); js = pg.evaluate
    cdp = ctx.new_cdp_session(pg); cdp.send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
    pg.goto(URL); pg.wait_for_timeout(300); pg.tap('[data-show="arcade"]'); pg.tap('[data-play="free"]'); pg.wait_for_timeout(300)
    f = Fingers(cdp)
    js("startEngine()"); pg.wait_for_timeout(1800)
    def pedal(id_):  # middle of the pedal, and the pedal box's height (full travel)
        bb = pg.locator(f"#{id_}").bounding_box(); pb = pg.locator(f"#{id_}").locator("..").bounding_box()
        return bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2, pb["height"]
    gx, gy, gh = pedal("gas")
    f.start(3, gx, gy); pg.wait_for_timeout(100); print("finger on the gas:", js("gasPedal.toFixed(2)"))
    f.move(3, gx, gy - gh / 2); pg.wait_for_timeout(100); print("slid up half the travel:", js("gasPedal.toFixed(2)"))
    f.move(3, gx, gy + 40); pg.wait_for_timeout(100); print("slid down past where it landed:", js("gasPedal.toFixed(2)"))
    f.end(3); pg.wait_for_timeout(300); print("lifted:", js("gasPedal.toFixed(2)"))
    # a launch: clutch in, 1st, gas floored, clutch eased out by sliding up
    def gate(gx_, gy_):
        bb = pg.locator("#shifter").bounding_box(); return bb["x"] + (gx_ + 1.6) / 3.2 * bb["width"], bb["y"] + (gy_ + 1.75) / 3.5 * bb["height"]
    cx, cy, ch = pedal("clutch")
    f.start(1, cx, cy); pg.wait_for_timeout(100)
    pts = [(0, 0), (-1, 0), (-1, -1)]; f.start(2, *gate(*pts[0]))
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        for k in range(1, 9): f.move(2, *gate(x0 + (x1 - x0) * k / 8, y0 + (y1 - y0) * k / 8)); pg.wait_for_timeout(12)
    f.end(2); f.start(3, gx, gy); pg.wait_for_timeout(400)
    for k in range(1, 21): f.move(1, cx, cy - ch * k / 20); pg.wait_for_timeout(60)
    pg.wait_for_timeout(1500)
    print("launch by sliding the clutch finger up:", js("({ gear, kmh: Math.round(speed * 3.6), clutch: +clutchPedal.toFixed(2), gas: +gasPedal.toFixed(2), state })"))
    f.end(1)
    print("phone: rim top is the grip:", js(f"document.elementFromPoint({rim(pg, 0)[0]}, {rim(pg, 0)[1]})?.id"))
    f.start(4, *rim(pg, 0))
    for k in range(1, 11): f.move(4, *rim(pg, -40 * k / 10)); pg.wait_for_timeout(15)
    f.end(4); pg.wait_for_timeout(1500); print("finger turned the wheel left:", js(lanes))
    pg.screenshot(path=f"{OUT}/wheel_phone.png")
    b.close()
print("ERRORS:", errors or "none")
