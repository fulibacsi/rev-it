# /// script
# requires-python = ">=3.10"
# dependencies = ["playwright", "pillow"]
# ///
"""The itch.io page's screenshots and cover (docs/itch), taken from the game in headless Chromium:

    uv run --no-project --with playwright --with pillow python tools/store_shots.py [docs/itch]

The first act only: no race, no fleet, no War Rig (CLAUDE.md: never a hint of the hidden race). The robot driver at
the wheel: the coast road at speed on a desktop and on a phone held sideways, the garage after a run, HOW TO DRIVE;
the cover is the road with the title over it, 1260 x 1000 and 630 x 500."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tests"))
from PIL import Image
from playwright.sync_api import sync_playwright
from common import URL, launch
OUT = sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).resolve().parent.parent / "docs" / "itch")
ACT1 = "power: 8, rev: 3, gears: 3, tyres: 3, time: 4, steer: 2, flash: 3, stereo: 1, clutch: 1, gas: 1, shift: 1, cruise: 1"
def setup(js, touch):
    js(f"localStorage.clear(); settings.layout = '{'touch' if touch else 'keys'}'; applyLayout(); "
       f"Object.assign(progress, {{ runs: 23, best: 4180, bank: 2650, engine: 1, levels: {{ {ACT1}, engine: 1 }}, toured: TUTORIALS.map(t => t.id), tape: 0 }}); 0")
def drive(pg, js, secs):
    pg.click("#drive") if not js("menuOpen") else None
    pg.wait_for_function("run.phase === 'run'", timeout=20000); pg.wait_for_timeout(secs * 1000)
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    # desktop: on the road, then the garage, then HOW TO DRIVE
    pg = b.new_page(viewport={"width": 1920, "height": 1080}); js = pg.evaluate
    pg.goto(URL); pg.wait_for_timeout(300); setup(js, False)
    pg.click('[data-play="distance"]'); pg.wait_for_timeout(300); js("refreshCar(); 0")
    drive(pg, js, 14); pg.screenshot(path=f"{OUT}/1-coast-road.png")
    js("run.left = 0.05; 0"); pg.wait_for_function("run.phase === 'garage'", timeout=20000); pg.wait_for_timeout(600)
    pg.screenshot(path=f"{OUT}/2-garage.png")
    pg.keyboard.press("Escape"); pg.click('[data-show="help"]:visible'); pg.click('[data-tour="driving"]'); pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(300)
    pg.screenshot(path=f"{OUT}/4-how-to-drive.png")
    # the cover: a taller window, the road, the title over it
    cv = b.new_page(viewport={"width": 1260, "height": 1000}); cj = cv.evaluate
    cv.goto(URL); cv.wait_for_timeout(300); setup(cj, False)
    cv.click('[data-play="distance"]'); cv.wait_for_timeout(300); cj("refreshCar(); 0"); drive(cv, cj, 16)
    cj("""(() => { const d = document.createElement('div'); d.innerHTML = '<b>REV <span>IT</span></b><i>stick shift · coast road · synthwave</i>';
      Object.assign(d.style, { position: 'fixed', left: 0, right: 0, top: '7%', textAlign: 'center', zIndex: 99, pointerEvents: 'none',
        fontFamily: getComputedStyle(document.querySelector('#menu h1')).fontFamily });
      d.querySelector('b').style.cssText = 'display:block;font-size:150px;font-weight:800;letter-spacing:22px;color:#eee;text-shadow:0 6px 30px #000c';
      d.querySelector('span').style.color = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#ec4';
      d.querySelector('i').style.cssText = 'display:block;margin-top:6px;font-style:normal;font-size:34px;letter-spacing:6px;color:#ddd;text-shadow:0 3px 14px #000';
      for (const id of ['hud', 'timer', 'menu-button']) { const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; }
      document.body.appendChild(d); })(); 0""")
    cv.wait_for_timeout(200); cv.screenshot(path=f"{OUT}/cover-1260x1000.png")
    # the phone, held sideways: the touch cockpit on the road
    ctx = b.new_context(viewport={"width": 844, "height": 390}, device_scale_factor=3, is_mobile=True, has_touch=True)
    ph = ctx.new_page(); pj = ph.evaluate
    cdp = ctx.new_cdp_session(ph); cdp.send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
    cdp.send("Emulation.setSafeAreaInsetsOverride", {"insets": {"left": 47, "right": 47, "bottom": 21, "top": 0}})
    ph.goto(URL); ph.wait_for_timeout(300); setup(pj, True)
    ph.tap('[data-play="distance"]'); ph.wait_for_timeout(300); pj("refreshCar(); 0")
    ph.tap("#drive"); ph.wait_for_function("run.phase === 'run'", timeout=20000); ph.wait_for_timeout(12000)
    ph.screenshot(path=f"{OUT}/3-phone.png")
    assert not (js("progress.racing") or cj("progress.racing") or pj("progress.racing")), "a race: not on the store page"
    b.close()
cover = Image.open(f"{OUT}/cover-1260x1000.png").convert("RGB")
cover.resize((630, 500), Image.LANCZOS).save(f"{OUT}/cover-630x500.png", optimize=True)
print(f"{OUT}: 4 screenshots and the cover")
