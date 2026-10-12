"""Touch layout on an emulated phone held sideways, driven with several fingers at once (CDP touch events)."""
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
errors = []
def rim(pg, deg):  # screen point on the steering wheel's rim, deg from the top (clockwise +)
    import math
    bb = pg.locator("#wheel").bounding_box(); a = math.radians(deg)
    return bb["x"] + (500 + 500 * math.sin(a)) / 1000 * bb["width"], bb["y"] + (560 - 500 * math.cos(a)) / 300 * bb["height"]

class Fingers:  # touchStart / touchMove list every finger down
    def __init__(self, cdp): self.cdp, self.down = cdp, {}
    def _send(self, kind): self.cdp.send("Input.dispatchTouchEvent", {"type": kind, "touchPoints": [
        {"x": x, "y": y, "id": i, "radiusX": 6, "radiusY": 6} for i, (x, y) in self.down.items()]})
    def start(self, i, x, y): self.down[i] = (x, y); self._send("touchStart")
    def move(self, i, x, y): self.down[i] = (x, y); self._send("touchMove")
    def end(self, i):  # a touchEnd lists the finger that lifts
        x, y = self.down.pop(i)
        self.cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": [{"x": x, "y": y, "id": i}]})

with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    ctx = b.new_context(viewport={"width": 844, "height": 390}, device_scale_factor=3, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
    cdp = ctx.new_cdp_session(pg); cdp.send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
    pg.goto(URL); js = pg.evaluate; pg.wait_for_timeout(400)
    print("detected:", js("({ coarse: matchMedia('(pointer: coarse)').matches, points: navigator.maxTouchPoints, touchDevice, layout: document.body.classList.contains('touch') })"))
    pg.screenshot(path=f"{OUT}/t_menu.png")
    pg.tap('[data-play="free"]'); pg.wait_for_timeout(300)
    f = Fingers(cdp)
    st = lambda: js("({ state, gear, kmh: Math.round(speed * 3.6), rpm: Math.round(rpm), clutch: +clutchPedal.toFixed(2), gas: +gasPedal.toFixed(2), brake: +brakePedal.toFixed(2), lane, lever: [lever.x, +lever.y.toFixed(2)] })")
    box = lambda sel: pg.locator(sel).bounding_box()
    landed = {}  # a finger floors a pedal where it lands; sliding up eases it off by the pedal box's height
    def pedal_at(id_, depth):
        bb = box(f"#{id_}"); pb = pg.locator(f"#{id_}").locator("..").bounding_box()
        x, y = landed.setdefault(id_, (bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2))
        return x, y - (1 - depth) * pb["height"]
    def gate(gx, gy):
        bb = box("#shifter"); return bb["x"] + (gx + 1.6) / 3.2 * bb["width"], bb["y"] + (gy + 1.75) / 3.5 * bb["height"]
    def lever_path(i, pts):
        f.start(i, *gate(*pts[0]))
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            for k in range(1, 9): f.move(i, *gate(x0 + (x1 - x0) * k / 8, y0 + (y1 - y0) * k / 8)); pg.wait_for_timeout(12)
        f.end(i)

    # key: finger turns it to START and holds
    kb = box("#ignition"); import math
    kx = lambda a: (kb["x"] + (65 + 30 * math.sin(math.radians(a))) * kb["width"] / 150, kb["y"] + (70 - 30 * math.cos(math.radians(a))) * kb["height"] / 110)
    f.start(1, *kx(-35))
    for a in range(-35, 91, 12): f.move(1, *kx(a)); pg.wait_for_timeout(15)
    pg.wait_for_timeout(1500); f.end(1); pg.wait_for_timeout(300); print("key held by a finger:", st())

    f.start(1, *pedal_at("clutch", 0.95)); pg.wait_for_timeout(150)          # finger 1 holds the clutch down
    lever_path(2, [(0, 0), (-1, 0), (-1, -1)])                              # finger 2 into 1st
    print("clutch held, 1st:", st())
    f.start(3, *pedal_at("gas", 1)); f.move(3, *pedal_at("gas", 0.45)); pg.wait_for_timeout(300)            # finger 3 on the gas, about half
    for k in range(1, 21): f.move(1, *pedal_at("clutch", 0.95 - 0.95 * k / 20)); pg.wait_for_timeout(60)  # ease the clutch up
    f.end(1); landed.pop("clutch"); f.move(3, *pedal_at("gas", 1)); pg.wait_for_timeout(2500)
    print("launched (clutch let go, gas held low):", st())
    pg.screenshot(path=f"{OUT}/t_drive.png")
    f.start(1, *pedal_at("clutch", 0.95)); pg.wait_for_timeout(150); lever_path(2, [(-1, -1), (-1, 1)])
    for k in range(1, 11): f.move(1, *pedal_at("clutch", 0.95 - 0.95 * k / 10)); pg.wait_for_timeout(50)
    f.end(1); pg.wait_for_timeout(1500); print("2nd, three fingers:", st())
    f.start(4, *rim(pg, 0))
    for k in range(1, 11): f.move(4, *rim(pg, -4 * k)); pg.wait_for_timeout(15)
    f.end(4); pg.wait_for_timeout(1200)
    print("turned the wheel left, gas still held:", st())
    f.end(3); pg.wait_for_timeout(400); print("gas finger lifted (springs back):", st())
    pg.tap("#menu-button"); pg.wait_for_timeout(200); pg.tap('[data-play="distance"]'); pg.wait_for_timeout(300)
    pg.screenshot(path=f"{OUT}/t_garage.png")
    print("garage fits:", js("[document.getElementById('garage').scrollHeight, document.getElementById('garage').clientHeight]"))
    pg.set_viewport_size({"width": 390, "height": 844}); pg.wait_for_timeout(200); pg.screenshot(path=f"{OUT}/t_portrait.png")
    print("portrait overlay shown:", js("getComputedStyle(document.getElementById('rotate')).display"))
    ctx.close()
    tab = b.new_context(viewport={"width": 1180, "height": 820}, device_scale_factor=2, is_mobile=True, has_touch=True).new_page()
    tab.context.new_cdp_session(tab).send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
    tab.goto(URL); tab.wait_for_timeout(300); tab.tap('[data-play="signs"]'); tab.wait_for_timeout(300); tab.screenshot(path=f"{OUT}/t_tablet.png")
    b.close()
print("ERRORS:", errors or "none")
