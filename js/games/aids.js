// Driver aids from the garage: robot feet and a robot hand working the same pedals and lever as the player, so you
// can watch them do it. Each one only works while bought, switched on and a run is under way (aid() in distance.js).

function updateAids(dt) {
  // an ECU tune: driving on its own the car revs into the tune, in every gear, while the engine is cool; from heat 0.6
  // it keeps to the factory map (limiter at the factory redline) until it has cooled below 0.4, well short of the red.
  // Your own foot on the gas, or nitro, take the tuned map whatever the heat
  const reckless = aid('recklessCruise');
  tunedRevs = heat < (tunedRevs ? 0.6 : 0.4);
  revCap = aid('gas') && tuned() && !pushing() && !nitro && !tunedRevs ? engine.stock.redline : Infinity;
  if (state !== 'running') return;
  if (aid('shift')) autoShift();
  if (aid('clutch')) autoClutch(dt);
  if (aid('gas')) autoGas(dt);
  if (reckless) recklessLanes(); // before autocruise, which keeps out of the oncoming lanes
  if (aid('cruise')) autocruise(); // after the gas: it brakes behind traffic it can't pass
  else if (aid('steer')) laneAssist();
  if (aid('autoflash')) autoFlash();
  if (reckless) recklessNitro(); // last: never while braking
}

const launchRpm = () => 0.6 * engine.redline; // revs to set off at: well into the pull, clear of the limiter

// auto clutch: out at once while the gear lever moves, and on the line until GO so the revs can build. Coming in
// it follows the revs, like a centrifugal clutch, so it can neither stall nor bog the engine; once the car has
// caught up it stays in. It knows nothing about grip: with a lot of power it will spin the tyres.
function autoClutch(dt) {
  if (touching('clutch')) return; // your foot on the clutch: it's yours
  if (lever.held || lever.path || run.phase === 'countdown') { clutchPedal = 1; return; }
  const e = engine, [b0, b1] = CAR.bite, from = 1.2 * e.idle;
  const bite = clamp((rpm - from) / (launchRpm() - from), 0, 1);
  const want = !gear ? clutchPedal : locked && rpm > 1.3 * e.idle || bite >= 1 ? 0 : b1 - bite * (b1 - b0);
  clutchPedal += clamp(want - clutchPedal, -dt / 0.3, dt / 0.3); // a smooth foot: full travel in 0.3 s
}

// auto gas: holds the launch revs on the line, otherwise flat out, shifts included (the limiter catches the revs
// while the clutch is out). Once the clutch has caught up it is traction control: no more gas than the tyres can
// take (worked out from the torque the engine makes at these revs), and well under that if they spin anyway.
function autoGas() {
  if (pushing()) return; // your own foot on the gas: it's yours (the nitro pedal only floors it, then this trims it)
  if (speed < 1 && (!gear || clutch < 0.05)) gasPedal = clamp(0.5 + (launchRpm() - rpm) / 800, 0, 1);
  else if (!locked && !spinning) gasPedal = 1;
  else {
    const a0 = engineAccel(engine, rpm, 0), a1 = engineAccel(engine, rpm, 1); // the pull is linear in the throttle
    const most = (gripTorque() / engine.inertia / RAD - a0) / (a1 - a0);
    gasPedal = clamp(spinning ? 0.3 * most : 0.97 * most, 0, 1);
  }
}

// auto shift: up just short of the limiter, down when a hill drags the revs low. The lever travels the gate.
function autoShift() {
  if (lever.held || lever.path) return; // the player's hand is on it, or it is already moving
  const r = Math.min(engine.redline, revCap); // see updateAids
  const next = step => { let g = gear + step; while (brokenGears.includes(g)) g += step; return g; }; // past broken ones
  const at = revsIn, up = next(1), down = next(-1);
  // up near the limiter, unless that gear would lug the engine; down by road speed (after a crash the clutch may be
  // slipping in far too high a gear), unless the lower gear would be straight back at the limiter: with a broken
  // gear in between, the two neighbours are far apart, and this keeps it from hunting between them
  const want = !gear ? up
    : rpm > r - 200 && up <= topGear() && locked && at(up) > 0.35 * r ? up
    : down >= 1 && at(gear) < 0.45 * r && at(down) < r - 400 ? down : gear;
  if (want !== gear) moveLever(want);
}

