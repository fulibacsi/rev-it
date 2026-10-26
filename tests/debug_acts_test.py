"""Debug mode's acts: a row in the main menu's corner (debug mode only) sets the debug game to an act's start, so an act
can be tested without playing the ones before it. The pages before it are bought out as the upgrade graph allows,
everything of the act's own and later is gone, and the act's card pops up as it does in play. Act I is a new game.
The real save is never touched."""
import json
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
REAL = {"bank": 1234, "runs": 3, "best": 900, "levels": {"workshopTab": 1, "power": 2}}
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    ctx = b.new_context(viewport={"width": 844, "height": 390}, has_touch=True, is_mobile=True); pg = ctx.new_page(); js = pg.evaluate
    pg.on("pageerror", lambda e: errors.append(str(e))); pg.on("dialog", lambda d: d.accept())
    pg.goto(URL); js(f"localStorage.clear(); localStorage.setItem('car-rev-incremental', '{json.dumps(REAL)}')"); pg.reload(); pg.wait_for_timeout(300)
    real = lambda: json.loads(js("localStorage.getItem('car-rev-incremental')"))
    box = lambda sel: js(f"(() => {{ const r = document.querySelector('{sel}').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }})()")
    check("not in debug mode: no act row", not js("$('debug-acts').offsetParent"), "")
    js("settings.debug = true; applyDebug(); renderMenu()"); pg.wait_for_timeout(200)
    acts, credits, buttons = box("#debug-acts"), box("#menu .corner"), box("#menu section[data-screen=main] .menu-buttons")
    check("debug mode: the act row in the main menu's other bottom corner, on the screen, clear of the credits and the buttons",
          js("!!$('debug-acts').offsetParent") and acts[2] <= 844 and acts[3] <= 390 and acts[0] > credits[2] and acts[1] >= buttons[3], [acts, credits, buttons])
    pg.screenshot(path=f"{OUT}/debug_acts_menu.png")
    levels = lambda *ids: js(f"[{', '.join(f'lvl({json.dumps(i)})' for i in ids)}]")
    card = lambda: js("[menuOpen && screen, $('act-no').textContent, $('act-name').textContent]")
    def to_act(n):
        if js("playing"):  # from the game: its card or the garage, then the pause menu's way out
            if js("menuOpen && screen === 'act'"): pg.tap("#act-go"); pg.wait_for_timeout(200)
            js("openMenu()"); pg.wait_for_timeout(100); pg.tap("#to-main"); pg.wait_for_timeout(200)
        pg.tap(f'#debug-acts [data-act="{n}"]'); pg.wait_for_timeout(700)

    # act II: the race just revealed; the Workshop and the Autopilot bought out, Flash recharge waiting on Reckless driving
    to_act(1)
    got = js("[progress.racing, progress.finish, progress.engine, progress.runs]")
    check("act II: the race revealed, no place yet, the Turbo I6 driven", got == [True, 101, 2, 20], got)
    got = levels("power", "rev", "gears", "tyres", "time", "steering", "flash", "stereo", "engine", "clutch", "gas", "shift", "steer", "cruise", "autoflash")
    check("act II: the Workshop and the Autopilot maxed", got == [10, 4, 3, 4, 6, 3, 10, 1, 2, 1, 1, 1, 1, 1, 1], got)
    got = levels("flashRecharge", "blackTab", "reckless", "grid")
    check("act II: Flash recharge (it needs Reckless driving) and the Black market not bought", got == [0, 0, 0, 0], got)
    check("act II: its card pops up", card() == ["act", "ACT II", "RACE"], card())
    pg.screenshot(path=f"{OUT}/debug_acts_2.png")

    # act III: the first win; the Black market bought out, Flash recharge with it; the Fleet's tab for sale
    to_act(2)
    got = js("[progress.racing, progress.finish]")
    check("act III: P1", got == [True, 1], got)
    got = levels("blackTab", "grid", "rolling", "reckless", "chicken", "ecuRev", "ecuPower", "cooling", "nitro", "gear7", "daredevil", "recklessCruise", "flashRecharge")
    check("act III: the Black market maxed, Flash recharge too", got == [1, 100, 6, 1, 1, 4, 4, 3, 5, 1, 1, 1, 5], got)
    check("act III: nitro in the tank", js("progress.nitro") == 10, js("progress.nitro"))
    got = levels("fleetTab", "fleet", "dues")
    check("act III: nothing of the Fleet bought", got == [0, 0, 0], got)
    check("act III: its card pops up", card() == ["act", "ACT III", "RECRUIT"], card())

    # act IV: the gang; the Fleet bought out to 51 cars; nothing of the War Rig
    to_act(3)
    got = levels("fleetTab", "fleet", "dues", "fleetPace", "fleetFlash", "warrigTab", "bullbar")
    check("act IV: the Fleet bought out, 51 cars: the gang; nothing of the War Rig", got == [1, 51, 5, 5, 1, 0, 0], got)
    check("act IV: the AR layer on, no car totalled yet", js("[arOn(), progress.totals, progress.wanted]") == [True, 0, 0], js("[arOn(), progress.totals, progress.wanted]"))
    check("act IV: its card pops up", card() == ["act", "ACT IV", "WAR"], card())

    # back to act II: everything later sold
    to_act(1)
    got = levels("fleet", "fleetTab", "blackTab", "reckless", "nitro") + js("[progress.finish]")
    check("back to act II: the Fleet and the Black market gone, no place", got == [0, 0, 0, 0, 0, 101], got)

    # act I: a new game, straight onto the road with its card
    to_act(0)
    got = js("[progress.runs, progress.racing, lvl('power'), run.phase]")
    check("act I: a new game, on the road", got[:3] == [0, False, 0] and got[3] in ("starting", "countdown"), got)
    check("act I: its card pops up", card() == ["act", "", "DRIVE"], card())

    check("the real save is untouched", real() == REAL, real())
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
