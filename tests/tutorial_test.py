"""Tutorials (HOW TO DRIVE): a list, then a step a page with the real control lit up behind the menu, the card clear
of it. Every page of Driving on a desktop and on the phone (its own words there: a touch, not keys): the light round
the right control, the card not over it. ◀ ▶, the arrow keys, Space and a swipe turn the pages; DONE and Esc go back
to the list; over a run the menu stays up, the run paused."""
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
# the page now: its title, the light's box, the control's and the card's, and whether the light is round the control
# and clear of the card
PAGE = """() => { const p = TUTORIALS[0].pages[tour.page], box = e => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; };
  const s = box($('spot')), c = box(document.querySelector(p.at)), k = box($('menu-panel'));
  const round = s[0] <= c[0] && s[1] <= c[1] && s[2] >= c[2] && s[3] >= c[3];
  const clear = Math.min(k[2], s[2]) <= Math.max(k[0], s[0]) || Math.min(k[3], s[3]) <= Math.max(k[1], s[1]);
  return { title: $('tour-title').textContent, text: $('tour-text').textContent, lit: $('spot').classList.contains('lit'), round, clear,
           at: p.at, name: $('tour-name').textContent }; }"""
def walk(js, label):
    """Every page of Driving: lit, round its control, clear of the card; the last one says DONE."""
    bad, titles = [], []
    for i in range(js("TUTORIALS[0].pages.length")):
        got = js(f"(() => {{ tour.page = {i}; renderTour(); return ({PAGE})(); }})()")
        titles.append(got["title"])
        if not (got["lit"] and got["round"] and got["clear"]): bad.append(got)
    check(f"{label}: every page lights its control, the card clear of it", not bad, bad or titles)
    check(f"{label}: the last page says DONE", js("$('tour-next').textContent") == "DONE", js("$('tour-next').textContent"))
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errors.append(str(e))); js = pg.evaluate
    pg.goto(URL); js("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(300)
    # 1. HOW TO DRIVE: the list, the controls under it
    pg.click('[data-show="settings"]'); pg.click('[data-show="help"]:visible')
    got = js("[[...document.querySelectorAll('#tutorials button')].map(b => b.textContent), $('menu').innerText.includes('Space gas')]")
    check("HOW TO DRIVE: the tutorials (DRIVING), the controls under them", got == [["DRIVING"], True], got)
    # 2. the first page: the key lit up, the words for keys and mouse
    pg.click('[data-tour="driving"]'); pg.wait_for_timeout(200)
    got = js(f"({PAGE})()")
    check("DRIVING, page 1: START THE ENGINE, the key lit, the card clear of it", got["title"] == "START THE ENGINE" and got["lit"] and got["round"]
          and got["clear"] and got["name"] == "DRIVING · 1 OF 8", got)
    check("the words for keys and mouse", "Enter" in got["text"], got["text"])
    check("◀ is off on the first page", js("$('tour-prev').disabled"), js("$('tour-prev').disabled"))
    pg.screenshot(path=f"{OUT}/tutorial_desktop_key.png")
    # 3. turning the pages: → , Space, ← , the buttons
    pg.keyboard.press("ArrowRight"); t1 = js("$('tour-title').textContent")
    pg.keyboard.press(" "); t2 = js("$('tour-title').textContent")
    pg.keyboard.press("ArrowLeft"); t3 = js("$('tour-title').textContent")
    pg.click("#tour-next"); t4 = js("$('tour-title').textContent")
    pg.click("#tour-prev"); t5 = js("$('tour-title').textContent")
    check("→, Space, ←, ▶, ◀ turn the pages", [t1, t2, t3, t4, t5] == ["CLUTCH DOWN", "INTO 1ST", "CLUTCH DOWN", "INTO 1ST", "CLUTCH DOWN"], [t1, t2, t3, t4, t5])
    pg.screenshot(path=f"{OUT}/tutorial_desktop_clutch.png")
    walk(js, "desktop")
    pg.click("#tour-next"); pg.wait_for_timeout(100)
    check("DONE: back to the list, the menu still up", js("[screen, menuOpen, $('spot').offsetParent === null]") == ["help", True, True], js("[screen, menuOpen]"))
    pg.click('[data-tour="driving"]'); pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
    check("Esc: back to the list, the menu still up", js("[screen, menuOpen]") == ["help", True], js("[screen, menuOpen]"))
    # 4. over a run: the pause menu's HOW TO DRIVE, the run stays paused
    pg.click("[data-back]:visible"); pg.click("[data-back]:visible"); pg.click('[data-play="distance"]'); pg.wait_for_timeout(200)
    js("Object.assign(progress.levels, { clutch: 1, gas: 1, shift: 1 }); refreshCar()"); pg.click("#drive")
    pg.wait_for_function("run.phase === 'run'", timeout=15000); pg.keyboard.press("Escape"); left = js("run.left")
    pg.click('[data-show="help"]:visible'); pg.click('[data-tour="driving"]'); pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(500)
    check("over a run: the tutorial, the run paused", js("[screen, menuOpen, run.phase, run.left]") == ["tour", True, "run", left], js("[screen, menuOpen, run.phase, run.left]"))
    pg.screenshot(path=f"{OUT}/tutorial_desktop_run.png")
    # 5. the phone: its own words, every page clear, a swipe turns the page
    ctx = b.new_context(viewport={"width": 844, "height": 390}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ph = ctx.new_page(); ph.on("pageerror", lambda e: errors.append(str(e))); pj = ph.evaluate
    cdp = ctx.new_cdp_session(ph); cdp.send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
    ph.goto(URL); pj("localStorage.clear(); settings.layout = 'touch'; applyLayout()"); ph.wait_for_timeout(300)
    ph.tap('[data-show="settings"]'); ph.tap('[data-show="help"]:visible'); ph.tap('[data-tour="driving"]'); ph.wait_for_timeout(200)
    got = pj(f"({PAGE})()")
    check("phone, page 1: a touch's words, the key lit, the card clear", "Turn the key" in got["text"] and got["lit"] and got["round"] and got["clear"], got)
    ph.screenshot(path=f"{OUT}/tutorial_phone_key.png")
    def swipe(way):  # across the middle of the card, wherever it is now (it moves out of each control's way)
        k = pj("(() => { const r = $('menu-panel').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.4, r.width * 0.3]; })()")
        steps = [k[0] - way * k[2] / 2 + way * k[2] * i / 4 for i in range(5)]
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": steps[0], "y": k[1], "id": 1}]})
        for x in steps[1:]: cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": k[1], "id": 1}]})
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": [{"x": steps[-1], "y": k[1], "id": 1}]}); ph.wait_for_timeout(150)
    swipe(-1); a = pj("$('tour-title').textContent"); swipe(1); bk = pj("$('tour-title').textContent")
    check("phone: a swipe left, the next page; right, back", [a, bk] == ["CLUTCH DOWN", "START THE ENGINE"], [a, bk])
    pj("tour.page = 1; renderTour()"); ph.screenshot(path=f"{OUT}/tutorial_phone_clutch.png")
    pj("tour.page = 5; renderTour()"); ph.screenshot(path=f"{OUT}/tutorial_phone_tach.png")
    pj("tour.page = 6; renderTour()"); ph.screenshot(path=f"{OUT}/tutorial_phone_wheel.png")
    walk(pj, "phone")
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