// ---- steering: a robot hand on the wheel (it turns by itself as the car moves over) ----
// the nearest car going your way ahead in lane x, leaving out any that past(c, x) says won't be in your way there
function nextCar(x, past = () => false) {
  let near = null;
  for (const c of traffic) if (c.dir > 0 && sameLane(c.x, x) && c.z > odo && !past(c, x) && (!near || c.z < near.z)) near = c;
  return near;
}
// ... how far its back is from your front, and how fast you close on it
function carAhead(x, past) {
  const near = nextCar(x, past);
  return near && { gap: near.z - odo - MY_FRONT, closing: speed - near.v };
}
// room in lane x to move over into: nobody alongside, and nobody slower within `ahead` metres
function laneClear(x, ahead) {
  return !traffic.some(c => c.dir > 0 && sameLane(c.x, x) && c.z + CAR_LEN > odo - MY_REAR - 3 && c.z < odo + ahead);
}
const settled = () => Math.abs(carX - MY_LANES[lane]) < 0.3; // not already moving over
const moveOver = () => changeLane(lane ? 1 : -1); // to the other lane

// lane assist: at the last moment (under 1.8 s from hitting a slower car) it swerves into the other lane if that is
// clear. It doesn't brake: boxed in, you still have to.
function laneAssist() {
  if (wheel.held || lane > 1 || !settled()) return; // on the wrong side of the road you are on your own
  const a = carAhead(MY_LANES[lane]);
  if (a && a.closing > 0 && a.gap / a.closing < 1.8 && laneClear(MY_LANES[1 - lane], a.gap + 20)) moveOver();
}

// autocruise: drives the whole run like a good driver. It takes whichever lane lets it go further before catching
// a slower car, moves over only when nobody is alongside, and keeps right when that costs nothing. When it can't get
// past, it is adaptive cruise control: it brakes, late and firmly, to match the car ahead's speed before reaching it
// (from 300 km/h that still takes a couple of hundred metres), then follows until there is a way past.
let cruiseBrake = false; // it has its foot on the brake (so it knows to take it off again)
function autocruise() {
  if (wheel.held || lane > 1) return; // it keeps to its side of the road; over there you are on your own
  const reach = a => a && a.closing > 0 ? a.gap / a.closing : Infinity; // s until you'd hit it
  const mine = carAhead(MY_LANES[lane]), theirs = carAhead(MY_LANES[1 - lane]);
  const roomBeside = laneClear(MY_LANES[1 - lane], MY_FRONT + 6) && reach(theirs) > 2.5; // can move over now, safely
  // which lane goes further: with auto flash and a flash left, an ordinary car is no obstacle (it will be flashed out
  // of the way), nor is one already moving out of the lane for a flash; a racer in front, which won't move over, is
  // overtaken in the other lane
  const leaving = (c, x) => c.yielding ? !sameLane(MY_LANES[c.lane], x) : aid('autoflash') && run.flashes > 0 && yields(c, 1 - c.lane);
  const further = x => reach(carAhead(x, leaving));
  const escape = roomBeside && further(MY_LANES[1 - lane]) > further(MY_LANES[lane]) + 0.5;
  if (settled() && (escape && reach(mine) < 8 || lane === 1 && roomBeside && reach(mine) > 6 && reach(theirs) > 8)) moveOver();
  if (pushing()) { if (cruiseBrake) { brakePedal = 0; cruiseBrake = false; } return; } // your foot on the gas: no braking
  if (touching('brake')) { cruiseBrake = false; return; } // your foot on the brake: it's yours
  const hardest = CAR.brake / engine.mass; // m/s² the brakes can do
  const keep = 8 + 0.4 * speed; // following distance, m
  const closing = mine ? mine.closing : 0, room = mine ? mine.gap - keep : Infinity;
  const needed = closing > 0 ? closing ** 2 / (2 * Math.max(1, room)) : 0; // to match its speed at that distance
  if (!escape && (needed > (cruiseBrake ? 0.5 : 0.75) * hardest || room < 0 && closing > 0)) { // brake: firmly, or
    gasPedal = 0;                                                                            // inside the gap
    brakePedal = clamp(needed / hardest, room < 0 ? 0.3 : 0.5, 1);
    cruiseBrake = true;
  } else {
    if (cruiseBrake) { brakePedal = 0; cruiseBrake = false; }
    if (!escape && room < 0) gasPedal = 0; // inside the gap but not closing: coast
  }
}

