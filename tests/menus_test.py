"""The menus: the main menu is the main game's (NEW GAME without a save, else CONTINUE), STATS once a game has started
(never a word of the race before the reveal), SETTINGS (layout, the two volumes, HOW TO DRIVE, RESET PROGRESS once a
game has started), ARCADE (the other games), a small credits link with the full credits behind it. Over a game the
pause menu: RESUME, HOW TO DRIVE, END RUN (a run of the main game, after an "are you sure?"), EXIT TO MAIN MENU, from
where CONTINUE goes back to the paused run. SHARE copies the stats. On a phone every screen fits without scrolling."""
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
SCREENS = ["main", "pause", "arcade", "settings", "stats", "help", "credits", "win", "hello", "feedback", "thanks"]
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    ctx = b.new_context(viewport={"width": 1440, "height": 900}); ctx.grant_permissions(["clipboard-read", "clipboard-write"])
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e))); js = pg.evaluate
    pg.goto(URL); js("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(300)
    shown = lambda: js("[...document.querySelectorAll('#menu section:not([hidden]) button')].filter(b => !b.hidden && b.offsetParent).map(b => b.textContent.trim())")
    # 1. a first visit: NEW GAME, no stats, no reset; the first act's card tells you how to get going
    check("first visit: NEW GAME, SETTINGS, ARCADE, credits (no STATS)", shown() == ["NEW GAME", "SETTINGS", "ARCADE", "credits"], shown())
    pg.click('[data-show="settings"]')
    check("settings without a game: no RESET PROGRESS", "RESET PROGRESS" not in shown(), shown())
    pg.click("[data-back]:visible")
    pg.click("#continue"); pg.wait_for_timeout(300)
    got = js("[menuOpen, screen, $('act-no').textContent, $('act-name').textContent, $('act-text').textContent, getComputedStyle($('garage')).visibility]")
    check("NEW GAME: DRIVE's card, no act number (no word of acts to come), over the road (the garage hidden)", got[:4] == [True, "act", "", "DRIVE"]
          and "Drive as far as you can" in got[4] and got[5] == "hidden", got)
    check("its buttons: HOW TO DRIVE, CONTINUE", shown() == ["HOW TO DRIVE", "CONTINUE ▶"], shown())
    pg.screenshot(path=f"{OUT}/menus_act1.png")
    pg.click("#act-drive"); got = js("[screen, tour.id, $('tour-title').textContent]")
    check("HOW TO DRIVE: the Driving tutorial", got == ["tour", "driving", "START THE ENGINE"], got)
    pg.keyboard.press("Escape"); check("Esc: back to the card", js("screen") == "act", js("screen"))
    pg.click("#act-go"); pg.wait_for_timeout(100)
    got = js("[menuOpen, getComputedStyle($('garage')).visibility, $('act-title').textContent, $('report').textContent, progress.toured]")
    check("CONTINUE: the garage, GARAGE its title (no act yet); no run yet, no numbers; the card seen", got == [False, "visible", "GARAGE ▸", "", ["act1"]], got)
    # 2. a run, then the pause menu: END RUN is there; exit to the main menu and CONTINUE goes back to the same run
    js("Object.assign(progress.levels, { clutch: 1, gas: 1, shift: 1 }); refreshCar()"); pg.click("#drive")
    pg.wait_for_function("run.phase === 'run'", timeout=15000); pg.wait_for_timeout(500)
    pg.keyboard.press("Escape"); left = js("run.left")
    check("Esc mid-run: the pause menu, WHAT TO DO in it (no act yet)", shown() == ["RESUME ▶", "WHAT TO DO", "HOW TO DRIVE", "END RUN", "EXIT TO MAIN MENU"], shown())
    pg.click("#act-button"); got = js("[screen, $('act-name').textContent, $('act-go').textContent]")
    check("the act's button: its card, BACK to the pause menu", got == ["act", "DRIVE", "◀ BACK"], got)
    pg.click("#act-go"); check("BACK: the pause menu", js("[screen, menuOpen, run.phase]") == ["pause", True, "run"], js("[screen, menuOpen, run.phase]"))
    pg.click('[data-show="help"]')
    check("HOW TO DRIVE: the keys", "Space gas" in js("$('menu').innerText"), "")
    pg.click("[data-back]:visible")
    check("BACK: to the pause menu", js("screen") == "pause", js("screen"))
    pg.click("#to-main"); pg.wait_for_timeout(500)
    check("exit to the main menu: the run stays paused", js("[screen, run.phase, run.left]") == ["main", "run", left], js("[screen, run.phase, run.left]"))
    pg.click("#continue"); pg.wait_for_timeout(200)
    check("CONTINUE: back in the same run", js("[menuOpen, run.phase]") == [False, "run"] and js("run.left") < left, js("[menuOpen, run.phase, run.left]"))
    pg.keyboard.press("Escape")
    pg.once("dialog", lambda d: d.dismiss()); pg.click("#end-run"); pg.wait_for_timeout(100)
    check("END RUN, not sure: the run goes on (still paused)", js("[menuOpen, run.phase]") == [True, "run"], js("[menuOpen, run.phase]"))
    pg.once("dialog", lambda d: d.accept()); pg.click("#end-run"); pg.wait_for_timeout(100)
    check("END RUN, sure: the run ends as if the time ran out", js("[menuOpen, run.phase, progress.runs]") == [False, "finish", 1], js("[menuOpen, run.phase, progress.runs]"))
    pg.wait_for_function("run.phase === 'garage'", timeout=10000)
    got = js("[$('report').textContent, menuOpen]")
    check("the garage: the run in a line of numbers, no card (the first act's seen)", got[0].startswith("+") and " m" in got[0] and not got[1], got)
    pg.click("#act-title"); got = js("[menuOpen, screen, $('act-name').textContent, $('act-run').innerText, $('act-go').textContent]")
    check("the garage's title: the act's card, the run in full, CONTINUE", got[:3] == [True, "act", "DRIVE"] and "Last run" in got[3] and got[4] == "CONTINUE ▶", got)
    pg.click("#act-go"); check("CONTINUE: the garage", js("[menuOpen, getComputedStyle($('garage')).visibility]") == [False, "visible"], js("[menuOpen]"))
    # 3. STATS: now there, the first act's numbers only (nothing of the race), and SHARE copies them
    pg.keyboard.press("Escape"); pg.click("#to-main")
    check("a game started: CONTINUE and STATS", shown() == ["CONTINUE", "STATS", "SETTINGS", "ARCADE", "credits"], shown())
    pg.click("#to-stats")
    st = js("$('stats-list').innerText")
    check("STATS before the reveal: time, runs, best, driven; no race", all(k in st for k in ["Time played", "Runs", "Best run", "Distance driven"])
          and not any(k in st.lower() for k in ["race", "place", "fleet", "total"]), st.replace("\n", " | "))
    check("STATS: the build", js("document.querySelector('[data-screen=stats] .build').textContent").startswith("build "), js("document.querySelector('[data-screen=stats] .build').textContent"))
    pg.click('[data-screen="stats"] [data-share]'); pg.wait_for_timeout(300)
    clip = js("navigator.clipboard.readText()")
    check("SHARE: copied, the stats and the build, no race", "Copied" in js("document.querySelector('[data-screen=stats] .shared').textContent")
          and "Runs: 1" in clip and "build " in clip and "race" not in clip.lower(), clip.replace("\n", " | "))
    js("Object.assign(progress, { racing: true, finish: 40, races: 3 }); renderMenu()")
    check("after the reveal: races and best place too", "Races" in js("$('stats-list').innerText") and "P40" in js("$('stats-list').innerText"), js("$('stats-list').innerText").replace("\n", " | "))
    pg.click("[data-back]:visible")
    # 4. SETTINGS: the volumes (saved, and the car's sound bus follows), the layout, RESET PROGRESS
    pg.click('[data-show="settings"]')
    js("$('vol-car').value = 40; $('vol-car').dispatchEvent(new Event('input', { bubbles: true })); $('vol-music').value = 70; $('vol-music').dispatchEvent(new Event('input', { bubbles: true }))")
    got = js("({ saved: JSON.parse(localStorage.getItem('car-rev-settings')).volume, bus: carBus ? +carBus.gain.value.toFixed(2) : null, stereo: stereo.volume })")
    check("volumes: saved, the car's sounds at 40%, the music at 70%", got["saved"] == {"car": 0.4, "music": 0.7} and got["bus"] in (0.4, None) and got["stereo"] == 0.7, got)
    lay = js("$('layout').textContent"); pg.click("#layout")
    check("layout: auto -> touch", lay.startswith("auto") and js("[$('layout').textContent, document.body.classList.contains('touch')]") == ["touch", True], [lay, js("$('layout').textContent")])
    pg.click("#layout"); pg.click("#layout")  # touch -> desktop -> auto
    pg.once("dialog", lambda d: d.accept()); pg.click("#reset"); pg.wait_for_timeout(200)
    check("RESET PROGRESS: the save gone, the main menu, NEW GAME", js("[screen, progress.runs, playing]") == ["main", 0, False] and shown()[0] == "NEW GAME", js("[screen, progress.runs, playing]"))
    # 5. ARCADE: the other games, and they play
    pg.click('[data-show="arcade"]')
    check("ARCADE: Rev, Speed signs, Free drive (not the main game)", js("[...document.querySelectorAll('#game-list b')].map(b => b.textContent)") == ["Rev", "Speed signs", "Free drive"], "")
    pg.click('[data-play="free"]'); pg.wait_for_timeout(200)
    check("Free drive from ARCADE", js("[game.id, menuOpen]") == ["free", False], js("[game.id, menuOpen]"))
    pg.keyboard.press("Escape")
    check("pausing an arcade game: no END RUN", shown() == ["RESUME ▶", "HOW TO DRIVE", "EXIT TO MAIN MENU"], shown())
    # 6. the credits: a small link, the full credit behind it (CC BY 4.0: author, title, licence, changes)
    pg.click("#to-main"); pg.click('[data-show="credits"]')
    cr = js("document.querySelector('[data-screen=credits]').innerText")
    check("credits: the CC BY recording, its author, licence and the change", all(k in cr for k in ["Car Engine Start, Rev, Idle, Switch Off", "iainmccurdy", "CC BY 4.0", "cut and looped"]), "")
    pg.screenshot(path=f"{OUT}/menus_credits.png")
    # 7. the phone: every screen fits the screen held sideways, clear of the notch
    ph = b.new_context(viewport={"width": 852, "height": 393}, device_scale_factor=2, is_mobile=True, has_touch=True).new_page()
    ph.on("pageerror", lambda e: errors.append(str(e)))
    ph.goto(URL); ph.wait_for_timeout(300)
    ph.evaluate("localStorage.clear(); settings.layout = 'touch'; applyLayout(); Object.assign(progress, { runs: 30, best: 2400, driven: 60000, time: 1800, racing: true, finish: 1, races: 20, tanks: 1, totals: 40, levels: { fleet: 51 } }); 0")
    # the act cards with the longest run behind them: a race, dues, a refill, totals, the tank
    ph.evaluate("Object.assign(run, { gain: 23456, newBest: true, dues: 4567, refill: 900, totals: 4, scrap: 132, beatTank: true, race: { start: 3, p: 1, points: 110, fresh: 100 } }); 0")
    over = {}
    for s in SCREENS + [f"act {c}" for c in ph.evaluate("CARDS.map(c => c.id)")]:
        ph.evaluate(f"card = CARDS.find(c => c.id === '{s[4:]}'); showScreen('act'); 0" if s.startswith("act ") else f"showScreen('{s}'); 0"); ph.wait_for_timeout(80)
        r = ph.evaluate("(() => { const r = $('menu-panel').getBoundingClientRect(); return [r.top, r.bottom, $('menu').scrollHeight > $('menu').clientHeight]; })()")
        if r[0] < 0 or r[1] > 393 or r[2]: over[s] = r
        ph.screenshot(path=f"{OUT}/menus_phone_{s.replace(' ', '_')}.png")
    check("phone: every screen fits without scrolling", not over, over)
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
