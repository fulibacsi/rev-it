// Driver aids from the garage: robot feet and a robot hand working the same pedals and lever as the player, so you
// can watch them do it. Each one only works while bought, switched on and a run is under way (aid() in distance.js).

function updateAids(dt) {
  if (state !== 'running') return;
  if (aid('shift')) autoShift();
  if (aid('clutch')) autoClutch(dt);
  if (aid('gas')) autoGas(dt);
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