// auto flash: flashes the car ahead in your lane when it is slower than you, under 4 s away and would move over: an
// ordinary car with room in your other lane. Never a racer, so no flash is wasted (autocruise overtakes those)
function autoFlash() {
  if (lane > 1 || !run.flashes) return;
  const c = nextCar(carX);
  if (c && c.v < speed - 2 && (c.z - odo) / (speed - c.v) < 4 && yields(c, 1 - lane)) flashLights();
}

// reckless auto-drive (Black market): autocruise without manners. Boxed in on your side it takes the near oncoming lane
// when nothing is coming for 6 s, or when whatever comes can be flashed out of the way (Game of chicken and a flash
// left). It goes home when something it can't flash away comes within 3.5 s (cutting in beside a car only to escape a
// head-on under 2 s away), or once your side is open again. It pushes the nitro pedal when a racer is close ahead, the
// tyres grip and it isn't braking.
let tunedRevs = true; // the aids rev into the tune now (see updateAids)
const meets = x => { // s until the first oncoming car in lane x meets you
  let t = Infinity;
  for (const c of traffic)
    if (c.dir < 0 && sameLane(c.x, x) && c.z > odo - 5) t = Math.min(t, (c.z - odo) / Math.max(1, speed + c.v));
  return t;
};
function recklessLanes() {
  if (lane > 1 && cruiseBrake) { brakePedal = 0; cruiseBrake = false; } // autocruise doesn't drive over there
  if (wheel.held || Math.abs(carX - ROAD_LANES[lane]) > 0.3) return; // your hand on the wheel, or already moving over
  const reach = a => a && a.closing > 0 ? a.gap / a.closing : Infinity, brave = chicken && run.flashes > 0;
  if (lane <= 1) {
    const boxed = reach(carAhead(MY_LANES[lane])) < 3 && reach(carAhead(MY_LANES[1 - lane])) < 3;
    if (lane === 1 && boxed && speed > 15 && (meets(ROAD_LANES[2]) > 6 || brave)) changeLane(-1);
    return;
  }
  if (lane === 3) return changeLane(1); // the far oncoming lane: back towards your side
  const facing = traffic.find(c => sameLane(c.x, carX) && swerves(c) && (c.z - odo) / Math.max(1, speed + c.v) < 4.5);
  if (brave && facing) flashLights(); // a game of chicken
  const coming = meets(ROAD_LANES[2]), home = laneClear(MY_LANES[1], MY_FRONT + 6);
  if (coming < 3.5 && (home || coming < 2) || home && reach(carAhead(MY_LANES[1])) > 4) changeLane(1);
}
function recklessNitro() {
  const front = nearestRacers().front;
  nitroByAid = run.phase === 'run' && progress.nitro > 0 && !pushing() && !cruiseBrake && !spinning && gear >= 2 &&
    !!front && front.z - odo < 500;
}
