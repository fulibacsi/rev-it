"""Getting off the start line: standing still in a run (or stalled), the windshield says what to do next, a step at a
time, in the words of the layout (keyboard, then touch), until the car moves; nothing when the aids do it all."""
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
errors = []
READ = "[$('run-dist').textContent, $('run-info').textContent]"


def check(what, ok, got):
    print(f"{'ok  ' if ok else 'FAIL'} {what}: {got}")


with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    pg = b.new_page(viewport={"width": 1440, "height": 900}); pg.on("pageerror", lambda e: errors.append(str(e))); js = pg.evaluate
    pg.goto(URL); pg.wait_for_timeout(300)
    js("localStorage.clear(); settings.layout = 'keys'; applyLayout(); progress.toured = ['driving']; 0")  # its tutorial seen (tutorial_test)
    pg.click('[data-play="distance"]'); pg.wait_for_timeout(200); pg.click("#act-go")  # a new game: its first card, then the road
    pg.wait_for_function("run.phase === 'run'", timeout=15000)
    js("traffic.forEach(c => { if (!c.racer) { c.dir = -1; c.x = LANES.oncoming[0]; } }); 0")  # no traffic your way
    first = js(READ); pg.wait_for_timeout(1800)
    check("at GO the read-out is the run's, then standing still for 1.5 s", first[0] == "0 m", first)
    got = js(READ); check("1. clutch down (keyboard: hold Shift)", got == ["CLUTCH DOWN", "hold Shift"], got)
    pg.keyboard.down("Shift"); pg.wait_for_timeout(300)
    got = js(READ); check("2. into 1st (↑)", got == ["INTO 1ST", "↑ for 1st"], got)
    pg.keyboard.press("ArrowUp"); pg.wait_for_timeout(300)
    got = js(READ); check("3. gas, clutch up", got == ["GAS, CLUTCH UP", "hold Space, then let Shift go"], got)
    pg.screenshot(path=f"{OUT}/start_prompt_desktop.png")
    pg.keyboard.down(" "); pg.keyboard.up("Shift"); pg.wait_for_timeout(1500); pg.keyboard.up(" ")
    got = js(READ); check("moving: the run's read-out again", got[0].endswith(" m") and js("speed") > 1, got)
    js("state = 'off'; stalled = true; 0"); pg.wait_for_timeout(200)  # a stall
    got = js(READ); check("stalled: start the engine", got == ["START THE ENGINE", "Enter, or the key to START"], got)
    # in 3rd at a standstill with the engine running: the clutch, then down to 1st
    pg.keyboard.down("Shift"); js("clutchPedal = 1; state = 'running'; rpm = engine.idle; speed = 0; gear = 3; run.still = 2; 0"); pg.wait_for_timeout(200)
    got = js(READ); check("in 3rd, standing: down to 1st", got == ["INTO 1ST", "↓ down to 1st"], got)
    pg.keyboard.up("Shift")
    # the touch layout's words
    pg.set_viewport_size({"width": 844, "height": 390})  # a phone held sideways
    js("settings.layout = 'touch'; applyLayout(); state = 'off'; 0"); pg.wait_for_timeout(200)
    got = js(READ); check("touch: the key", got == ["START THE ENGINE", "hold the key at START"], got)
    js("state = 'running'; rpm = engine.idle; gear = 0; clutchPedal = 0; run.still = 2; 0"); pg.wait_for_timeout(200)
    got = js(READ); check("touch: the clutch pedal", got == ["CLUTCH DOWN", "the left pedal, all the way"], got)
    pg.screenshot(path=f"{OUT}/start_prompt_touch.png")
    # with Auto clutch and Auto shift, only the gas is yours; with every aid, nothing to say
    pg.set_viewport_size({"width": 1440, "height": 900})
    js("settings.layout = 'keys'; applyLayout(); Object.assign(progress.levels, { clutch: 1, shift: 1 }); clutchPedal = 1; gear = 1; speed = 0; run.still = 2; 0"); pg.wait_for_timeout(200)
    got = js(READ); check("Auto clutch and Auto shift: just the gas", got == ["GAS, CLUTCH UP", "hold Space"], got)
    js("progress.levels.gas = 1; run.still = 2; 0"); pg.wait_for_timeout(200)
    got = js(READ); check("every aid: no prompt", got[0] == "0 m" or got[0].endswith(" m"), got)
    b.close()
print("ERRORS:", errors or "none")
