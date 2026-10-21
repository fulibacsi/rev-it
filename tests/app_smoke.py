"""Menu, each game, keyboard driving: errors, states and screenshots."""
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
errors = []
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL); js = pg.evaluate; kb = pg.keyboard
    js("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(400)
    pg.screenshot(path=f"{OUT}/menu.png")
    st = lambda: js("({ game: game.id, menu: menuOpen, state, gear, kmh: Math.round(speed * 3.6), rpm: Math.round(rpm), clutch: +clutchPedal.toFixed(2), gas: +gasPedal.toFixed(2), lever: [lever.x, +lever.y.toFixed(2)], hud: document.getElementById('hud-speed').textContent + ' ' + document.getElementById('hud-unit').textContent })")

    # Speed signs with the keyboard
    pg.click('[data-show="arcade"]'); pg.click('[data-play="signs"]'); pg.wait_for_timeout(200); print("signs picked:", st())
    kb.press("Enter"); pg.wait_for_timeout(2000); print("Enter:", st())
    kb.down("Shift"); pg.wait_for_timeout(300); kb.press("ArrowUp"); pg.wait_for_timeout(400); print("clutch + up:", st())
    kb.down(" "); pg.wait_for_timeout(300); kb.up("Shift"); pg.wait_for_timeout(2500); print("gas, clutch up:", st())
    kb.down("Shift"); pg.wait_for_timeout(200); kb.press("ArrowUp"); pg.wait_for_timeout(400); kb.up("Shift"); pg.wait_for_timeout(1500)
    print("2nd:", st(), "| score:", js("document.getElementById('score').textContent.split('\\n')[0]"))
    kb.up(" "); kb.press("ArrowUp"); pg.wait_for_timeout(500); print("up without clutch:", st(), js("document.getElementById('flash').textContent"))
    pg.screenshot(path=f"{OUT}/signs.png")
    kb.press("Escape"); pg.wait_for_timeout(200); print("Esc:", st())
    kb.press("Escape"); pg.wait_for_timeout(200); print("Esc again (resume):", st())

    # Rev
    kb.press("Escape"); pg.click("#to-main"); pg.click('[data-show="arcade"]'); pg.click('[data-play="rev"]'); pg.wait_for_timeout(200)
    print("rev picked:", st(), "gate:", js("document.getElementById('gate').getAttribute('d')"))
    kb.press("Enter"); pg.wait_for_timeout(1800); kb.down(" "); pg.wait_for_timeout(5500); kb.up(" ")
    print("rev revving:", st(), "| score:", js("document.getElementById('score').textContent.replace(/\\n/g, ' / ')"))
    kb.down("Shift"); pg.wait_for_timeout(300); kb.press("ArrowUp"); pg.wait_for_timeout(500); kb.up("Shift"); print("rev: try 1st:", st())
    pg.screenshot(path=f"{OUT}/rev.png")

    # Distance with the keyboard
    kb.press("Escape"); pg.click("#to-main"); pg.click('[data-play="distance"]'); pg.wait_for_timeout(300)
    print("a new game's first card:", js("[screen, $('act-name').textContent]")); pg.click("#act-go"); pg.wait_for_timeout(100)
    print("distance picked:", js("({ phase: run.phase, garage: document.body.classList.contains('garage'), gate: document.getElementById('gate').getAttribute('d') })"))
    kb.press("Enter"); pg.wait_for_function("run.phase === 'countdown'", timeout=10000)
    kb.down("Shift"); pg.wait_for_timeout(200); kb.press("ArrowUp"); pg.wait_for_timeout(400); kb.down(" ")
    pg.wait_for_function("run.phase === 'run'"); kb.up("Shift"); pg.wait_for_timeout(3000); print("distance run:", st(), js("run.left.toFixed(1)"))
    js("run.left = 0.2"); pg.wait_for_function("run.phase === 'garage'", timeout=10000); kb.up(" ")
    print("distance done:", js("({ gain: run.gain, bank: progress.bank })"))

    # Free drive, and menu cards keep bests
    kb.press("Escape"); pg.click("#to-main"); pg.click('[data-show="arcade"]'); pg.click('[data-play="free"]'); pg.wait_for_timeout(200); print("free:", st())
    kb.press("Escape"); pg.click("#to-main"); pg.click('[data-show="arcade"]'); pg.wait_for_timeout(200)
    print("menu bests:", [t.replace("\n", " | ") for t in pg.locator("#game-list button").all_inner_texts()])
    pg.screenshot(path=f"{OUT}/menu2.png")
    b.close()
print("ERRORS:", errors or "none")
