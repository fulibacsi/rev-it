"""The app served over HTTP (as GitHub Pages will), from a server on 127.0.0.1 only."""
import threading, functools, http.server
from playwright.sync_api import sync_playwright
from common import ROOT, launch
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler); threading.Thread(target=srv.serve_forever, daemon=True).start()
errors, failed = [], []
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"]); pg = b.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e))); pg.on("requestfailed", lambda r: failed.append(r.url))
    http.server.SimpleHTTPRequestHandler.log_message = lambda *a: None
    pg.goto(f"http://127.0.0.1:{srv.server_port}/"); pg.wait_for_timeout(400)
    pg.click('[data-play="signs"]'); pg.keyboard.press("Enter"); pg.wait_for_timeout(2500)
    print("over http:", pg.evaluate("({ state, sounds: players.length, game: game.id })"), "| failed requests:", failed or "none")
    b.close()
srv.shutdown()
print("ERRORS:", errors or "none")
