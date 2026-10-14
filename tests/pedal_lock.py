"""A pedal must never lock up: a pointer the browser loses track of (no pointerup/cancel arrives, or capture fails)
must not keep a control from being pressed again."""
from playwright.sync_api import sync_playwright
from common import URL, launch
errors = []
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    ctx = b.new_context(viewport={"width": 844, "height": 390}, is_mobile=True, has_touch=True); pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
    cdp = ctx.new_cdp_session(pg); cdp.send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
    pg.goto(URL); pg.wait_for_timeout(300); js = pg.evaluate
    pg.tap('[data-show="arcade"]'); pg.tap('[data-play="free"]'); pg.wait_for_timeout(200); js("startEngine()"); pg.wait_for_timeout(1800)
    g = pg.locator("#gas").bounding_box(); x, y = g["x"] + g["width"] / 2, g["y"] + g["height"] / 2
    def press(label):
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y, "id": 7}]}); pg.wait_for_timeout(200)
        held = js("+gasPedal.toFixed(2)")
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": [{"x": x, "y": y, "id": 7}]}); pg.wait_for_timeout(300)
        print(f"{label:62} gas while touched {held}, after {js('+gasPedal.toFixed(2)')}"); return held
    ok = press("a normal touch") == 1
    # 1. a touch whose pointerdown arrives after the finger is gone: setPointerCapture throws
    js("$('gas').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 4242, pointerType: 'touch', clientY: 300, bubbles: true }))")
    ok &= press("after a pointerdown for a pointer that's already gone") == 1
    # 2. a touch that never reports its end (no pointerup, no pointercancel)
    js("""(() => { const el = $('gas'), real = el.setPointerCapture; el.setPointerCapture = () => {};
          el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 4343, pointerType: 'touch', clientY: 300, bubbles: true }));
          el.setPointerCapture = real; })()""")
    ok &= press("after a touch that never ended") == 1
    # 3. capture lost mid-press (the browser takes the pointer away)
    js("$('gas').dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 4343, pointerType: 'touch', bubbles: true }))")
    ok &= press("after a lostpointercapture") == 1
    print("PEDAL:", "ok" if ok else "LOCKED")
    b.close()
print("ERRORS:", errors or "none")
