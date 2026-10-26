"""Debug mode: 5 taps on the menu's title (then OK) switch Distance to a save of its own with unlimited metres,
points, fuel and scrap, every grid slot and quicker police heat. The real save is never touched and comes back when
it is switched off; fewer taps do nothing."""
import json
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
REAL = {"bank": 1234, "runs": 3, "best": 900, "levels": {"power": 2}}
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
with sync_playwright() as p:
    b = launch(p)
    ctx = b.new_context(viewport={"width": 844, "height": 390}, has_touch=True, is_mobile=True); pg = ctx.new_page(); js = pg.evaluate
    pg.on("pageerror", lambda e: errors.append(str(e))); pg.on("dialog", lambda d: d.accept())
    pg.goto(URL); js(f"localStorage.clear(); localStorage.setItem('car-rev-incremental', '{json.dumps(REAL)}')"); pg.reload(); pg.wait_for_timeout(300)
    real = lambda: json.loads(js("localStorage.getItem('car-rev-incremental')"))
    state = lambda: js("({ debug: document.body.classList.contains('debug'), bank: progress.bank, points: progress.points, fuel: progress.fuel, power: progress.levels.power ?? 0 })")
    def taps(n):
        for _ in range(n): pg.tap("#menu h1"); pg.wait_for_timeout(80)
    taps(4); pg.wait_for_timeout(200)
    check("4 taps on the title: nothing", not state()["debug"], state())
    pg.wait_for_timeout(3100)  # those taps go stale
    taps(5); pg.wait_for_timeout(200); s = state()
    check("5 taps: debug mode, the game copied over, wallets full", s == {"debug": True, "bank": 1e9, "points": 1e9, "fuel": 1e9, "power": 2}, s)
    pg.tap('[data-play="distance"]'); pg.wait_for_timeout(300)
    check("the garage shows bottomless wallets", js("$('bank').textContent").startswith("∞ m"), js("$('bank').textContent"))
    for _ in range(3): pg.tap('[data-buy="power"]'); pg.wait_for_timeout(100)
    s = state()
    check("buying: the levels go up, the wallet stays full", s["power"] == 5 and s["bank"] == 1e9, s)
    check("the real save is untouched", real() == REAL, real())
    got = js("(() => { progress.racing = true; progress.levels.fleet = 51; const w = progress.wanted; raiseHeat(0.02); const d = progress.wanted - w; progress.wanted = w; progress.levels.fleet = 0; return [maxOf(UPGRADES.grid), +d.toFixed(3)]; })()")
    check("shortcuts: every grid slot for sale, heat ten times quicker", got == [100, 0.2], got)
    pg.screenshot(path=f"{OUT}/debug_garage.png")
    pg.reload(); pg.wait_for_timeout(300); s = state()
    check("after a reload: still debug mode, on the debug save", s == {"debug": True, "bank": 1e9, "points": 1e9, "fuel": 1e9, "power": 5}, s)
    taps(5); pg.wait_for_timeout(200); s = state()
    check("5 taps again: the real game is back as it was", s == {"debug": False, "bank": 1234, "points": 0, "fuel": 0, "power": 2} and real() == REAL, s)
    pg.wait_for_timeout(3100); taps(5); pg.wait_for_timeout(200); s = state()
    check("and on again: the debug save carries on (not a fresh copy)", s["debug"] and s["power"] == 5, s)
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
