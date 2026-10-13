"""The garage's pages: Workshop (the car) and Autopilot (the aids) in metres from the start; the Black market (the
illegal and forbidden) in race points, only once the race is revealed, and not a word about it before."""
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
WORKSHOP = ["Power", "Rev limit", "Gearbox", "Tyres", "Time", "Steering", "Headlight flash", "Flash recharge"]
AUTOPILOT = ["Auto flash", "Auto clutch", "Auto gas", "Auto shift", "Lane assist", "Autocruise"]
BLACK = ["Bribe the starter", "Reckless driving", "Game of chicken", "Reckless auto-drive", "Cooling", "ECU: rev limit",
         "ECU: power", "Nitro", "7th gear", "Daredevil", "Jump the start"]
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
with sync_playwright() as p:
    b = launch(p)
    ctx = b.new_context(viewport={"width": 844, "height": 390}, has_touch=True, is_mobile=True); pg = ctx.new_page(); js = pg.evaluate
    pg.on("pageerror", lambda e: errors.append(str(e)))
    ctx.new_cdp_session(pg).send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
    pg.goto(URL); js("localStorage.clear(); settings.layout = 'touch'; applyLayout(); Object.assign(progress, { bank: 5000, runs: 2 })")
    pg.tap('[data-play="distance"]'); pg.wait_for_timeout(300)
    tabs = lambda: js("[...document.querySelectorAll('#tabs button')].map(b => b.textContent)")
    cards = lambda: js("[...document.querySelectorAll('#cards .card b')].map(b => b.textContent)")
    prices = lambda: js("[...document.querySelectorAll('#cards [data-buy]')].map(b => b.textContent.split(' ').pop())")
    def page(id):
        pg.tap(f'[data-tab="{id}"]'); pg.wait_for_timeout(150)
    # before the reveal: two pages, metres only, no hint of what is to come
    check("before the reveal: Workshop and Autopilot", tabs() == ["Workshop", "Autopilot"], tabs())
    check("Workshop: the car itself", cards() == WORKSHOP, cards())
    check("Workshop: the engines on it", not js("$('engine-row').hidden"))
    page("autopilot")
    check("Autopilot: the robot driver", cards() == AUTOPILOT, cards())
    check("Autopilot: paid in metres", set(prices()) == {"m"}, prices())
    check("no word of the Black market before the reveal", "black market" not in js("$('garage').innerText").lower())
    pg.screenshot(path=f"{OUT}/pages_autopilot.png")
    # after the reveal: the third page, in race points
    js("Object.assign(progress, { racing: true, finish: 50, points: 3000, levels: { flash: 1, steer: 1, gas: 1, shift: 1, clutch: 1, cruise: 1 } }); renderGarage()")
    check("after the reveal: three pages", tabs() == ["Workshop", "Autopilot", "Black market"], tabs())
    page("black")
    check("Black market: the illegal and forbidden", cards() == BLACK, cards())
    check("Black market: paid in race points", set(prices()) == {"pts"}, prices())
    pg.screenshot(path=f"{OUT}/pages_black.png")
    page("workshop")
    check("Workshop: still in metres", set(prices()) == {"m"}, prices())
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
