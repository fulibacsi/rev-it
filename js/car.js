// Drivetrain: gearbox, clutch, brake and road speed (longitudinal car physics as in Marco Monster's
// "Car Physics for Games": engine torque through the gear ratios against drag, rolling resistance and brakes).
const CAR = {
  wheel: 0.32,                                  // tyre radius, m
  gears: [0, 3.5, 2.1, 1.45, 1.1, 0.9, 0.75, 0.62], // gearbox ratios; index 0 is neutral; 7th: Distance's overdrive
  drag: 0.42,                                   // air drag, N per (m/s)²  (½ · air density · Cd · frontal area)
  roll: 200,                                    // rolling resistance, N
  brake: 11000,                                 // brake force, N
  grip: 0.9,                                    // tyre friction: drive force tops out at grip · weight (wheelspin)
  slide: 0.7,                                   // a spinning tyre only grips this share of that until it hooks up again
  bite: [0.25, 0.75],                           // clutch pedal travel: fully engaged above / free below this range
  stall: 0.5,                                   // stalls when dragged below this share of idle rpm
};
const RAD = 2 * Math.PI / 60; // rpm -> rad/s

// clutchPedal / brakePedal: 0..1 how far each pedal is pressed; clutch: engagement 0..1 (1 = pedal up);
// speed: m/s; odo: metres driven; locked: clutch and tyres not slipping; spinning: the tyres are (wheelspin)
let gear = 0, clutch = 1, clutchPedal = 0, brakePedal = 0, speed = 0, odo = 0, locked = false, stalled = false;
let spinning = false;
// lane: 0 the right lane, 1 the passing lane, 2 and 3 the oncoming lanes (ROAD_LANES in road.js), open up to
// openLanes; carX: the car's centre, m from the centre line, gliding over to its lane at slide m/s; crashed: ran
// into a car this step, impact: how ({ kmh, headOn }); brokenGears: gears that won't go in (Distance's damage)
let lane = 0, fromLane = 0, carX = 0, slide = 0, crashed = false, impact = null, openLanes = 2, brokenGears = [];
let steering = 1; // how quickly the car moves over (Distance's steering upgrade)

// the car as it left the factory (only the Distance garage tunes it)
const STOCK_GRIP = CAR.grip;
function stockCar() {
  for (const e of ENGINES) Object.assign(e, e.stock);
  CAR.grip = STOCK_GRIP; openLanes = 2; brokenGears = []; steering = 1;
}
function resetCar() { // standing in the right lane, in neutral, feet off the pedals
  speed = odo = 0; gear = 0; locked = spinning = false;
  clutchPedal = brakePedal = gasPedal = 0;
  lane = fromLane = 0; carX = ROAD_LANES[0]; slide = 0;
}

// lane changes: dir -1 to the left, +1 to the right. You stay on your side of the double yellow unless the oncoming
// lanes are open (reckless driving), and the car only moves over while it rolls, quicker the faster it goes.
function changeLane(dir) {
  const to = clamp(lane - dir, 0, openLanes - 1);
  if (to !== lane) { fromLane = lane; lane = to; }
}
function stepLane(dt) {
  const most = Math.min(3.5, speed * 0.15) * steering, want = clamp((ROAD_LANES[lane] - carX) * 2 * steering, -most, most);
  slide += clamp(want - slide, -6 * steering * dt, 6 * steering * dt); // steering in and out: an S-curve, not a jump
  carX += slide * dt;
}
// ran into car c: you lose most of your speed, down to well under its speed so it pulls away instead of being hit
// again, and a half-done lane change swerves back to where it came from
function bump(c) {
  impact = { kmh: Math.abs(speed - c.v) * 3.6, headOn: false };
  speed = Math.min(speed * 0.35, c.v * 0.4);
  if (Math.abs(ROAD_LANES[lane] - carX) > 0.5) [lane, fromLane] = [fromLane, lane]; // was pulling over into it: back
  crashed = true;
}
// ran head-on into an oncoming car: both speeds add up, and the car stops dead
function headOn(c) {
  impact = { kmh: (speed + c.v) * 3.6, headOn: true };
  speed = 0;
  crashed = true;
}

