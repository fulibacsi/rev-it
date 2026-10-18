"""The car stereo: nothing before it is bought in the Workshop; then synthwave plays (measured off the music's own
analyser: sound, and never clipping), the lights in the cluster jump with the beat, a tap on them (or M) plays the
next tape and after the last one it goes off, greyed but still there to be tapped back on; the garage's ON/OFF is the
same switch; the menu pauses it. On a desktop
the head unit sits in the dash, left of the cluster; on the phone (iPhone insets) only the lights, clear of the rest."""
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
# 3 s of the music: the loudest sample and the average level off the analyser, and the lights lit, frame by frame
LISTEN = """() => new Promise(res => { const a = stereo.eq, buf = new Float32Array(a.fftSize); let peak = 0, sum = 0, n = 0; const lit = [];
    const t0 = performance.now(), f = () => { a.getFloatTimeDomainData(buf); for (const v of buf) { peak = Math.max(peak, Math.abs(v)); sum += v * v; n++; }
      lit.push(document.querySelectorAll('#beat rect.on').length);
      performance.now() - t0 < 3000 ? requestAnimationFrame(f) : res({ peak: +peak.toFixed(3), rms: +Math.sqrt(sum / n).toFixed(3), lit }); };
    requestAnimationFrame(f); })"""
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errors.append(str(e))); js = pg.evaluate
    pg.goto(URL)
    js("localStorage.clear(); Object.assign(progress, { bank: 5000, runs: 3 })")
    pg.click('[data-play="distance"]'); pg.wait_for_timeout(300)
    # 1. not bought: no stereo
    check("not bought: no lights, no head unit, no music", js("[getComputedStyle($('beat')).display, getComputedStyle($('stereo')).display, stereo.on]") == ["none", "none", False],
          js("[getComputedStyle($('beat')).display, getComputedStyle($('stereo')).display, stereo.on]"))
    # 2. bought: it plays
    pg.click('[data-buy="stereo"]'); pg.wait_for_timeout(1200)
    check("bought: the stereo is on, tape 1", js("[stereo.on, stereo.tape, $('stereo-lcd').textContent]") == [True, 0, "1 NEON COAST"], js("[stereo.on, stereo.tape, $('stereo-lcd').textContent]"))
    got = js(LISTEN)
    check("music: you can hear it, and it never clips", 0.01 < got["rms"] and got["peak"] < 1, {"peak": got["peak"], "rms": got["rms"]})
    # a kick lights them all, 12 or more for 47 ms after it (14 only for 19 ms: a slow frame rate could miss that)
    check("the lights jump with the beat (all lit on a kick, then down)", max(got["lit"]) >= 12 and min(got["lit"]) <= 4, sorted(set(got["lit"])))
    check("the head unit's equaliser moves", js("document.querySelectorAll('#stereo-eq u.on').length") > 0)
    # the tapes are songs of their own (the owner, 18 Oct: they sounded too alike): every two differ in tempo, groove,
    # bass line, drum kit, lead sound and hook, and each one's form brings the parts in and out
    tapes = js("""TAPES.map(t => ({ name: t.name, war: !!t.war, bpm: t.bpm, groove: t.kick + t.snare + t.hat, bass: t.bass.line, kit: t.kit,
        lead: JSON.stringify(t.lead.parts.map(p => p.slice(0, 2))), hook: JSON.stringify(t.hook),
        secs: Math.round(t.form.reduce((n, [, b]) => n + b, 0) * 4 * 60 / t.bpm) }))""")
    pairs = [(a, b) for i, a in enumerate(tapes) for b in tapes[i + 1:] if a["war"] == b["war"]]  # on the same radio
    same = [(a["name"], b["name"], k) for a, b in pairs for k in ("groove", "bass", "kit", "lead", "hook") if a[k] == b[k]] + \
           [(a["name"], b["name"], "bpm") for a, b in pairs if abs(a["bpm"] - b["bpm"]) < 6]
    check("on each radio, every two tapes differ in tempo, groove, bass line, kit, lead sound and hook", not same and len(tapes) == 8,
          same or [(t["name"], t["bpm"], f"{t['secs']} s") for t in tapes])
    form = js("""TAPES.map(t => { const n = t.form.reduce((a, [, b]) => a + b, 0) * 16, has = {};
        for (let s = 0; s < n; s += 16) { const { part } = place(t, s); has[part] = SECTIONS[part]; }
        return [t.name, Object.keys(has).sort().join(' ')]; })""")
    check("each tape's form: intro, verse, chorus and break", all(f[1] == "break chorus intro verse" for f in form), form)
    lead = js("""(() => { const real = voice; let n = 0; voice = () => n++; const counts = [];
        for (let k = 0; k < TAPES.length; k++) { stereo.tape = k; const t = TAPES[k], chorus = t.form.findIndex(([p]) => p === 'chorus'),
          from = t.form.slice(0, chorus).reduce((a, [, b]) => a + b, 0) * 16, intro = [0, 0];
          n = 0; for (let s = 0; s < 64; s++) playStep(0, s); intro[0] = n;           // the intro's first four bars
          n = 0; for (let s = from; s < from + 64; s++) playStep(0, s); intro[1] = n; // the first chorus's
          counts.push(intro); }
        voice = real; stereo.tape = 0; stereo.beats.length = 0; return counts; })()""")
    check("a chorus is fuller than the intro (voices in four bars)", all(c[1] > 1.5 * c[0] for c in lead), lead)
    pg.screenshot(path=f"{OUT}/stereo_desktop.png")
    # 3. the head unit's button, M, the lights: the next tape; after the last, off; the garage's switch follows
    pg.click("#stereo-next"); pg.wait_for_timeout(150)
    check("TAPE ▸: tape 2", js("[stereo.tape, $('stereo-lcd').textContent]") == [1, "2 NIGHT DRIVE"], js("[stereo.tape, $('stereo-lcd').textContent]"))
    pg.keyboard.press("m"); pg.keyboard.press("m"); pg.wait_for_timeout(150)
    check("M twice: tape 4", js("stereo.tape") == 3, js("stereo.tape"))
    pg.keyboard.press("m"); pg.wait_for_timeout(300)
    off = "[stereo.on, getComputedStyle($('beat')).display, document.body.classList.contains('stereo-off'), $('stereo-lcd').textContent, document.querySelectorAll('#beat rect.on, #stereo-eq u.on').length]"
    check("after the last tape: off, greyed but still there, and the garage's switch says so", js(off) == [False, "inline", True, "OFF", 0]
          and js("document.querySelector('[data-toggle=\"stereo\"]').textContent") == "OFF", [js(off), js("document.querySelector('[data-toggle=\"stereo\"]')?.textContent")])
    pg.screenshot(path=f"{OUT}/stereo_off_desktop.png")
    pg.click('[data-toggle="stereo"]'); pg.wait_for_timeout(300)
    check("the garage's ON: tape 1 again", js("[stereo.on, stereo.tape]") == [True, 0], js("[stereo.on, stereo.tape]"))
    # the War Rig radio (the owner, 18 Oct): bought and on, the war tapes, through them with M; its switch off, synthwave
    js("progress.levels.warradio = 1; delete progress.off.warradio; progress.tape = 0; 0"); pg.wait_for_timeout(400)
    got = js("[stereo.on, $('stereo-lcd').textContent]")
    check("War Rig radio: its first tape", got == [True, "1 WAR DRUMS"], got)
    got = js(LISTEN)
    check("the war tapes: you can hear them, and they never clip", 0.01 < got["rms"] and got["peak"] < 1, {"peak": got["peak"], "rms": got["rms"]})
    names = []
    for _ in range(3): pg.keyboard.press("m"); pg.wait_for_timeout(150); names.append(js("$('stereo-lcd').textContent"))
    check("M: the war tapes in turn", names == ["2 IRON CONVOY", "3 NO LAW", "4 BLACK SUN"], names)
    js("progress.off.warradio = true; 0"); pg.wait_for_timeout(300)
    check("War Rig radio switched off: synthwave again", js("$('stereo-lcd').textContent") == "4 CHROME HEART", js("$('stereo-lcd').textContent"))
    js("progress.levels.warradio = 0; delete progress.off.warradio; progress.tape = 0; 0"); pg.wait_for_timeout(300)
    # 4. the menu pauses it, and it carries on after
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200); s0 = js("stereo.step"); pg.wait_for_timeout(800)
    check("the menu: paused", js("stereo.step") == s0 and js("ctx.state") == "suspended", [s0, js("stereo.step"), js("ctx.state")])
    pg.click("#resume"); pg.wait_for_timeout(800)
    check("back: playing on", js("stereo.step") > s0, [s0, js("stereo.step")])
    # 5. another game: no stereo
    js("play(FREE)"); pg.wait_for_timeout(300)
    check("Free drive: no stereo", js("[stereo.on, getComputedStyle($('stereo')).display]") == [False, "none"], js("[stereo.on, getComputedStyle($('stereo')).display]"))
    # 6. the phone, with the iPhone's insets: the lights in the cluster, a tap on them for the next tape, no head unit
    ctx = b.new_context(viewport={"width": 852, "height": 393}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ph = ctx.new_page(); ph.on("pageerror", lambda e: errors.append(str(e)))
    cdp = ctx.new_cdp_session(ph); cdp.send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})
    cdp.send("Emulation.setSafeAreaInsetsOverride", {"insets": {"left": 59, "right": 59, "bottom": 21, "top": 0}})
    ph.goto(URL); ph.wait_for_timeout(300)
    ph.evaluate("localStorage.clear(); settings.layout = 'touch'; applyLayout(); Object.assign(progress, { bank: 5000, runs: 3, levels: { stereo: 1, clutch: 1, gas: 1, shift: 1 } })")
    ph.tap('[data-play="distance"]'); ph.wait_for_timeout(200); ph.tap("#drive"); ph.wait_for_function("run.phase === 'run'", timeout=15000); ph.wait_for_timeout(1500)
    box = lambda sel: ph.evaluate(f"(() => {{ const r = document.querySelector('{sel}').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }})()")
    hit, leds = box("#beat-hit"), box("#beat")
    check("phone: the lights in the cluster, no head unit", ph.evaluate("[getComputedStyle($('beat')).display, getComputedStyle($('stereo')).display]") == ["inline", "none"],
          ph.evaluate("[getComputedStyle($('beat')).display, getComputedStyle($('stereo')).display]"))
    print(f"   phone: the lights {leds[2] - leds[0]:.0f} x {leds[3] - leds[1]:.0f} px, the tap area {hit[2] - hit[0]:.0f} x {hit[3] - hit[1]:.0f} px")
    x, y = (hit[0] + hit[2]) / 2, (hit[1] + hit[3]) / 2
    under = ph.evaluate(f"document.elementFromPoint({x}, {y})?.id")
    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y, "id": 4}]})
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": [{"x": x, "y": y, "id": 4}]}); ph.wait_for_timeout(200)
    tap = lambda: (cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y, "id": 4}]}),
                   cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": [{"x": x, "y": y, "id": 4}]}), ph.wait_for_timeout(200))
    check("phone: a tap on the lights plays the next tape", under == "beat-hit" and ph.evaluate("stereo.tape") == 1, [under, ph.evaluate("stereo.tape")])
    tap(); tap(); tap()
    got = ph.evaluate("[stereo.on, getComputedStyle($('beat')).display, document.body.classList.contains('stereo-off')]")
    check("phone: past the last tape, off, the lights greyed but still there", got == [False, "inline", True], got)
    ph.screenshot(path=f"{OUT}/stereo_off_phone.png"); tap()
    check("phone: a tap on the greyed lights plays tape 1", ph.evaluate("[stereo.on, stereo.tape]") == [True, 0], ph.evaluate("[stereo.on, stereo.tape]"))
    ph.wait_for_timeout(300); ph.screenshot(path=f"{OUT}/stereo_phone.png")
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
