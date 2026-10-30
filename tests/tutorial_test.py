"""Tutorials (HOW TO DRIVE): a list, then a step a page with the real control lit up behind the menu, as it is in the
cockpit (the pedals once stood on end), the card clear of it. Every page of Driving on a desktop and on the phone
(its own words there: a touch, not keys): the light round the right control, the card not over it. ◀ ▶, the arrow
keys, Space and a swipe turn the pages; DONE and Esc go back to the list; over a run the menu stays up, the run
paused. Nothing locked is named: a control's keys, and the Music setting, only once the car has it; a later act's
upgrade, or a page's parts, only once there."""
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
# the page now: its title, the light's box, the control's and the card's, and whether the light is round the control
# and clear of the card
PAGE = """() => { const p = tutorial('driving').pages[tour.page], box = e => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; };
  const s = box($('spot')), c = box(document.querySelector(p.at)), k = box($('menu-panel'));
  const round = s[0] <= c[0] && s[1] <= c[1] && s[2] >= c[2] && s[3] >= c[3];
  const clear = Math.min(k[2], s[2]) <= Math.max(k[0], s[0]) || Math.min(k[3], s[3]) <= Math.max(k[1], s[1]);
  return { title: $('tour-title').textContent, text: $('tour-text').textContent, lit: $('spot').classList.contains('lit'), round, clear,
           at: p.at, name: $('tour-name').textContent }; }"""
