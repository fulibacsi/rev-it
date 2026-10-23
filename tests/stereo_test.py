"""The car stereo: nothing before it is bought in the Workshop; then its recorded tapes play (measured off the music's
own analyser: sound, and never clipping), the lights in the cluster jump with the beat, a tap on them (or M) plays the
next tape and after the last one it goes off, greyed but still there to be tapped back on; the garage's ON/OFF is the
same switch; a tape that ends hands over to the next, round to the first; the menu pauses it. Each tape is downloaded
ahead: the save's in the main menu, the next while one plays, and no other. On a desktop the head unit sits in the
dash, left of the cluster, a long name scrolling; on the phone (iPhone insets) only the lights, clear of the rest.
Served over HTTP, as GitHub Pages serves it: a page opened from a file can't download the tapes, only stream them."""
import functools, http.server, threading
from playwright.sync_api import sync_playwright
from common import ROOT, OUT, launch
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{srv.server_port}/index.html"
# 3 s of the music: the loudest sample and the average level off the analyser, and the lights lit, frame by frame
LISTEN = """() => new Promise(res => { const a = stereo.eq, buf = new Float32Array(a.fftSize); let peak = 0, sum = 0, n = 0; const lit = [];
    const t0 = performance.now(), f = () => { a.getFloatTimeDomainData(buf); for (const v of buf) { peak = Math.max(peak, Math.abs(v)); sum += v * v; n++; }
      lit.push(document.querySelectorAll('#beat rect.on').length);
      performance.now() - t0 < 3000 ? requestAnimationFrame(f) : res({ peak: +peak.toFixed(3), rms: +Math.sqrt(sum / n).toFixed(3), lit }); };
    requestAnimationFrame(f); })"""
