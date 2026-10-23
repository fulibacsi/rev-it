"""The light stalk must not take touches meant for the steering wheel's rim: sample the visible rim's centre line."""
import math
from playwright.sync_api import sync_playwright
from common import URL, launch
with sync_playwright() as p:
    b = launch(p)
    for w, h, touch in [(844, 390, True), (1440, 900, False)]:
        ctx = b.new_context(viewport={"width": w, "height": h}, has_touch=touch, is_mobile=touch); pg = ctx.new_page(); js = pg.evaluate
        pg.goto(URL); pg.wait_for_timeout(300)
        js(f"localStorage.clear(); settings.layout = '{'touch' if touch else 'desktop'}'; applyLayout(); Object.assign(progress, {{ bank: 9000, levels: {{ flash: 3 }}, runs: 1, toured: TUTORIALS.map(t => t.id) }})")
        pg.click('[data-play="distance"]'); pg.wait_for_timeout(200); pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=15000)
        res = js("""(() => { const svg = $('wheel'), m = svg.getScreenCTM(), out = { grip: 0, stalk: 0, other: 0, offscreen: 0 };
          for (let a = -80; a <= 80; a += 2) { for (const r of [470, 500, 530]) { const p = new DOMPoint(500 + r * Math.sin(a * Math.PI / 180), 560 - r * Math.cos(a * Math.PI / 180)).matrixTransform(m);
            if (p.x < 0 || p.y < 0 || p.x >= innerWidth || p.y >= innerHeight) { out.offscreen++; continue; }
            const id = document.elementFromPoint(p.x, p.y)?.id; out[id === 'wheel-grip' ? 'grip' : id === 'stalk-hit' ? 'stalk' : 'other']++; } }
          return out; })()""")
        print(f"{w}x{h}: points on the visible rim ->", res)
        ctx.close()
    b.close()
