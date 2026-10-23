"""The garage's pages, by the owner's upgrade graph (docs/upgrade-graph.md): every tab is bought, a tap on it when it is
for sale. A new game shows the Workshop's tab and nothing else; then the Autopilot's after 2 km driven, the Black
market's once the race is revealed (and not a word of it before), the Fleet's at P1, the War Rig's with a car
totalled. A card shows once one of its parents is bought (a count on the arrow once met), locked, with its name and
its whole rule: what is done ticked, a parent out of sight as ??? (Flash recharge's in act I, a teaser). The next
engine is a card. A tab with an upgrade unlocked that you haven't looked at yet has a yellow !, until you do (kept in
the save). A save from before the tabs keeps its pages."""
import re
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
WORKSHOP = ["Power", "Rev limit", "Gearbox", "Tyres", "Time", "Steering", "Headlight flash", "Car stereo"]
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
with sync_playwright() as p:
    b = launch(p)
    ctx = b.new_context(viewport={"width": 844, "height": 390}, has_touch=True, is_mobile=True); pg = ctx.new_page(); js = pg.evaluate
    pg.on("pageerror", lambda e: errors.append(str(e)))
    ctx.new_cdp_session(pg).send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
    pg.goto(URL); js("localStorage.clear(); settings.layout = 'touch'; applyLayout(); Object.assign(progress, { bank: 60, runs: 1, toured: TUTORIALS.map(t => t.id) })")
    pg.tap('[data-play="distance"]'); pg.wait_for_timeout(300)
    tabs = lambda: js("[...document.querySelectorAll('#tabs button')].map(b => b.innerText.replace(/\\n/g, ' ') + (b.disabled ? ' [off]' : ''))")
    cards = lambda: js("[...document.querySelectorAll('#cards .card b')].map(b => b.textContent)")
    rule = lambda name: js(f"[...document.querySelectorAll('#cards .card.locked')].find(c => c.querySelector('b').textContent === {name!r})?.querySelector('small').textContent")
    prices = lambda: js("[...document.querySelectorAll('#cards [data-buy]')].map(b => b.textContent.split(' ').pop())")
    news = lambda: js("[...document.querySelectorAll('#tabs button.new')].map(b => b.textContent)")
    def page(id):
        pg.tap(f'[data-tab="{id}"]'); pg.wait_for_timeout(150)
    def set_(expr): js(f"{expr}; renderGarage()")
    # 1. a new game: the Workshop's tab, 100 m, and nothing else
    check("a new game: the Workshop's tab for 100 m, off at 60 m", tabs() == ["Workshop 100 m [off]"], tabs())
    check("... the garage says to buy it, no cards, no engines", cards() == [] and "Buy the Workshop" in js("$('cards').innerText")
          and js("$('engine-row').hidden"), [cards(), js("$('cards').innerText")])
    set_("progress.bank = 5000")
    page("workshop")
    check("a tap buys it: the Workshop's cards", cards() == WORKSHOP and js("[progress.bank, lvl('workshopTab')]") == [4900, 1], [cards(), js("progress.bank")])
    check("the Autopilot's tab in sight, waiting on 2 km driven", tabs() == ["Workshop", "Autopilot 0 of 2 km driven [off]"], tabs())
    check("the engines: yours", js("[...document.querySelectorAll('#engine-row button')].map(b => b.textContent)") == ["JDM Boxer"], "")
    set_("progress.levels.power = 1")
    check("Power bought: the next engine, a card: the V8's rule", rule("Engine swap") == "needs ✓ Power · Rev limit · Gearbox", rule("Engine swap"))
    # 2. the Autopilot: 2 km driven, 500 m
    set_("progress.driven = 2100")
    check("2 km driven: the Autopilot's tab for 500 m", tabs() == ["Workshop", "Autopilot 500 m"], tabs())
    page("autopilot")
    check("a tap buys it: its roots, Auto flash waiting on 5 flashes", cards() == ["Auto flash", "Auto clutch", "Auto gas", "Lane assist"]
          and rule("Auto flash") == "needs Headlight flash 0/5", [cards(), rule("Auto flash")])
    check("Autopilot: paid in metres", set(prices()) == {"m"}, prices())
    set_("progress.levels.steer = 1")
    check("Lane assist bought: Autocruise in sight, Auto shift out of it: ???", rule("Autocruise") == "needs ✓ Lane assist · ??? · Auto gas", rule("Autocruise"))
    set_("progress.levels.clutch = 1")
    check("Auto clutch bought: Auto shift in sight, and named", "Auto shift" in cards() and rule("Autocruise") == "needs ✓ Lane assist · Auto shift · Auto gas",
          [cards(), rule("Autocruise")])
    # 3. 5 flashes: Flash recharge in sight, its other parent a teaser; Auto flash unlocked: the Autopilot's !
    page("workshop")
    set_("progress.levels.flash = 5")
    check("5 flashes: Flash recharge in sight, Reckless driving a teaser", rule("Flash recharge") == "needs ✓ Headlight flash 5/5 · ???", rule("Flash recharge"))
    check("... and Auto flash unlocked: the Autopilot tab's !", news() == ["Autopilot"], news())
    page("autopilot")
    check("looked at: the ! is gone", news() == [], news())
    pg.reload(); pg.wait_for_timeout(300); pg.tap('[data-play="distance"]'); pg.wait_for_timeout(300)
    check("reloaded: still seen, no !", news() == [], news())
    words = js("(() => { const t = []; for (const id of ['workshop', 'autopilot']) { garageTab = id; renderGarage(); t.push($('garage').innerText); } return t.join(' '); })()")
    check("not a word of racers or a race before the reveal", not re.search(r"\brac(e|er|ers|ing)\b", words, re.I), re.findall(r".{30}\brac(?:e|er|ers|ing)\b.{10}", words, re.I))
    check("no word of the Black market before the reveal", "black market" not in words.lower())
    # 4. the reveal: the Black market's tab for a point; a rung at a time
    set_("Object.assign(progress, { racing: true, finish: 50, points: 3000 }); Object.assign(progress.levels, { gas: 1, shift: 1, cruise: 1 })")
    check("the reveal: the Black market's tab for a point", tabs()[2:] == ["Black market 1 pt"], tabs())
    page("black")
    check("a tap buys it: Bribe the starter, Reckless driving, Reckless auto-drive (7th gear out of sight)",
          cards() == ["Bribe the starter", "Reckless driving", "Reckless auto-drive"] and rule("Reckless auto-drive") == "needs ✓ Autocruise · ???",
          [cards(), rule("Reckless auto-drive")])
    check("Black market: paid in race points", set(prices()) <= {"pt", "pts"}, prices())
    def buy(levels): set_(f"Object.assign(progress.levels, {levels})"); return cards()
    got = [buy("{ grid: 1 }"), buy("{ reckless: 1 }"), buy("{ ecuRev: 1 }"), buy("{ ecuPower: 1 }"), buy("{ nitro: 1 }"), buy("{ nitro: 5 }")]
    check("a rung at a time: Jump the start, then Game of chicken and the ECU, ECU: power, Cooling and Nitro, 7th gear, Daredevil",
          got == [["Bribe the starter", "Jump the start", "Reckless driving", "Reckless auto-drive"],
                  ["Bribe the starter", "Jump the start", "Reckless driving", "Game of chicken", "Reckless auto-drive", "ECU: rev limit"],
                  ["Bribe the starter", "Jump the start", "Reckless driving", "Game of chicken", "Reckless auto-drive", "ECU: rev limit", "ECU: power"],
                  ["Bribe the starter", "Jump the start", "Reckless driving", "Game of chicken", "Reckless auto-drive", "Cooling", "ECU: rev limit", "ECU: power", "Nitro"],
                  ["Bribe the starter", "Jump the start", "Reckless driving", "Game of chicken", "Reckless auto-drive", "Cooling", "ECU: rev limit", "ECU: power", "Nitro", "7th gear"],
                  ["Bribe the starter", "Jump the start", "Reckless driving", "Game of chicken", "Reckless auto-drive", "Cooling", "ECU: rev limit", "ECU: power", "Nitro", "7th gear", "Daredevil"]], got)
    check("Game of chicken needs Flash recharge; 7th gear the Gearbox maxed", rule("Game of chicken") == "needs ✓ Reckless driving · Flash recharge"
          and rule("7th gear") == "needs ✓ Nitro · Gearbox 0/3", [rule("Game of chicken"), rule("7th gear")])
    pg.screenshot(path=f"{OUT}/pages_black.png")
    page("workshop")
    check("Flash recharge for sale now, Reckless driving bought", rule("Flash recharge") is None and "Flash recharge" in cards(), [rule("Flash recharge"), cards()])
    check("Workshop: still in metres", set(prices()) == {"m"}, prices())
    # 5. the story tabs: out of sight till their moment
    check("no Fleet before P1, no War Rig before a car totalled", not any(t.startswith(("Fleet", "War Rig")) for t in tabs()), tabs())
    set_("progress.finish = 1")
    check("P1: the Fleet's tab for a point", tabs()[3:] == ["Fleet 1 pt"], tabs())
    set_("Object.assign(progress, { totals: 1 }); progress.levels.fleetTab = 1")
    check("a car totalled: the War Rig's tab, 1 scrap, none to spend", tabs()[4:] == ["War Rig 1 scrap [off]"], tabs())
    # 6. a save from before the tabs: its pages kept, nothing for sale
    set_("progress.levels = { power: 3, clutch: 1, reckless: 1 }")
    check("a save from before the tabs: its pages kept", tabs()[:3] == ["Workshop", "Autopilot", "Black market"], tabs())
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
