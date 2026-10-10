// Drivetrain: gearbox, clutch, brake and road speed (longitudinal car physics as in Marco Monster's
// "Car Physics for Games": engine torque through the gear ratios against drag, rolling resistance and brakes).
const CAR = {
  wheel: 0.32,                                  // tyre radius, m
  final: 3.9,                                   // differential ratio
  gears: [0, 3.5, 2.1, 1.45, 1.1, 0.9, 0.75],   // gearbox ratios; index 0 is neutral
  drag: 0.42,                                   // air drag, N per (m/s)²  (½ · air density · Cd · frontal area)
  roll: 200,                                    // rolling resistance, N
  brake: 11000,                                 // brake force, N
  grip: 0.9,                                    // tyre friction: drive force tops out at grip · weight (wheelspin)
  clutchIn: 0.12, clutchOut: 0.6,               // seconds to press / let out the clutch pedal
  stall: 0.5,                                   // stalls when dragged below this share of idle rpm
};
const RAD = 2 * Math.PI / 60; // rpm -> rad/s

// clutch: engagement 0..1 (1 = pedal up); speed: m/s; odo: metres driven; locked: clutch and tyres not slipping
let gear = 0, clutch = 1, clutchDown = false, braking = false, speed = 0, odo = 0, locked = false, stalled = false;

function ratio() { return CAR.gears[gear] * CAR.final; }
function wheelRpm() { return speed * ratio() / CAR.wheel / RAD; } // engine rpm that matches the road speed

// torque the clutch holds before slipping: a margin over the engine's strongest pull
function clutchCapacity(e) { return 1.3 * e.inertia * (e.redline + 1000 - e.idle) / e.tauUp * RAD * (e.turbo ? 1.2 : 1); }

// shift one gear up or down; with the engine running that needs the clutch down, otherwise the gears grind
function shift(step) {
  const next = Math.min(CAR.gears.length - 1, Math.max(0, gear + step));
  if (next === gear) return true;
  if (state === 'running' && clutch > 0.3) return false;
  gear = next;
  locked = false;
  return true;
}

// one physics step; alpha: the engine's free-rev acceleration (rpm/s) from updateEngine()
function stepCar(dt, alpha) {
  const e = engine, G = ratio(), running = state === 'running';
  clutch = clutchDown ? Math.max(0, clutch - dt / CAR.clutchIn) : Math.min(1, clutch + dt / CAR.clutchOut);
  const resist = CAR.drag * speed * speed + CAR.roll + (braking ? CAR.brake : 0); // N holding the car back
  // torque the clutch, or the tyres if they give first, can pass between engine and wheels
  const cap = G && running ? Math.min(clutch * clutchCapacity(e), CAR.grip * e.mass * 9.81 * CAR.wheel / G) : 0;
  const push = f => { // drive force f (N) against the resistance; a stopped car only moves if f overcomes it
    if (speed <= 0 && f <= resist) speed = 0;
    else speed = Math.max(0, speed + (f - resist) / e.mass * dt);
  };
  odo += speed * dt;

  if (!cap) { // neutral, clutch down or engine not running: engine and wheels turn independently
    locked = false;
    if (running) rpm += alpha * dt;
    else if (state === 'off') rpm = Math.max(0, rpm - 2000 * dt); // spin down
    push(0);
    return;
  }
  const Te = e.inertia * alpha * RAD; // engine torque, Nm
  if (locked) { // engine and wheels turn together, so the engine also has to move the car
    const Jc = e.mass * (CAR.wheel / G) ** 2; // the car's mass as felt at the crank
    const accel = (Te - resist * CAR.wheel / G) / (e.inertia + Jc); // crank rad/s²
    if (Math.abs(Te - e.inertia * accel) <= cap) {
      speed = Math.max(0, speed + accel * CAR.wheel / G * dt);
      rpm = wheelRpm();
    } else locked = false; // more torque than the clutch or tyres can take: they start to slip
  }
  if (!locked) {
    const slip = rpm - wheelRpm(), Tc = cap * Math.sign(slip);
    rpm += (Te - Tc) / e.inertia / RAD * dt;
    push(Tc * G / CAR.wheel);
    if (Math.sign(rpm - wheelRpm()) !== Math.sign(slip)) { locked = true; rpm = wheelRpm(); } // speeds met: grab
  }
  if (clutch > 0.5 && rpm < e.idle * CAR.stall) { state = 'off'; stalled = true; } // dragged down: stall
}
