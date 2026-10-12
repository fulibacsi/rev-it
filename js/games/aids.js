// Driver aids from the garage: robot feet and a robot hand working the same pedals and lever as the player, so you
// can watch them do it. Each one only works while bought, switched on and a run is under way (aid() in distance.js).

function updateAids(dt) {
  if (state !== 'running') return;
  if (aid('shift')) autoShift();
  if (aid('clutch')) autoClutch(dt);
  if (aid('gas')) autoGas(dt);
  if (aid('cruise')) autocruise(); // after the gas: it brakes behind traffic it can't pass
  else if (aid('steer')) laneAssist();
}

const launchRpm = () => 0.6 * engine.redline; // revs to set off at: well into the pull, clear of the limiter

// auto clutch: out at once while the gear lever moves, and on the line until GO so the revs can build. Coming in
// it follows the revs, like a centrifugal clutch, so it can neither stall nor bog the engine; once the car has
// caught up it stays in. It knows nothing about grip: with a lot of power it will spin the tyres.
function autoClutch(dt) {
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
  const r = engine.redline;
  const want = !gear ? 1 : rpm > r - 200 && gear < topGear() && locked ? gear + 1
    : locked && gear > 1 && rpm < 0.45 * r ? gear - 1 : gear;
  if (want !== gear) moveLever(want);
}

// ---- steering: a robot hand on the wheel (it turns by itself as the car moves over) ----
// the nearest car going your way ahead in lane x: how far its back is from your front, and how fast you close on it
function carAhead(x) {
  let near = null;
  for (const c of traffic) if (c.dir > 0 && sameLane(c.x, x) && c.z > odo && (!near || c.z < near.z)) near = c;
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
  if (wheel.held || !settled()) return;
  const a = carAhead(MY_LANES[lane]);
  if (a && a.closing > 0 && a.gap / a.closing < 1.8 && laneClear(MY_LANES[1 - lane], a.gap + 20)) moveOver();
}

// autocruise: drives the whole run like a good driver. It takes whichever lane lets it go further before catching
// a slower car, moves over only when nobody is alongside, and keeps right when that costs nothing. When it can't get
// past, it is adaptive cruise control: it brakes, late and firmly, to match the car ahead's speed before reaching it
// (from 300 km/h that still takes a couple of hundred metres), then follows until there is a way past.
let cruiseBrake = false; // it has its foot on the brake (so it knows to take it off again)
function autocruise() {
  if (wheel.held) return;
  const reach = a => a && a.closing > 0 ? a.gap / a.closing : Infinity; // s until you'd hit it
  const mine = carAhead(MY_LANES[lane]), theirs = carAhead(MY_LANES[1 - lane]);
  const roomBeside = laneClear(MY_LANES[1 - lane], MY_FRONT + 6) && reach(theirs) > 2.5; // can move over now, safely
  const escape = roomBeside && reach(theirs) > reach(mine) + 0.5; // the other lane goes further
  if (settled() && (escape && reach(mine) < 8 || lane === 1 && roomBeside && reach(mine) > 6 && reach(theirs) > 8)) moveOver();
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
