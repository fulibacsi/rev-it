"""Traffic and lane changes, simulated fast in the page at a held cruise speed. Checks that traffic doesn't cut in
on you (a crash into a car that moved over in the last 3 s) and that a car indicates before it pulls out."""
from playwright.sync_api import sync_playwright
from common import URL, launch
errors = []
SIM = """([kmh, steer, seconds, seed]) => {
  play(FREE); state = 'off'; rng = seed; resetTraffic(); resetCar();
  const dt = 1 / 60; let clock = 1000, crashes = 0, cutins = 0, passed = 0, aiOverlap = 0, behindMe = 0, changes = 0;
  let aiChanges = 0, unsignalled = 0, saneUnsignalled = 0, t = 0;
  for (let i = 0; i < seconds * 60; i++) {
    speed = kmh / 3.6; t += dt;
    if (steer && Math.abs(carX - ROAD_LANES[lane]) < 0.3) { // a slower car under 2.5 s ahead: pull out if the other lane is clear
      const mine = MY_LANES[lane], other = MY_LANES[1 - lane];
      const block = traffic.some(c => c.dir > 0 && sameLane(c.x, mine) && c.z > odo && c.v < speed && (c.z - odo) / (speed - c.v) < 2.5);
      const free = !traffic.some(c => c.dir > 0 && sameLane(c.x, other) && c.z - odo > -12 && c.z - odo < 40);
      const backFree = !traffic.some(c => c.dir > 0 && sameLane(c.x, MY_LANES[0]) && c.z - odo > -12 && c.z - odo < 90);
      if (block && free) { changeLane(lane ? 1 : -1); changes++; }
      else if (lane === 1 && backFree && Math.abs(carX - other) > 2) { changeLane(1); changes++; } // keep right
    }
    stepCar(dt, 0); speed = kmh / 3.6;
    const before = traffic.map(c => [c.d, c.lane, c.signalled ?? 0, c.z]);
    traffic.forEach(c => { c.signalled = c.signal > 0 ? (c.signalled ?? 0) + dt : 0; });
    updateTraffic(dt, clock += dt);
    traffic.forEach((c, j) => {
      if (c.dir > 0 && before[j][0] > 0 && c.d <= 0) passed++;
      if (c.dir > 0 && c.lane !== before[j][1] && Math.abs(c.z - before[j][3]) < 50) { // pulled out (not respawned)
        aiChanges++; c.movedAt = t; if (before[j][2] < 0.9) { unsignalled++; if (!mad(c)) saneUnsignalled++; }
      }
    });
    if (crashed) { crashed = false; crashes++; if (impact.car.movedAt > t - 3) cutins++; }
    for (const a of traffic) for (const b of traffic) if (a !== b && a.dir > 0 && b.dir > 0 && sameLane(a.x, b.x) && a.z < b.z && a.z + CAR_LEN > b.z + 0.01) aiOverlap++;
    for (const c of traffic) if (c.dir > 0 && sameLane(c.x, carX) && c.z < odo - MY_REAR && c.z + CAR_LEN > odo - MY_REAR + 0.01) behindMe++;
  }
  return { kmh, steer, crashes, cutins, passed, changes, aiChanges, unsignalled, saneUnsignalled, aiOverlapFrames: aiOverlap,
           aiIntoYouFrames: behindMe, km: +(odo / 1000).toFixed(1) };
}"""
with sync_playwright() as p:
    b = launch(p)
    pg = b.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(300)
    cutins = km = changes = unsignalled = 0
    for kmh in (40, 110, 160, 220):
        for steer in (False, True):
            for seed in (1001, 1002, 1003):
                r = pg.evaluate(SIM, [kmh, steer, 120, seed])
                print(r)
                changes += r["aiChanges"]; unsignalled += r["unsignalled"]
                if steer and kmh >= 160: cutins += r["cutins"]; km += r["km"]
    # Fuel madness (Distance's War Rig upgrade, through the game's madness()): a share of the drivers goes mad, drops its
    # manners and jumps in front of you; the rest keep theirs
    shares = pg.evaluate("[0.25, 0.5, 0.75, 1].map(s => Array.from({ length: 1000 }, (_, k) => (k + 1) * 0.6180339887 % 1 < s).filter(Boolean).length / 1000)")
    mad = {}
    for share in (0.25, 0.5, 0.75, 1):
        mad[share] = {"cutins": 0, "km": 0, "unsignalled": 0, "sane": 0}
        for seed in (1001, 1002, 1003):
            r = pg.evaluate("([s, a]) => { FREE.madness = () => s; const r = (" + SIM + ")(a); delete FREE.madness; return r; }", [share, [160, True, 120, seed]])
            for k, v in (("cutins", r["cutins"]), ("km", r["km"]), ("unsignalled", r["unsignalled"]), ("sane", r["saneUnsignalled"])): mad[share][k] += v
    b.close()
print(f"{'ok' if all(abs(s - x) < 0.01 for s, x in zip(shares, (0.25, 0.5, 0.75, 1))) else 'FAIL'}: mad drivers by serial, 1,000 cars: {shares}")
for share, m in mad.items():
    print(f"   {share:.0%} mad, 160 km/h: {m['cutins']} cut-ins in {m['km']:.0f} km, {m['unsignalled']} lane changes without a signal, {m['sane']} of them sane drivers'")
cuts = [m["cutins"] for m in mad.values()]
print(f"{'ok' if cuts[0] > 0 and cuts[-1] > 2 * cuts[0] and mad[0.5]['cutins'] >= 6 else 'FAIL'}: cut-ins grow with the madness: {cuts}")
print(f"{'ok' if not any(m['sane'] for m in mad.values()) else 'FAIL'}: the sane drivers still indicate: {[m['sane'] for m in mad.values()]}")
# before the fix (15-18 Oct playtests): a steering player at 160-220 km/h met a cut-in every 4 km or so
print(f"{'ok' if cutins <= km / 25 else 'FAIL'}: {cutins} cut-ins in {km:.0f} km at 160-220 km/h, steering (at most one in 25 km)")
print(f"{'ok' if changes and not unsignalled else 'FAIL'}: {changes - unsignalled} of {changes} lane changes indicated for a second first")
print("ERRORS:", errors or "none")
