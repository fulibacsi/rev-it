"""Traffic and lane changes, simulated fast in the page at a held cruise speed."""
from playwright.sync_api import sync_playwright
from common import URL, launch
errors = []
SIM = """([kmh, steer, seconds]) => {
  play(FREE); state = 'off';
  const dt = 1 / 60; let clock = 1000, crashes = 0, passed = 0, aiOverlap = 0, behindMe = 0, changes = 0;
  for (let i = 0; i < seconds * 60; i++) {
    speed = kmh / 3.6;
    if (steer) { // look ahead in your lane; pull out when something slower is close and the other lane is clear
      const mine = MY_LANES[lane], other = MY_LANES[1 - lane];
      const block = traffic.some(c => c.dir > 0 && sameLane(c.x, mine) && c.z - odo > 0 && c.z - odo < 70 && c.v < speed);
      const free = !traffic.some(c => c.dir > 0 && sameLane(c.x, other) && c.z - odo > -12 && c.z - odo < 70);
      const backFree = !traffic.some(c => c.dir > 0 && sameLane(c.x, MY_LANES[0]) && c.z - odo > -12 && c.z - odo < 90);
      if (block && free) { changeLane(lane ? 1 : -1); changes++; }
      else if (lane === 1 && backFree && Math.abs(carX - other) > 2) { changeLane(1); changes++; } // keep right
    }
    stepCar(dt, 0); speed = kmh / 3.6;
    const before = traffic.map(c => c.d);
    updateTraffic(dt, clock += dt);
    if (crashed) { crashed = false; crashes++; }
    traffic.forEach((c, j) => { if (c.dir > 0 && before[j] > 0 && c.d <= 0) passed++; });
    for (const a of traffic) for (const b of traffic) if (a !== b && a.dir > 0 && b.dir > 0 && sameLane(a.x, b.x) && a.z < b.z && a.z + CAR_LEN > b.z + 0.01) aiOverlap++;
    for (const c of traffic) if (c.dir > 0 && sameLane(c.x, carX) && c.z < odo - MY_REAR && c.z + CAR_LEN > odo - MY_REAR + 0.01) behindMe++;
  }
  return { kmh, steer, crashes, passed, changes, aiOverlapFrames: aiOverlap, aiIntoYouFrames: behindMe, km: +(odo / 1000).toFixed(1) };
}"""
with sync_playwright() as p:
    b = launch(p)
    pg = b.new_page(); pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(300)
    for kmh in (40, 110, 200):
        for steer in (False, True):
            print(pg.evaluate(SIM, [kmh, steer, 180]))
    b.close()
print("ERRORS:", errors or "none")
