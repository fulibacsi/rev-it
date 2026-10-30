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
  if (aid('hunter')) hunt(); // after autocruise, whose lane it overrules
  if (aid('autoflash')) autoFlash();
  if (reckless) recklessNitro(); // last: never while braking
}

const launchRpm = () => 0.6 * engine.redline; // revs to set off at: well into the pull, clear of the limiter

// auto clutch: out at once while the gear shifter moves, and on the line until GO so the revs can build. Coming in
// it follows the revs, like a centrifugal clutch, so it can neither stall nor bog the engine; once the car has
// caught up it stays in. It knows nothing about grip: with a lot of power it will spin the tires.
function autoClutch(dt) {
  if (touching('clutch')) return; // your foot on the clutch: it's yours
  if (lever.held || lever.path || run.phase === 'countdown') { clutchPedal = 1; return; }
  const e = engine, [b0, b1] = CAR.bite, from = 1.2 * e.idle;
  const bite = clamp((rpm - from) / (launchRpm() - from), 0, 1);
  const want = !gear ? clutchPedal : locked && rpm > 1.3 * e.idle || bite >= 1 ? 0 : b1 - bite * (b1 - b0);
  clutchPedal += clamp(want - clutchPedal, -dt / 0.3, dt / 0.3); // a smooth foot: full travel in 0.3 s
}

// auto gas: holds the launch revs on the line, otherwise flat out, shifts included (the limiter catches the revs
// while the clutch is out). Once the clutch has caught up it is traction control: no more gas than the tires can
// take (worked out from the torque the engine makes at these revs), and well under that if they spin anyway. Your
// foot on the brake lifts it off the gas on the move, as a driver would: it held the gas down, and braking by hand
// slowed the car less than half as hard (25 Oct). Your nitro pedal still floors it
function autoGas() {
  if (pushing()) return; // your own foot on the gas: it's yours (the nitro pedal only floors it, then this trims it)
  if (speed < 1 && (!gear || clutch < 0.05)) gasPedal = clamp(0.5 + (launchRpm() - rpm) / 800, 0, 1);
  else if (touching('brake') && !nitroHeld) gasPedal = 0;
  // in neutral (mid-shift, or a gear knocked out while the tires spin) the grip sum would divide by a ratio of 0
  else if (!gear || !locked && !spinning) gasPedal = 1;
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
  // gear in between, the two neighbors are far apart, and this keeps it from hunting between them
  const want = !gear ? up
    : rpm > r - 200 && up <= topGear() && locked && at(up) > 0.35 * r ? up
    : down >= 1 && at(gear) < 0.45 * r && at(down) < r - 400 ? down : gear;
  if (want !== gear) moveLever(want);
}

// ---- steering: a robot hand on the wheel (it turns by itself as the car moves over) ----
// the nearest car going your way ahead in lane x, leaving out any that past(c, x) says won't be in your way there. A
// wreck is never in the way: it can't be hit, and skids off (the aids swerved round the cars Hunter had just totaled)
function nextCar(x, past = () => false) {
  let near = null;
  for (const c of traffic) if (c.dir > 0 && !c.wreck && sameLane(c.x, x) && c.z > odo && !past(c, x) && (!near || c.z < near.z)) near = c;
  return near;
}
// Hunter (the War Rig page, the owner's idea, 18 Oct): autocruise hunts the car in the reticle (gang.js crewTarget;
// on the war rig the raiders' car, the reticle's being the cannon's): into its lane and into it, from as far as the
// reticle takes it (300 m). Within 150 m only, autocruise first steered round it, then Hunter swung back into its lane
// (the owner, 18 Oct: it "changes lanes to avoid traffic"). Not the tank (the guns are for that), not a car coming the
// other way, and not past 60% damage, so it doesn't wreck you
const hunted = c => !!c && c === crewTarget() && aid('hunter') && !c.tank && !c.wreck && c.dir > 0 && c.z > odo && progress.damage <= 60;
// a car to ram, not to avoid: lane assist doesn't swerve round it, autocruise doesn't brake for it or take it for a
// blocked lane. The one Hunter hunts; and, with a bull bar, a mad driver that has just cut in (Fuel madness, road.js)
const takeRam = c => hunted(c) || c.cut > 0 && lvl('bullbar') > 0;
// ... how far its back is from your front, and how fast you close on it
function carAhead(x, past) {
  const near = nextCar(x, past);
  return near && { gap: near.z - odo - MY_FRONT, closing: speed - near.v };
}
// room in lane x to move over into: nobody alongside, and nobody slower within `ahead` meters
function laneClear(x, ahead) {
  return !traffic.some(c => c.dir > 0 && !c.wreck && sameLane(c.x, x) && c.z + CAR_LEN > odo - MY_REAR - 3 && c.z < odo + ahead);
}
const settled = () => Math.abs(carX - MY_LANES[lane]) < 0.3; // not already moving over
const moveOver = () => changeLane(lane ? 1 : -1); // to the other lane