LOCKED = "['flash', 'stalk', 'nitro', 'fire', 'tape'].filter(w => document.querySelector('[data-screen=help]').innerText.toLowerCase().includes(w))"
def walk(js, label):
    """Every page of Driving: lit, round its control, clear of the card; the last one says DONE."""
    bad, titles = [], []
    for i in range(js("tutorial('driving').pages.length")):
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
    pg.click('[data-show="settings"]')
    check("a new game, SETTINGS: no Music (no stereo yet)", "Music" not in js("document.querySelector('[data-screen=settings]').innerText"), "")
    pg.click('[data-show="help"]:visible')
    got = js("[[...document.querySelectorAll('#tutorials button')].map(b => b.textContent), $('menu').innerText.includes('Space gas')]")
    check("HOW TO DRIVE: the tutorials (DRIVING), the controls under them", got == [["DRIVING"], True], got)
    named = js(LOCKED)
    check("a new game, the keys: no flash, nitro, guns or tapes", not named, named)
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
    js("Object.assign(progress, { toured: ['act1'], runs: 1 })")  # the first act's card seen (menus_test), a game under way
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
    cdp.send("Emulation.setSafeAreaInsetsOverride", {"insets": {"left": 59, "right": 59, "bottom": 21, "top": 0}})  # the iPhone's notch
    ph.goto(URL); pj("localStorage.clear(); settings.layout = 'touch'; applyLayout()"); ph.wait_for_timeout(300)
    ph.tap('[data-show="settings"]'); ph.tap('[data-show="help"]:visible')
    named = pj(LOCKED)
    check("a new game, the phone's controls: no stalk to flash with", not named and "Lanes" in pj("document.querySelector('[data-screen=help]').innerText"), named)
    ph.tap('[data-tour="driving"]'); ph.wait_for_timeout(200)
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
    # 6. a system's tutorial: popped up once when bought (on the phone, in the garage), its control lit; the card's ?
    #    opens it again (once bought), and HOW TO DRIVE lists it. A save set up with systems pops nothing up
    pj("localStorage.clear(); Object.assign(progress, { bank: 9e6, runs: 3, levels: { clutch: 1, workshopTab: 1 } }); closeMenu()")
    ph.tap('[data-play="distance"]') if pj("menuOpen") else None; ph.wait_for_timeout(200)
    pj("play(DISTANCE); closeMenu(); renderGarage()"); ph.wait_for_timeout(200)
    check("a save with an aid bought before: nothing pops up", pj("menuOpen") is False, pj("[menuOpen, screen]"))
    pj("document.querySelector('[data-buy=\"flash\"]').click()"); ph.wait_for_timeout(200)
    got = pj("[menuOpen, screen, tour.popup, $('tour-title').textContent, $('spot').classList.contains('lit'), progress.toured]")
    check("bought: its tutorial pops up, the stalk lit", got[:5] == [True, "tour", True, "FLASH", True] and got[5] == ["driving", "flash"], got)  # Driving: read from the list above
    ph.screenshot(path=f"{OUT}/tutorial_phone_flash.png")
    pj("$('tour-next').click()"); ph.wait_for_timeout(100)
    check("DONE: back in the garage", pj("[menuOpen, run.phase]") == [False, "garage"], pj("[menuOpen, run.phase]"))
    pj("document.querySelector('[data-buy=\"flash\"]').click()"); ph.wait_for_timeout(200)
    check("the next level: no pop-up (once)", pj("menuOpen") is False, pj("[menuOpen, screen]"))
    pj("document.querySelector('.card .tip[data-tour=\"flash\"]').click()"); ph.wait_for_timeout(200)
    check("the card's ?: its tutorial again", pj("[menuOpen, screen, $('tour-title').textContent]") == [True, "tour", "FLASH"], pj("[menuOpen, screen, $('tour-title').textContent]"))
    pj("$('tour-back').click()"); ph.wait_for_timeout(100)
    check("BACK: back in the garage", pj("menuOpen") is False, pj("menuOpen"))
    tips = pj("[...document.querySelectorAll('#cards .tip')].map(b => b.dataset.tour)")
    check("a ? only on bought cards with a tutorial (the Workshop: the flash)", tips == ["flash"], tips)
    ph.screenshot(path=f"{OUT}/tutorial_phone_garage_tips.png")
    pj("openMenu('help')")
    check("HOW TO DRIVE: Driving, then the systems you have", pj("[...document.querySelectorAll('#tutorials button')].map(b => b.textContent)")
          == ["DRIVING", "HEADLIGHT FLASH", "DRIVER AIDS"], pj("[...document.querySelectorAll('#tutorials button')].map(b => b.textContent)"))
    pj("closeMenu()")
    # 7. what a run brings (here, the reveal and the first total at once): the acts' cards first, then the tutorials,
    # one at a time, each once
    pj("markTours(); Object.assign(progress, { racing: true, totals: 1, levels: { ...progress.levels, fleet: 1 } }); popTour()"); ph.wait_for_timeout(100)
    seen = []
    while pj("menuOpen") and len(seen) < 10:
        seen.append(pj("screen === 'act' ? $('act-name').textContent : $('tour-name').textContent.split(' · ')[0]"))
        pj("screen === 'act' ? closeCard() : exitTour()"); ph.wait_for_timeout(50)
    check("a run brings several: the cards, then the tutorials, each in turn", seen == ["RACE", "WAR", "THE RACE", "THE CREW",
          "THE WAR RIG", "POLICE HEAT"], seen)
    toured = pj("progress.toured")
    check("all of them shown once", sorted(toured) == ["act2", "act4", "driving", "flash", "fleet", "police", "race", "warrig"], toured)
    # 8. every system's page: lit round its control (shown for the page if the garage hides it), the card clear
    for name, pjs, page in [("phone", pj, ph), ("desktop", js, pg)]:
        pjs("Object.assign(progress, { racing: true, totals: 1, levels: { clutch: 1, cruise: 1, flash: 5, autoflash: 1, stereo: 1, reckless: 1, chicken: 1, "
            "ecuRev: 1, nitro: 1, fleet: 51, pack: 1, guns: 1, autogun: 1, baddrivers: 1, hunter: 1 }, nitro: 0 }); if (game !== DISTANCE) play(DISTANCE); refreshCar()")
        bad = pjs("""(() => { const out = [];
          const box = e => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; };
          for (const t of TUTORIALS.filter(t => t.pages && t.id !== 'driving')) { closeMenu();
            const was = new Map(pagesOf(t).filter(p => p.at).map(p => [p.at, document.querySelector(p.at).getClientRects().length ? box(document.querySelector(p.at)) : null]));
            openTour(t.id); pagesOf(t).forEach((p, i) => { tour.page = i; renderTour(); if (!p.at) return;
            const s = box($('spot')), c = box(document.querySelector(p.at)), k = box($('menu-panel'));
            const kept = !was.get(p.at) || c.every((v, j) => Math.abs(v - was.get(p.at)[j]) < 1); // on screen: where it was
            const round = s[0] <= c[0] && s[1] <= c[1] && s[2] >= c[2] && s[3] >= c[3] && $('spot').classList.contains('lit');
            const covered = getComputedStyle($('garage')).visibility !== 'hidden' && (() => { const g = $('garage').getBoundingClientRect();
              return Math.min(g.right, c[2]) > Math.max(g.left, c[0]) && Math.min(g.bottom, c[3]) > Math.max(g.top, c[1]); })();
            const clear = Math.min(k[2], s[2]) <= Math.max(k[0], s[0]) || Math.min(k[3], s[3]) <= Math.max(k[1], s[1]);
            if (!round || !clear || covered || !kept) out.push([t.id, p.title, round, clear, !covered, kept]); }); closeMenu(); }
          return out; })()""")
        check(f"{name}: every system page lights its control, as it is in the cockpit, the card clear of it, the garage not over it", not bad, bad)
    pj("openTour('warrig'); tour.page = 0; renderTour()"); ph.wait_for_timeout(100); ph.screenshot(path=f"{OUT}/tutorial_phone_reticle.png")
    pj("openTour('fleet'); tour.page = 1; renderTour()"); ph.wait_for_timeout(100); ph.screenshot(path=f"{OUT}/tutorial_phone_sonar.png")
    pj("closeMenu()"); ph.wait_for_timeout(100)
    check("closed: the sonar and the reticle hidden again in the garage", pj("[getComputedStyle($('sonar')).display, getComputedStyle($('ar')).display]") == ["none", "none"],
          pj("[getComputedStyle($('sonar')).display, getComputedStyle($('ar')).display]"))
    # 9. bought, their keys and the Music setting; the aids' pages name Hunter only once bought, the War Rig's the page's
    #    parts only once the page is open (it opens with the first car totaled, after its tutorial has popped up)
    js("closeMenu(); openMenu('help')"); got = js("document.querySelector('[data-screen=help]').innerText")
    check("all bought: their keys", "change lanes · F flash · N nitro · G fire · M next tape · 1–3 engine" in got, got[:160])
    js("showScreen('settings')"); check("... and Music in SETTINGS", "Music" in js("document.querySelector('[data-screen=settings]').innerText"), "")
    got = js("""(() => { closeMenu(); Object.assign(progress, { totals: 0, gang: true, levels: { cruise: 1, reckless: 1, recklessCruise: 1, fleet: 51 } });
      const words = id => pagesOf(tutorial(id)).map(p => `${p.title} ${p.both ?? ''}`).join(' ');
      const before = [arOn(), gangOpen(), words('aids'), words('warrig')]; progress.totals = 1; return [...before, words('warrig')]; })()""")
    check("Reckless auto-drive bought, Hunter not: the aids' pages don't name it", "RECKLESS AUTO-DRIVE" in got[2] and "Hunter" not in got[2]
          and "reticle" not in got[2], got[2])
    check("the War Rig's tutorial: the page's parts only once it is open", got[:2] == [True, False] and "guns" not in got[3] and "guns" in got[4],
          [got[:2], got[3][-60:], got[4][-60:]])
    # 10. the first run of a first game: the DRIVE card, then Driving pops up by itself, the run paused behind it; DONE:
    #     the run goes on. After RESET PROGRESS (you have driven before) the card, then straight into the run
    fg = b.new_page(viewport={"width": 1440, "height": 900}); fg.on("pageerror", lambda e: errors.append(str(e))); fj = fg.evaluate
    fg.goto(URL); fj("localStorage.clear()"); fg.reload(); fg.wait_for_timeout(300)
    NOW = "[screen, menuOpen, run.phase, screen === 'tour' && [tour.id, tour.popup, $('tour-title').textContent]]"
    fg.click('[data-play="distance"]'); fg.wait_for_timeout(300); fg.click("#act-go"); fg.wait_for_timeout(200)
    got = fj(NOW); check("a first game: the DRIVE card, then Driving pops up, its first page, the run paused", got == ["tour", True, "starting", ["driving", True, "START THE ENGINE"]], got)
    for _ in range(8): fg.click("#tour-next")
    fg.wait_for_function("run.phase === 'run'", timeout=15000)
    check("DONE: the run goes on; seen", fj("[menuOpen, progress.toured]") == [False, ["act1", "driving"]], fj("[menuOpen, progress.toured]"))
    fj("run.left = 0.05"); fg.wait_for_function("run.phase === 'garage'", timeout=15000)  # the first run over: RESET PROGRESS is there
    fg.keyboard.press("Escape"); fg.click("#to-main"); fg.click('[data-show="settings"]'); fg.once("dialog", lambda d: d.accept()); fg.click("#reset")
    check("RESET PROGRESS: Driving counts as seen", fj("[progress.runs, progress.toured]") == [0, ["driving"]], fj("[progress.runs, progress.toured]"))
    fg.click('[data-play="distance"]'); fg.wait_for_timeout(300); fg.click("#act-go"); fg.wait_for_timeout(200)
    got = fj(NOW); check("after it, a new game: the DRIVE card, then the run, no tutorial", not got[1] and got[2] in ("starting", "countdown"), got)
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