TAPE = "[stereo.on, stereo.tape, $('stereo-lcd').textContent]"
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errors.append(str(e))); js = pg.evaluate
    got_mp3 = []; pg.on("request", lambda r: r.url.endswith(".mp3") and got_mp3.append(r.url.rsplit("/", 1)[1]))
    pg.goto(URL)
    js("localStorage.clear(); Object.assign(progress, { bank: 5000, runs: 3, levels: { workshopTab: 1 }, toured: TUTORIALS.map(t => t.id) })")
    pg.click('[data-play="distance"]'); pg.wait_for_timeout(300)  # the Workshop's tab bought: the stereo's card on it
    # 1. not bought: no stereo, nothing downloaded
    check("not bought: no lights, no head unit, no music, nothing downloaded",
          js("[getComputedStyle($('beat')).display, getComputedStyle($('stereo')).display, stereo.on]") == ["none", "none", False] and not got_mp3,
          [js("[getComputedStyle($('beat')).display, getComputedStyle($('stereo')).display, stereo.on]"), got_mp3])
    # 2. bought: it plays, downloaded into memory; the next tape too, ahead, and no other
    pg.click('[data-buy="stereo"]'); pg.wait_for_function("stereo.el && !stereo.el.paused && stereo.el.currentTime > 0.5", timeout=15000)
    check("bought: the stereo is on, tape 1, from memory", js(TAPE + ".concat(stereo.el.src.slice(0, 5))") == [True, 0, "1 NEON LASER HORIZON", "blob:"], js(TAPE + ".concat(stereo.el.src.slice(0, 5))"))
    check("tape 1 and, ahead, tape 2 downloaded; no other", sorted(got_mp3) == ["neon-laser-horizon.mp3", "neon-outrun.mp3"], got_mp3)
    got = js(LISTEN)
    check("music: you can hear it, and it never clips", 0.01 < got["rms"] and got["peak"] < 1, {"peak": got["peak"], "rms": got["rms"]})
    check("the lights jump with the beat (most of them lit on a kick, then down)", max(got["lit"]) >= 12 and min(got["lit"]) <= 4, sorted(set(got["lit"])))
    check("the head unit's equaliser moves", js("document.querySelectorAll('#stereo-eq u.on').length") > 0)
    pg.screenshot(path=f"{OUT}/stereo_desktop.png")
    # 3. the head unit's button, M, the lights: the next tape; after the last, off; the garage's switch follows
    pg.click("#stereo-next"); pg.wait_for_timeout(300)
    check("TAPE ▸: tape 2", js(TAPE) == [True, 1, "2 NEON OUTRUN"], js(TAPE))
    for _ in range(3): pg.keyboard.press("m")
    pg.wait_for_timeout(300)
    check("M three times: tape 5", js(TAPE) == [True, 4, "5 NEWER WAVE"], js(TAPE))
    pg.keyboard.press("m"); pg.wait_for_timeout(300)
    off = "[stereo.on, stereo.el.paused, getComputedStyle($('beat')).display, document.body.classList.contains('stereo-off'), $('stereo-lcd').textContent, document.querySelectorAll('#beat rect.on, #stereo-eq u.on').length]"
    check("after the last tape: off, greyed but still there, and the garage's switch says so", js(off) == [False, True, "inline", True, "OFF", 0]
          and js("document.querySelector('[data-toggle=\"stereo\"]').textContent") == "OFF", [js(off), js("document.querySelector('[data-toggle=\"stereo\"]')?.textContent")])
    pg.screenshot(path=f"{OUT}/stereo_off_desktop.png")
    pg.click('[data-toggle="stereo"]'); pg.wait_for_timeout(300)
    check("the garage's ON: tape 1 again, from the top", js("[stereo.on, stereo.tape, stereo.el.currentTime < 2]") == [True, 0, True], js("[stereo.on, stereo.tape, stereo.el.currentTime]"))
    # 4. a tape that ends: the next one plays; after the last, round to the first (not off)
    js("stereo.el.currentTime = stereo.el.duration - 0.5; 0"); pg.wait_for_function("stereo.tape === 1 && !stereo.el.paused", timeout=10000)
    check("a tape ends: the next one plays", js(TAPE) == [True, 1, "2 NEON OUTRUN"], js(TAPE))
    js("progress.tape = 4; 0"); pg.wait_for_function("stereo.tape === 4 && stereo.el.duration > 0 && !stereo.el.paused", timeout=10000)
    js("stereo.el.currentTime = stereo.el.duration - 0.5; 0"); pg.wait_for_function("stereo.tape === 0", timeout=10000)
    check("the last tape ends: round to the first", js(TAPE) == [True, 0, "1 NEON LASER HORIZON"], js(TAPE))
    # 5. the War Rig radio (the owner, 18 Oct): bought and on, its own tapes; its switch off, synthwave again. A save on
    #    tape 4 of synthwave plays the War Rig's first, and M then goes on to its second (the radios differ in length)
    js("progress.levels.warradio = 1; delete progress.off.warradio; progress.tape = 3; 0")
    pg.wait_for_function("stereo.el.src && !stereo.el.paused && stereo.el.currentTime > 0.5", timeout=15000)
    check("War Rig radio: its first tape", js("[stereo.on, $('stereo-lcd').textContent]") == [True, "1 WAR RIGS ROLLING"], js("[stereo.on, $('stereo-lcd').textContent]"))
    got = js(LISTEN)
    check("the War Rig's tapes: you can hear them, and they never clip", 0.01 < got["rms"] and got["peak"] < 1, {"peak": got["peak"], "rms": got["rms"]})
    names = []
    for _ in range(2): pg.keyboard.press("m"); pg.wait_for_timeout(300); names.append(js("$('stereo-lcd').textContent"))
    check("M: the War Rig's tapes in turn", names == ["2 EMBER CHARGE", "3 WAR RIGS OF THE WASTELAND"], names)
    check("a name too long for the head unit scrolls", js("$('stereo-lcd').classList.contains('scroll')"), js("$('stereo-lcd').className"))
    pg.screenshot(path=f"{OUT}/stereo_war_desktop.png")
    js("progress.off.warradio = true; 0"); pg.wait_for_timeout(300)
    check("War Rig radio switched off: synthwave again", js("$('stereo-lcd').textContent") == "3 CHILL WAVE", js("$('stereo-lcd').textContent"))
    js("progress.levels.warradio = 0; delete progress.off.warradio; progress.tape = 0; 0"); pg.wait_for_timeout(300)
    # 6. the menu pauses it, and it carries on after
    pg.wait_for_function("!stereo.el.paused", timeout=10000)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(300); t0 = js("stereo.el.currentTime"); pg.wait_for_timeout(800)
    check("the menu: paused", js("[stereo.el.paused, stereo.el.currentTime === " + str(t0) + ", ctx.state]") == [True, True, "suspended"],
          js("[stereo.el.paused, stereo.el.currentTime, ctx.state]"))
    pg.click("#resume"); pg.wait_for_timeout(800)
    check("back: playing on", js("[stereo.el.paused, stereo.el.currentTime > " + str(t0) + "]") == [False, True], js("[stereo.el.paused, stereo.el.currentTime]"))
    # 7. another game: no stereo
    js("play(FREE)"); pg.wait_for_timeout(300)
    check("Free drive: no stereo, no music", js("[stereo.on, stereo.el.paused, getComputedStyle($('stereo')).display]") == [False, True, "none"],
          js("[stereo.on, stereo.el.paused, getComputedStyle($('stereo')).display]"))
    # 8. the phone, with the iPhone's insets: the save's tape downloaded in the main menu; the lights in the cluster, a
    #    tap on them for the next tape, no head unit
    ctx = b.new_context(viewport={"width": 852, "height": 393}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ph = ctx.new_page(); ph.on("pageerror", lambda e: errors.append(str(e)))
    menu_mp3 = []; ph.on("request", lambda r: r.url.endswith(".mp3") and menu_mp3.append(r.url.rsplit("/", 1)[1]))
    cdp = ctx.new_cdp_session(ph); cdp.send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
    cdp.send("Emulation.setSafeAreaInsetsOverride", {"insets": {"left": 59, "right": 59, "bottom": 21, "top": 0}})
    ph.goto(URL); ph.wait_for_timeout(300)
    ph.evaluate("localStorage.setItem('car-rev-incremental', JSON.stringify({ bank: 5000, runs: 3, tape: 2, levels: { stereo: 1, clutch: 1, gas: 1, shift: 1 }, toured: TUTORIALS.map(t => t.id) }))")
    ph.reload(); ph.wait_for_timeout(1000)
    check("the main menu: the save's tape downloaded, ready to play", menu_mp3 == ["chill-wave.mp3"], menu_mp3)
    ph.evaluate("settings.layout = 'touch'; applyLayout(); progress.tape = 0")
    ph.tap('[data-play="distance"]'); ph.wait_for_timeout(200); ph.tap("#drive"); ph.wait_for_function("run.phase === 'run'", timeout=15000); ph.wait_for_timeout(1500)
    box = lambda sel: ph.evaluate(f"(() => {{ const r = document.querySelector('{sel}').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }})()")
    hit, leds = box("#beat-hit"), box("#beat")
    check("phone: the lights in the cluster, no head unit", ph.evaluate("[getComputedStyle($('beat')).display, getComputedStyle($('stereo')).display]") == ["inline", "none"],
          ph.evaluate("[getComputedStyle($('beat')).display, getComputedStyle($('stereo')).display]"))
    print(f"   phone: the lights {leds[2] - leds[0]:.0f} x {leds[3] - leds[1]:.0f} px, the tap area {hit[2] - hit[0]:.0f} x {hit[3] - hit[1]:.0f} px")
    x, y = (hit[0] + hit[2]) / 2, (hit[1] + hit[3]) / 2
    under = ph.evaluate(f"document.elementFromPoint({x}, {y})?.id")
    tap = lambda: (cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y, "id": 4}]}),
                   cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": [{"x": x, "y": y, "id": 4}]}), ph.wait_for_timeout(200))
    tap()
    check("phone: a tap on the lights plays the next tape", under == "beat-hit" and ph.evaluate("stereo.tape") == 1, [under, ph.evaluate("stereo.tape")])
    for _ in range(4): tap()
    got = ph.evaluate("[stereo.on, getComputedStyle($('beat')).display, document.body.classList.contains('stereo-off')]")
    check("phone: past the last tape, off, the lights greyed but still there", got == [False, "inline", True], got)
    ph.screenshot(path=f"{OUT}/stereo_off_phone.png"); tap()
    check("phone: a tap on the greyed lights plays tape 1", ph.evaluate("[stereo.on, stereo.tape]") == [True, 0], ph.evaluate("[stereo.on, stereo.tape]"))
    ph.wait_for_timeout(300); ph.screenshot(path=f"{OUT}/stereo_phone.png")
    b.close()
srv.shutdown()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
