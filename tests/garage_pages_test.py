"""The garage's pages: Workshop (the car) and Autopilot (the aids) in metres from the start; the Black market (the
illegal and forbidden) in race points, only once the race is revealed, and not a word about it before. Flash recharge
joins the Workshop with the reveal. A locked upgrade shows only a step away, and then only its name and what it needs
(further off, out of sight: the Black market a rung at a time, the next engine and none further); a tab with an upgrade
unlocked that you haven't looked at yet has a yellow !, until you do (kept in the save)."""
import re
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
WORKSHOP = ["Power", "Rev limit", "Gearbox", "Tyres", "Time", "Steering", "Headlight flash", "Car stereo"]
AUTOPILOT = ["Auto flash", "Auto clutch", "Auto gas", "Auto shift", "Lane assist", "Autocruise"]
BLACK = ["Bribe the starter", "Jump the start", "Reckless driving", "Game of chicken", "Reckless auto-drive", "Cooling",
         "ECU: rev limit", "ECU: power", "Nitro", "7th gear", "Daredevil"]
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
    engines = lambda: js("[...document.querySelectorAll('#engine-row button')].map(b => b.textContent)")
    check("the engines: yours, the next one for sale, none further", engines() == ["JDM Boxer", "Muscle V8 · 4,000 m"], engines())
    js("progress.levels.engine = 1; renderGarage()")
    check("... the second bought: the third for sale", engines() == ["JDM Boxer", "Muscle V8", "JDM Turbo I6 · 10,000 m"], engines())
    js("progress.levels.engine = 0; renderGarage()")
    news = lambda: js("[...document.querySelectorAll('#tabs button.new')].map(b => b.textContent)")
    bang = lambda: js("getComputedStyle(document.querySelector('#tabs button.new'), '::after').content")
    check("a fresh game: the Autopilot tab has a yellow !", news() == ["Autopilot"] and bang() == '"!"', [news(), bang()])
    page("autopilot")
    check("looked at: the ! is gone", news() == [], news())
    check("Autopilot: the robot driver, but Autocruise (two steps off: Auto shift needs Auto clutch)", cards() == AUTOPILOT[:-1], cards())
    locked = js("""[...document.querySelectorAll('#cards .card.locked')].map(c => ({ name: c.querySelector('b').textContent,
        text: c.querySelector('small').textContent, button: !!c.querySelector('button') }))""")
    check("locked a step away: only the name and what it needs, no price", locked == [{"name": "Auto flash", "text": "needs Headlight flash", "button": False},
          {"name": "Auto shift", "text": "needs Auto clutch", "button": False}], locked)
    js("progress.levels.clutch = 1; renderGarage()")
    check("Auto clutch bought: Autocruise a step away, in sight", cards() == AUTOPILOT and "needs Lane assist" in js("$('cards').innerText"), cards())
    js("progress.levels.clutch = 0; renderGarage()")
    page("workshop"); pg.reload(); pg.wait_for_timeout(300); pg.tap('[data-play="distance"]'); pg.wait_for_timeout(300)
    check("reloaded: still seen, no !", news() == [], news())
    js("progress.levels.flash = 5; renderGarage()")
    check("5 flashes: Auto flash unlocks, and Autopilot has a ! again", news() == ["Autopilot"], news())
    page("autopilot")
    check("Auto flash: no longer locked", "Auto flash" not in js("[...document.querySelectorAll('#cards .card.locked b')].map(b => b.textContent)"), "")
    words = js("(() => { const t = []; for (const id of ['workshop', 'autopilot']) { garageTab = id; renderGarage(); t.push($('garage').innerText); } return t.join(' '); })()")
    check("not a word of racers or a race on the cards before the reveal (the flash's and Auto flash's included)",
          not re.search(r"\brac(e|er|ers|ing)\b", words, re.I), re.findall(r".{30}\brac(?:e|er|ers|ing)\b.{10}", words, re.I))
    js("progress.levels.flash = 0; renderGarage()")
    check("Autopilot: paid in metres", set(prices()) == {"m"}, prices())
    check("no word of the Black market before the reveal", "black market" not in js("$('garage').innerText").lower())
    pg.screenshot(path=f"{OUT}/pages_autopilot.png")
    # after the reveal: the third page, in race points
    js("Object.assign(progress, { racing: true, finish: 50, points: 3000, levels: { flash: 1, steer: 1, gas: 1, shift: 1, clutch: 1, cruise: 1 } }); renderGarage()")
    check("after the reveal: three pages", tabs() == ["Workshop", "Autopilot", "Black market"], tabs())
    page("workshop")
    check("Workshop: Flash recharge on sale now", cards() == WORKSHOP[:7] + ["Flash recharge"] + WORKSHOP[7:], cards())
    check("after the reveal, the flash's card says the racers won't move over", "(racers won't)" in js("$('cards').innerText"), "")
    page("black")
    rung = ["Bribe the starter", "Jump the start", "Reckless driving", "Game of chicken", "Cooling", "ECU: rev limit", "ECU: power"]
    check("Black market: the illegal and forbidden, its first rung", cards() == rung, cards())
    check("Black market: paid in race points", set(prices()) == {"pts"}, prices())
    def buy(levels): js(f"Object.assign(progress.levels, {levels}); renderGarage()"); return cards()
    got = [buy("{ reckless: 1 }"), buy("{ ecuPower: 1 }"), buy("{ nitro: 1, gears: 3 }")]
    check("a rung at a time: Nitro, then 7th gear, then Reckless auto-drive", got == [rung + ["Nitro"], rung + ["Nitro", "7th gear"],
          rung[:4] + ["Reckless auto-drive"] + rung[4:] + ["Nitro", "7th gear"]], got)
    pg.screenshot(path=f"{OUT}/pages_black.png")
    page("workshop")
    check("Workshop: still in metres", set(prices()) == {"m"}, prices())
    page("black")
    got = js("""(() => { for (const [id, u] of Object.entries(UPGRADES))
        if (['bank', 'points'].includes(wallet(u)) && !['daredevil', 'grid', 'cooling'].includes(id)) progress.levels[id] = maxOf(u);
      renderGarage(); return $('cards').innerText; })()""")
    check("all else maxed but Cooling: Daredevil in sight", cards() == BLACK and "max everything else first" in got, cards())
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
