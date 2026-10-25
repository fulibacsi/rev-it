"""Feedback and gameplay data, in the itch.io build (tools/build.py fills in the gate's address; served over HTTP, as
itch.io serves it; the gate answered here, nothing leaves the machine; the gate itself: gate_test). The first visit asks, the box unticked; unticked, a
run sends nothing, and FEEDBACK (in SHARE's place) can go empty with the stats; ticked, a game's start and each run
go, FEEDBACK needs a word, an error is reported; a failed send says so. Inside a page's frame (itch.io's) the iPhone's
"Add to Home Screen" tip is gone. The repository's own build (GitHub Pages) has none of it: SHARE, no question, nothing
sent."""
import functools, http.server, json, os, subprocess, sys, tempfile, threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from common import ROOT, URL as PAGES, OUT, launch
errors, fails, sent = [], [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
GATE = "https://test.supabase.co/functions/v1/report"
build = Path(tempfile.mkdtemp()) / "itch"
subprocess.run([sys.executable, str(ROOT / "tools" / "build.py"), str(build)], check=True, env={**os.environ, "REPORT_URL": GATE})
(build / "frame.html").write_text('<iframe src="index.html" width="844" height="390"></iframe>')  # as itch.io embeds it
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(build)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
ITCH = f"http://127.0.0.1:{srv.server_port}"
status, asked = [201], []  # what the gate answers; preflights (none: the game sends plain text)
CORS = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST"}
def supabase(route):
    r = route.request
    if r.method == "OPTIONS": asked.append(r.url); return route.fulfill(status=204, headers=CORS)
    sent.append({"table": {"event": "events", "feedback": "feedback"}[json.loads(r.post_data)["type"]], "key": r.headers.get("apikey"),
                 "authorization": r.headers.get("authorization"), **json.loads(r.post_data)})
    route.fulfill(status=status[0], headers=CORS, body="")
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    ctx = b.new_context(viewport={"width": 844, "height": 390}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.route(f"{GATE}*", supabase)
    pg = ctx.new_page(); pg.on("pageerror", lambda e: "on purpose" in str(e) or errors.append(str(e))); js = pg.evaluate
    shown = lambda: js("[...document.querySelectorAll('#menu section:not([hidden]) button')].filter(b => !b.hidden && b.offsetParent).map(b => b.textContent.trim())")
    def race():  # a new game goes straight onto the road; one under way, from the garage
        js("Object.assign(progress.levels, { clutch: 1, gas: 1, shift: 1 })"); pg.click('[data-play="distance"]'); pg.wait_for_timeout(200)
        if js("run.phase === 'garage'"): pg.click("#drive")
        pg.wait_for_function("run.phase === 'run'", timeout=15000); pg.wait_for_timeout(800)
        js("run.left = 0.05"); pg.wait_for_function("run.phase === 'garage'", timeout=15000); pg.wait_for_timeout(300)
        pg.keyboard.press("Escape"); pg.click("#to-main")
    # 1. the first visit: the question, unticked; it fits the phone
    pg.goto(f"{ITCH}/index.html"); pg.wait_for_timeout(400)
    got = js("[screen, $('stats-ok').checked, document.querySelector('[data-screen=hello]').innerText]")
    check("first visit: A GAME IN PROGRESS, the box unticked", got[0] == "hello" and not got[1] and "A GAME IN PROGRESS" in got[2]
          and "I accept to send anonymous gameplay data" in got[2] and "No personal data" in got[2], got[:2])
    r = js("(() => { const r = $('menu-panel').getBoundingClientRect(); return [r.top, r.bottom, $('menu').scrollHeight > $('menu').clientHeight]; })()")
    check("it fits the phone", r[0] >= 0 and r[1] <= 390 and not r[2], r)
    pg.screenshot(path=f"{OUT}/reporting_hello.png")
    # 2. unticked: CONTINUE, a game and a run, nothing sent
    pg.click("#hello-go"); got = js("[screen, settings.stats, JSON.parse(localStorage.getItem('car-rev-settings')).stats]")
    check("CONTINUE unticked: the main menu, no gameplay data (kept)", got == ["main", False, False], got)
    js("progress.toured = TUTORIALS.map(t => t.id)"); race()
    check("unticked: a game and a run send nothing", not sent, sent)
    pg.reload(); pg.wait_for_timeout(300)
    check("answered: not asked again", js("screen") == "main", js("screen"))
    # 3. FEEDBACK in SHARE's place; unticked it can go empty, with the stats
    pg.click("#to-stats"); check("STATS: FEEDBACK, not SHARE", shown() == ["◀ BACK", "FEEDBACK"], shown())
    pg.click('[data-show="feedback"]')
    got = js("[$('feedback-note').textContent, $('feedback-send').disabled]")
    check("unticked: it can go empty, and says so", got == ["You can send it empty: just your play stats.", False], got)
    pg.screenshot(path=f"{OUT}/reporting_feedback.png")
    pg.click("#feedback-send"); pg.wait_for_timeout(300)
    f = sent[-1] if sent else {}
    check("SEND: feedback to the gate, no key, an empty message with the stats", f.get("table") == "feedback" and f.get("key") is None and f.get("authorization") is None
          and f.get("message") == "" and f["data"]["save"]["runs"] == 1 and "toured" not in f["data"]["save"] and f["data"]["layout"] in ("touch", "keys"), {k: f.get(k) for k in ["table", "message", "build"]})
    got = js("[screen, document.querySelector('[data-screen=thanks]').innerText, $('feedback-text').value]")
    check("... then thanks, in the form's place, the box cleared", got[0] == "thanks" and "Thanks for your feedback!" in got[1] and got[2] == "", got)
    pg.click("[data-back]:visible"); check("its BACK: to STATS, where FEEDBACK came from", js("screen") == "stats", js("screen"))
    pg.click('[data-show="feedback"]'); pg.click("[data-back]:visible"); check("the form's ◀ BACK: to STATS", js("screen") == "stats", js("screen"))
    # 4. ticked in SETTINGS: a game's start and its run go; FEEDBACK needs a word
    pg.click("[data-back]:visible"); pg.click('[data-show="settings"]'); pg.click("#stats-switch")
    check("SETTINGS: gameplay data ON", js("[$('stats-switch').textContent, settings.stats]") == ["ON", True], js("$('stats-switch').textContent"))
    pg.click("[data-back]:visible"); n = len(sent); race()
    ev = [e for e in sent[n:] if e["table"] == "events"]
    check("ticked: the game's start, then its run", [e["kind"] for e in ev] == ["start", "run"], [e["kind"] for e in ev])
    run = ev[-1]["data"] if ev else {}
    check("the run: its metres, the save, touch, the screen, one session", run.get("run", {}).get("gain") is not None and run["save"]["runs"] == 2
          and run["screen"] == "844x390" and ev[0]["session"] == ev[-1]["session"] == f["session"], {k: run.get(k) for k in ["layout", "device", "screen", "act"]})
    pg.click("#to-stats"); pg.click('[data-show="feedback"]')
    check("ticked: empty, SEND is off, no word about it", js("[$('feedback-send').disabled, $('feedback-note').textContent]") == [True, ""], "")
    # typed on a phone (an iPhone's keyboard takes the lower half): the form packs into the top, SEND in sight, and a tap
    # on it sends; after, the form as it was, nothing scrolled (iOS could leave the page out of place: the owner, 25 Oct)
    js("settings.layout = 'touch'; applyLayout()"); pg.tap("#feedback-text"); pg.keyboard.type("The tank is too strong"); pg.wait_for_timeout(50)
    got = js("[document.body.classList.contains('typing'), Math.round($('feedback-send').getBoundingClientRect().bottom)]")
    check("typing on a phone: the form at the top, SEND in the top 160 px", got[0] and got[1] <= 160, got)
    check("a word: SEND on", not js("$('feedback-send').disabled"), "")
    pg.tap("#feedback-send"); pg.wait_for_timeout(600)
    check("SEND: the words go, then thanks", sent[-1].get("message") == "The tank is too strong" and js("screen") == "thanks", [sent[-1].get("message"), js("screen")])
    got = js("[document.body.classList.contains('typing'), scrollY, $('menu').scrollTop]")
    check("... the keyboard gone: the form as it was, nothing scrolled", got == [False, 0, 0], got)
    pg.click("[data-back]:visible"); pg.click('[data-show="feedback"]')
    status[0] = 500; pg.fill("#feedback-text", "again"); pg.click("#feedback-send"); pg.wait_for_timeout(300); status[0] = 201
    check("a failed send: says so on the form, the words kept", js("[screen, $('feedback-note').textContent, $('feedback-text').value]") == ["feedback", "Couldn't send it: try again later.", "again"],
          js("$('feedback-note').textContent"))
    check("no preflight: the browser sends straight to the gate", not asked, asked)
    # 5. an error: reported, ticked
    n = len(sent); js("setTimeout(() => { throw new Error('on purpose') }); 0"); pg.wait_for_timeout(300)
    e = sent[n] if len(sent) > n else {}
    check("an error: reported", e.get("kind") == "error" and e["data"]["message"].endswith("on purpose"), e.get("data", {}).get("message"))
    ctx.close()
    # 6. inside itch.io's frame on an iPhone: no "Add to Home Screen" tip (it shows on the page itself)
    ios = b.new_context(viewport={"width": 900, "height": 420}, is_mobile=True, has_touch=True,
                        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
    ios.route(f"{GATE}*", supabase); ph = ios.new_page(); ph.on("pageerror", lambda e: errors.append(str(e)))
    ph.goto(f"{ITCH}/index.html"); ph.wait_for_timeout(300); alone = ph.evaluate("document.body.classList.contains('ios')")
    ph.goto(f"{ITCH}/frame.html"); ph.wait_for_timeout(500); framed = ph.frames[1].evaluate("document.body.classList.contains('ios')")
    check("iPhone: the home-screen tip on the page itself, not inside a frame", alone and not framed, [alone, framed])
    ios.close()
    # 7. the repository's build (GitHub Pages): no question, SHARE, no setting, nothing sent
    gh = b.new_context(viewport={"width": 1440, "height": 900}); gh.route(f"{GATE}*", supabase); n = len(sent)
    pg = gh.new_page(); pg.on("pageerror", lambda e: errors.append(str(e))); js = pg.evaluate
    pg.goto(PAGES); pg.wait_for_timeout(300)
    check("GitHub Pages: no question, the main menu", js("[screen, reporting()]") == ["main", False], js("[screen, reporting()]"))
    js("progress.toured = TUTORIALS.map(t => t.id); settings.stats = true"); race()
    pg.click("#to-stats"); check("STATS: SHARE, as before", shown() == ["◀ BACK", "SHARE"], shown())
    pg.click("[data-back]:visible"); pg.click('[data-show="settings"]')
    check("SETTINGS: no gameplay data setting", "Gameplay data" not in js("document.querySelector('[data-screen=settings]').innerText"), "")
    check("nothing sent, even with the setting on", len(sent) == n, sent[n:])
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