// lane assist: at the last moment (under 1.8 s from hitting a slower car) it swerves into the other lane if that is
// clear. It doesn't brake: boxed in, you still have to.
function laneAssist() {
  if (wheel.held || lane > 1 || !settled()) return; // on the wrong side of the road you are on your own
  const a = carAhead(MY_LANES[lane], takeRam);
  if (a && a.closing > 0 && a.gap / a.closing < 1.8 && laneClear(MY_LANES[1 - lane], a.gap + 20)) moveOver();
}

// autocruise: drives the whole run like a good driver. It takes whichever lane lets it go further before catching
// a slower car, moves over only when nobody is alongside, and keeps right when that costs nothing. When it can't get
// past, it is adaptive cruise control: it brakes, late and firmly, to match the car ahead's speed before reaching it
// (from 300 km/h that still takes a couple of hundred meters), then follows until there is a way past. It brakes for
// the first car you would hit: not one already moving out of your lane (for a flash, say), and nothing while that is
// a car to ram (the ram slows you to its speed; it braked for the car beyond the one Hunter was ramming).
let cruiseBrake = false; // the car it has its foot on the brake for, or false (so it knows to take it off again)
// m/s² of braking a stop would take before it starts braking, and while it keeps on: firm, as adaptive cruise control
// is, whatever the brakes could do. They are what it was tuned with (3/4 and 1/2 of the I6's old 0.75 g brakes):
// planned on 3/4 of the stronger brakes (18 Oct, up to 1.2 g) it braked later, got boxed in more often, and Reckless
// auto-drive took the oncoming lane into three times the head-ons
const CRUISE_BRAKE = 5.5, CRUISE_HOLD = 3.7;
function autocruise() {
  if (wheel.held || lane > 1) return; // it keeps to its side of the road; over there you are on your own
  const reach = a => a && a.closing > 0 ? a.gap / a.closing : Infinity; // s until you'd hit it
  const mine = carAhead(MY_LANES[lane], takeRam), theirs = carAhead(MY_LANES[1 - lane], takeRam);
  const roomBeside = laneClear(MY_LANES[1 - lane], MY_FRONT + 6) && reach(theirs) > 2.5; // can move over now, safely
  // which lane goes further: with auto flash and a flash left, an ordinary car is no obstacle (it will be flashed out
  // of the way), nor is one already moving out of the lane for a flash; a racer in front, which won't move over, is
  // overtaken in the other lane
  const leaving = (c, x) => takeRam(c) || (c.yielding ? !sameLane(MY_LANES[c.lane], x)
    : c !== crewTarget() && aid('autoflash') && run.flashes > 0 && yields(c, 1 - c.lane));
  const further = x => reach(carAhead(x, leaving));
  const escape = roomBeside && further(MY_LANES[1 - lane]) > further(MY_LANES[lane]) + 0.5;
  if (settled() && !hunted(crewTarget()) && // Hunter has the lanes while it hunts (it would keep right off the prey's lane)
      (escape && reach(mine) < 8 || lane === 1 && roomBeside && reach(mine) > 6 && reach(theirs) > 8)) moveOver();
  // your foot on the gas, or on NOS (not Reckless auto-drive's): no braking, no lift
  if (pushing() || nitroHeld) { if (cruiseBrake) { brakePedal = 0; cruiseBrake = false; } return; }
  if (touching('brake')) { cruiseBrake = false; return; } // your foot on the brake: it's yours
  const hardest = brakeDecel(); // m/s² the brakes can do
  const keep = 8 + 0.4 * speed; // following distance, m
  const first = nextCar(MY_LANES[lane], (c, x) => c.yielding && !sameLane(MY_LANES[c.lane], x));
  const block = first && !takeRam(first) ? { gap: first.z - odo - MY_FRONT, closing: speed - first.v } : null;
  const closing = block ? block.closing : 0, room = block ? block.gap - keep : Infinity;
  const needed = closing > 0 ? closing ** 2 / (2 * Math.max(1, room)) : 0; // to match its speed at that distance
  if (!escape && (needed > (cruiseBrake ? CRUISE_HOLD : CRUISE_BRAKE) || room < 0 && closing > 0)) { // brake: firmly, or
    gasPedal = 0;                                                                            // inside the gap
    brakePedal = clamp(needed / hardest, room < 0 ? 0.3 : 0.5, 1);
    cruiseBrake = first;
  } else {
    if (cruiseBrake) { brakePedal = 0; cruiseBrake = false; }
    if (!escape && room < 0) gasPedal = 0; // inside the gap but not closing: coast
  }
}

