"""Real time: the hidden #100 and the reveal, a race with numbered racers and the position HUD, the Black market."""
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
FULL = "{ power: 10, rev: 4, gears: 3, tyres: 4, time: 6, clutch: 1, gas: 1, shift: 1, steer: 1, cruise: 1, engine: 2 }"
errors = []
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL); js = pg.evaluate
    js("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(300)
    js(f"progress.levels = {FULL}; progress.engine = 2")
    pg.click('[data-play="distance"]'); pg.wait_for_timeout(200); pg.click("#drive")
    pg.wait_for_function("run.phase === 'run'", timeout=15000); pg.wait_for_timeout(2500)
    js("const c = racers()[0]; c.z = odo + 70; c.x = MY_LANES[1 - lane]; c.lane = 1 - lane")  # bring the quick car close
    pg.wait_for_timeout(600); pg.screenshot(path=f"{OUT}/race_hidden.png")
    pg.wait_for_function("progress.racing", timeout=15000); pg.wait_for_timeout(150)
    print("revealed:", js("({ racing: progress.racing, pos: position(), flash: document.getElementById('flash').textContent, hud: document.getElementById('run-dist').textContent })"))
    pg.screenshot(path=f"{OUT}/race_reveal.png")
    js("run.left = 0.3"); pg.wait_for_function("run.phase === 'garage'", timeout=15000); pg.wait_for_timeout(300)
    print("garage report:", pg.inner_text("#report").replace("\n", " / "))
    print("tabs:", pg.inner_text("#tabs").replace("\n", " | "))
    pg.click('[data-tab="black"]'); pg.wait_for_timeout(200)
    print("racing cards:", [t.replace("\n", " · ") for t in pg.locator("#cards .card").all_inner_texts()])
    pg.screenshot(path=f"{OUT}/race_tab.png")
    js("Object.assign(progress, { points: 500, finish: 40 }); renderGarage()")
    pg.click('[data-max="grid"]'); pg.wait_for_timeout(100); pg.click('[data-buy="rolling"]'); pg.click('[data-buy="rolling"]'); pg.wait_for_timeout(100)
    print("after buying:", js("({ grid: lvl('grid'), slot: startSlot(), rolling: lvl('rolling'), points: progress.points })"))
    pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
    print("rolling start at GO:", js("({ gear, kmh: Math.round(speed * 3.6), pos: position() })"))
    pg.wait_for_timeout(9000); pg.screenshot(path=f"{OUT}/race_on.png")
    print("racing:", js("({ pos: position(), hud: document.getElementById('run-dist').textContent, info: document.getElementById('run-info').textContent })"))
    b.close()
print("ERRORS:", errors or "none")