function ratio() { return CAR.gears[gear] * engine.final; }
function wheelRpm() { return speed * ratio() / CAR.wheel / RAD; } // engine rpm that matches the road speed
const revsIn = g => speed * CAR.gears[g] * engine.final / CAR.wheel / RAD; // ... and what it would be in gear g

// torque the clutch holds before slipping: a margin over the engine's strongest pull
function clutchCapacity(e) { return 1.3 * e.inertia * e.drive * RAD * (e.turbo ? 1.2 : 1) * (nitro ? NITRO : 1); }

// the gear lever moving into gear g (0 = neutral). Out of gear is always possible; into a gear with the engine
// running needs the clutch down, otherwise the gears grind and it won't go in.
function engage(g) {
  if (brokenGears.includes(g)) return false; // the gate has no slot for it any more
  if (g && g !== gear && state === 'running' && clutch > 0.3) return false;
  if (g !== gear) { gear = g; locked = false; }
  return true;
}

// N holding the car back: air, tyres, brakes and gravity along the slope (negative downhill)
function resistance() { return CAR.drag * speed * speed + CAR.roll + brakePedal * CAR.brake + engine.mass * 9.81 * roadSlope(odo); }
// torque at the crank that would just break the tyres loose in this gear while engine and wheels turn together
function gripTorque() {
  const e = engine, G = ratio(), Jc = e.mass * (CAR.wheel / G) ** 2, tyres = CAR.grip * e.mass * 9.81 * CAR.wheel / G;
  return (tyres * (e.inertia + Jc) - e.inertia * resistance() * CAR.wheel / G) / Jc; // solves passed = tyres below
}

// one physics step; alpha: the engine's free-rev acceleration (rpm/s) from updateEngine()
function stepCar(dt, alpha) {
  const e = engine, G = ratio(), running = state === 'running';
  stepLane(dt);
  const [bite0, bite1] = CAR.bite; // the clutch bites in the middle of the pedal's travel
  clutch = Math.min(1, Math.max(0, (bite1 - clutchPedal) / (bite1 - bite0)));
  const resist = resistance();
  // torque the clutch, or the tyres if they give first, can pass between engine and wheels
  const clutchCap = clutch * clutchCapacity(e);
  const tyreCap = (spinning ? CAR.slide : 1) * CAR.grip * e.mass * 9.81 * CAR.wheel / G;
  const cap = G && running ? Math.min(clutchCap, tyreCap) : 0;
  const push = f => { // drive force f (N) against the resistance; a stopped car only moves if f overcomes it
    if (speed <= 0 && f <= resist) speed = 0;
    else speed = Math.max(0, speed + (f - resist) / e.mass * dt);
  };
  odo += speed * dt;

  if (!cap) { // neutral, clutch down or engine not running: engine and wheels turn independently
    locked = spinning = false;
    if (running) rpm += alpha * dt;
    else if (state === 'off') rpm = Math.max(0, rpm - 2000 * dt); // spin down
    push(0);
    return;
  }
  const Te = e.inertia * alpha * RAD; // engine torque, Nm
  let passed = 0; // torque going through to the wheels while locked, Nm
  if (locked) { // engine and wheels turn together, so the engine also has to move the car
    const Jc = e.mass * (CAR.wheel / G) ** 2; // the car's mass as felt at the crank
    const accel = (Te - resist * CAR.wheel / G) / (e.inertia + Jc); // crank rad/s²
    passed = Te - e.inertia * accel;
    if (Math.abs(passed) <= cap) {
      speed = Math.max(0, speed + accel * CAR.wheel / G * dt);
      rpm = wheelRpm();
    } else locked = false; // more torque than the clutch or tyres can take: they start to slip
  }
  if (!locked) {
    // slip direction: as it is, or, the moment a lock breaks, the way the torque was pushing
    const slip = rpm - wheelRpm(), dir = Math.sign(slip) || Math.sign(passed), Tc = cap * dir;
    rpm += (Te - Tc) / e.inertia / RAD * dt;
    push(Tc * G / CAR.wheel);
    if (Math.sign(rpm - wheelRpm()) !== dir) { locked = true; rpm = wheelRpm(); } // speeds met: grab
  }
  spinning = !locked && tyreCap < clutchCap; // slipping, and it's the tyres that gave
  if (clutch > 0.5 && rpm < e.idle * CAR.stall) { state = 'off'; stalled = true; } // dragged down: stall
}
