"""iPhone 14 Pro sideways: controls clear of the swipe zones, pause and sound when the page is hidden, Continue / New
game, the home-screen tip, the manifest and icons."""
import json, threading, functools, http.server
from playwright.sync_api import sync_playwright
from common import ROOT, URL, OUT, launch
ROOT = str(ROOT)
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
http.server.SimpleHTTPRequestHandler.log_message = lambda *a: None
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{srv.server_port}/"
IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
errors, failed = [], []
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    ctx = b.new_context(viewport={"width": 852, "height": 393}, device_scale_factor=3, is_mobile=True, has_touch=True, user_agent=IPHONE)
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errors.append(str(e))); pg.on("requestfailed", lambda r: failed.append(r.url))
    cdp = ctx.new_cdp_session(pg); cdp.send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
    try:  # the island on the left, the home bar at the bottom (iPhone 14 Pro sideways)
        cdp.send("Emulation.setSafeAreaInsetsOverride", {"insets": {"left": 59, "right": 59, "bottom": 21, "top": 0}}); print("safe-area insets emulated: left 59, right 59, bottom 21")
    except Exception as e: print("safe-area insets can't be emulated here:", str(e)[:60])
    pg.goto(URL); pg.wait_for_timeout(400); js = pg.evaluate
    print("iPhone tip shown:", js("getComputedStyle(document.getElementById('ios-tip')).display"))
    js("localStorage.clear(); progress.bank = 5000; progress.levels = { flash: 1 }"); pg.tap('[data-play="distance"]'); pg.wait_for_timeout(200)
    pg.tap("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000); pg.wait_for_timeout(300)
    W, H = 852, 393
    for sel in ["#shifter", "#pedals", "#ignition", "#stalk-hit", "#timer", "#menu-button"]:
        r = js(f"(() => {{ const r = document.querySelector('{sel}').getBoundingClientRect(); return [r.left, r.right, r.top, r.bottom]; }})()")
        print(f"  {sel:13} left {r[0]:5.0f}  right gap {W - r[1]:5.0f}  bottom gap {H - r[3]:5.0f}")
    # the page goes to the background mid-run (switching apps)
    js("Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange'))")
    pg.wait_for_timeout(300); print("hidden mid-run:", js("({ menu: menuOpen, sound: ctx && ctx.state, phase: run.phase, left: +run.left.toFixed(1) })"))
    pg.wait_for_timeout(1000); print("  a second later, still paused:", js("({ left: +run.left.toFixed(1) })"))
    js("Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange'))")
    pg.tap("#resume"); pg.wait_for_timeout(300); print("RESUME tapped:", js("({ menu: menuOpen, sound: ctx && ctx.state })"))
    js("run.left = 0.2"); pg.wait_for_function("run.phase === 'garage'", timeout=15000)
    pg.tap("#menu-button"); pg.wait_for_timeout(200)
    print("menu, Distance card:", pg.inner_text('.game-item:has([data-play="distance"])').replace("\n", " | "))
    pg.on("dialog", lambda d: d.accept()); pg.tap("[data-newgame]"); pg.wait_for_timeout(300)
    print("after New game:", js("({ runs: progress.runs, bank: progress.bank, levels: progress.levels, game: game.id, menu: menuOpen })"))
    print("manifest:", js("fetch('manifest.webmanifest').then(r => r.json()).then(m => m.name + ', ' + m.display + ', ' + m.icons.length + ' icons')"))
    print("icons:", js("Promise.all(['assets/icon-180.png', 'assets/icon-192.png', 'assets/icon-512.png'].map(u => fetch(u).then(r => r.status)))"))
    pg.screenshot(path=f"{OUT}/iphone.png"); b.close()
srv.shutdown()
print("failed requests:", failed or "none"); print("ERRORS:", errors or "none")
