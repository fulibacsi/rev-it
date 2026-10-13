"""The Fleet: never shown before your first win; winning a race opens it (the garage says so), with miles in the
header and the Exchange card: metres for miles, one way, 1,609 m a mile, a slider (dragged with a finger on the
phone) and "all available"."""
import re
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
CAR = "power: 10, rev: 4, gears: 3, tyres: 4, time: 6, clutch: 1, gas: 1, shift: 1, engine: 2, steer: 1, cruise: 1"
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    ctx = b.new_context(viewport={"width": 852, "height": 393}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e))); js = pg.evaluate
    cdp = ctx.new_cdp_session(pg); cdp.send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
    cdp.send("Emulation.setSafeAreaInsetsOverride", {"insets": {"left": 59, "right": 59, "bottom": 21, "top": 0}})
    pg.goto(URL); pg.wait_for_timeout(300)
    js(f"localStorage.clear(); settings.layout = 'touch'; applyLayout(); Object.assign(progress, {{ racing: true, finish: 2, bank: 10000, levels: {{ {CAR} }}, engine: 2 }})")
    pg.tap('[data-play="distance"]'); pg.wait_for_timeout(200)
    tabs = lambda: js("[...document.querySelectorAll('#tabs button')].map(b => b.textContent)")
    # 1. before the first win: no Fleet, no miles, nothing that hints at them
    text = js("$('garage').innerText")
    check("before a win: no Fleet page", tabs() == ["Workshop", "Autopilot", "Black market"], tabs())
    check("before a win: no word of the fleet or miles", not re.search(r"fleet|\bmiles?\b|\bmi\b", text, re.I), re.findall(r".{20}(?:fleet|\bmiles?\b|\bmi\b).{20}", text, re.I))
    # 2. win a race: the Fleet opens, and the garage says so
    js("refreshCar()"); pg.tap("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
    js("racers().forEach(c => c.z = odo - 9000); run.left = 0.05"); pg.wait_for_function("run.phase === 'garage'", timeout=15000)
    check("a win opens the Fleet", tabs() == ["Workshop", "Autopilot", "Black market", "Fleet"], tabs())
    check("the garage says so", "the Fleet is open" in js("$('report').textContent"), js("$('report').textContent")[-120:])
    check("miles in the header", js("$('bank').textContent").endswith("· 0 mi to spend"), js("$('bank').textContent"))
    # 3. the Exchange: the slider, then all available
    js("progress.bank = 10000"); pg.tap('[data-tab="fleet"]'); pg.wait_for_timeout(200)
    check("the Exchange card", js("!!document.querySelector('.card.exchange #exchange')") and js("$('exchange').max") == "6", js("$('exchange')?.max"))
    s = js("$('exchange').getBoundingClientRect().toJSON()")
    y = s["y"] + s["height"] / 2
    for i, x in enumerate([s["x"] + 4, s["x"] + s["width"] * 0.35, s["x"] + s["width"] * 0.68]):  # a finger drags the thumb
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart" if i == 0 else "touchMove", "touchPoints": [{"x": x, "y": y, "id": 3}]}); pg.wait_for_timeout(60)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": [{"x": x, "y": y, "id": 3}]}); pg.wait_for_timeout(100)
    got = js("[+$('exchange').value, document.querySelector('[data-exchange]').textContent]")
    check("a finger drags the slider; the button follows", got[0] >= 3 and got[1] == f"{got[0]} mi for {got[0] * 1609:,} m", got)
    pg.screenshot(path=f"{OUT}/fleet_exchange_phone.png")
    n = got[0]; pg.tap("[data-exchange]"); pg.wait_for_timeout(100)
    got = js("({ bank: progress.bank, miles: progress.miles })")
    check("exchanged: the metres gone, the miles in", got == {"bank": 10000 - n * 1609, "miles": n}, got)
    pg.tap("[data-exchange-all]"); pg.wait_for_timeout(100)
    got = js("({ bank: progress.bank, miles: progress.miles, all: document.querySelector('[data-exchange-all]').disabled })")
    check("all available: every whole mile, the rest stays", got == {"bank": 10000 - 6 * 1609, "miles": 6, "all": True}, got)
    check("the header shows them", js("$('bank').textContent").endswith("· 6 mi to spend"), js("$('bank').textContent"))
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
