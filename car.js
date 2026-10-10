// Drivetrain: gearbox, clutch, brake and road speed (longitudinal car physics as in Marco Monster's
// "Car Physics for Games": engine torque through the gear ratios against drag, rolling resistance and brakes).
const CAR = {
  wheel: 0.32,                                  // tyre radius, m
  gears: [0, 3.5, 2.1, 1.45, 1.1, 0.9, 0.75],   // gearbox ratios; index 0 is neutral
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

function ratio() { return CAR.gears[gear] * engine.final; }
function wheelRpm() { return speed * ratio() / CAR.wheel / RAD; } // engine rpm that matches the road speed

// torque the clutch holds before slipping: a margin over the engine's strongest pull
function clutchCapacity(e) { return 1.3 * e.inertia * e.drive * RAD * (e.turbo ? 1.2 : 1); }

// the gear lever moving into gear g (0 = neutral). Out of gear is always possible; into a gear with the engine
// running needs the clutch down, otherwise the gears grind and it won't go in.
function engage(g) {
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