function hunt() { // into the hunted car's lane, on your side of the road; your hand on the wheel overrides it
  const c = crewTarget();
  if (wheel.held || lane > 1 || !settled() || !hunted(c)) return;
  const to = MY_LANES.findIndex(x => sameLane(x, c.x));
  if (to >= 0 && to !== lane) changeLane(lane < to ? -1 : 1);
}

// auto flash: flashes the car ahead in your lane when it is slower than you, under 4 s away (or as soon as autocruise
// starts braking for it: closing at 150-190 km/h in act 4 it braked from 5 s out, and slowed down instead of flashing,
// the owner, 18 Oct) and would move over: an ordinary car with room in your other lane. Never a racer, so no flash is
// wasted (autocruise overtakes those), nor the car in the War Rig's reticle (gang.js): that one is there to be
// rammed. With Game of chicken it plays in the oncoming lanes too: the car coming at you, once a flash would make it
// swerve
function autoFlash() {
  if (!run.flashes) return;
  if (lane > 1) { if (chicken && facing()) flashLights(); return; } // over there only a game of chicken moves them
  const c = nextCar(carX);
  if (c && c !== crewTarget() && c.v < speed - 2 && ((c.z - odo) / (speed - c.v) < 4 || c === cruiseBrake) && yields(c, 1 - lane)) flashLights();
}

// reckless auto-drive (Black market): autocruise without manners. Boxed in on your side it takes the near oncoming lane
// when nothing is coming for 6 s, or when whatever comes can be flashed out of the way (Game of chicken and a flash
// left). It goes home when something it can't flash away comes within 3.5 s (cutting in beside a car only to escape a
// head-on under 2 s away), or once your side is open again. While the tank is on the road it keeps to your side: it
// can't be passed (the owner, 14 Oct); and while Hunter hunts, it leaves your side to it. It pushes the nitro pedal when a racer is close ahead, the tires grip and
// neither it nor you is braking.
let tunedRevs = true; // the aids rev into the tune now (see updateAids)
// an oncoming car in your lane, under 4.5 s away, that a flash would make swerve: a game of chicken to play
const facing = () => traffic.find(c => sameLane(c.x, carX) && swerves(c) && (c.z - odo) / Math.max(1, speed + c.v) < 4.5);
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
  const tank = run.tank && !run.tank.wreck; // boss.js: it can't be passed, so no going round it into the traffic
  if (lane <= 1) {
    const boxed = reach(carAhead(MY_LANES[lane], takeRam)) < 3 && reach(carAhead(MY_LANES[1 - lane], takeRam)) < 3;
    if (lane === 1 && boxed && !tank && !hunted(crewTarget()) && speed > 15 && (meets(ROAD_LANES[2]) > 6 || brave)) changeLane(-1);
    return;
  }
  if (lane === 3) return changeLane(1); // the far oncoming lane: back toward your side
  if (brave && facing()) flashLights(); // a game of chicken, with or without Auto flash
  const coming = meets(ROAD_LANES[2]), home = laneClear(MY_LANES[1], MY_FRONT + 6);
  if (coming < 3.5 && (home || coming < 2) || home && (tank || reach(carAhead(MY_LANES[1])) > 4)) changeLane(1);
}
function recklessNitro() {
  const front = nearestRacers().front;
  nitroByAid = run.phase === 'run' && progress.nitro > 0 && !pushing() && !touching('brake') && !cruiseBrake && !spinning && gear >= 2 &&
    !!front && front.z - odo < 500;
}
