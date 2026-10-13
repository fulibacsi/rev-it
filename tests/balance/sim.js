// In-page fast simulation: a bot drives one run with the real physics and aids, faster than real time.
// skill scales how long each hand/foot action takes (1 = practised, 2 = casual).
window.TRAVEL = 0.35; window.REACT = 0.3; window.TRACE_EVERY = 30;
window.simRun = (levels, engineIdx = 0, skill = 1, off = {}, withTraffic = false) => {
  window.passedAt = null;
  progress.levels = { ...levels }; progress.engine = engineIdx; progress.off = { ...off };
  if (game !== DISTANCE) play(DISTANCE); // the merged app: Distance is one of the games
  refreshCar();
  startRun();
  if (!withTraffic) traffic.forEach(c => { c.dir = -1; c.x = LANES.oncoming[0]; }); // a run on an empty road
  let crashes = 0, swerveAt = null;
  Object.assign(lever, { x: 0, y: 0, held: false, grinding: false, path: null });
  state = 'running'; rpm = engine.idle; throttle = boost = cutLeft = 0; lifted = true;
  const dt = 1 / 120, S = skill, queue = [];
  let act = null, at = 0, now = 1e6, spinT = 0, stalls = 0, launched = false, shifts = 0, staged = false;
  window.trace = [];
  let hand = 'lever';
  const reach = c => { const t = c === hand ? 0 : TRAVEL; hand = c; return t; }; // moving the mouse to another control
  const ramp = (set, get, to, dur) => { let from; return { dur: dur * S, start() { from = get(); }, step(f) { set(from + (to - from) * f); } }; };
  const clutchTo = (to, d) => { queue.push(wait(reach('clutch'))); return ramp(v => { clutchPedal = v; }, () => clutchPedal, to, d); };
  const gasTo = (to, d) => { queue.push(wait(reach('gas'))); return ramp(v => { gasPedal = v; }, () => gasPedal, to, d); };
  const shiftTo = (g, d) => { let pts, len; queue.push(wait(reach('lever'))); return { dur: d * S,
    start() { lever.held = true; if (aid('clutch')) { clutchPedal = 1; clutch = 0; } const [x, y] = slotOf(g);
      pts = [[lever.x, lever.y], [lever.x, 0], [x, 0], [x, y]]; len = [0];
      for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); },
    step(f) { const L = f * len.at(-1); let i = 1; while (i < pts.length - 1 && len[i] < L) i++;
      const s = len[i] - len[i - 1], u = s ? (L - len[i - 1]) / s : 1;
      placeLever(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u);
      if (f >= 1) lever.held = false; } }; };
  const wait = d => ({ dur: d * S, start() {}, step() {} });
  for (let i = 0; i < 60 * 120 && run.phase !== 'finish'; i++) {
    if (!act && queue.length) { act = queue.shift(); at = 0; act.start(); }
    if (act) { at += dt; act.step(Math.min(1, at / act.dur)); if (at >= act.dur) act = null; }
    else if (state !== 'running') { // stalled: restart
      queue.push(wait(0.5), { dur: 1.2, start() { state = 'running'; rpm = engine.idle; stalls++; }, step() {} });
    } else if (run.phase === 'countdown' && !staged) {
      staged = true;
      if (!aid('gas')) queue.push(gasTo(1, 0.3));
      if (!aid('clutch')) queue.push(clutchTo(1, 0.3));
      if (!aid('shift')) queue.push(shiftTo(1, 0.5));
    } else if (run.phase === 'run' && !launched && gear) {
      launched = true;
      if (!aid('clutch')) queue.push(clutchTo(0, 0.8));
    } else if (run.phase === 'run' && gear && gear < topGear() && rpm > engine.redline - 250 && locked && !aid('shift')) {
      shifts++;
      queue.push(wait(REACT)); // noticing the revs are up
      if (!aid('clutch')) queue.push(clutchTo(1, 0.2));
      queue.push(shiftTo(gear + 1, 0.4));
      if (!aid('clutch')) queue.push(clutchTo(0, 0.4));
    }
    // a human at the wheel (without the steering aids): sees a slower car 2.5 s ahead, swerves 0.4 s later if clear
    if (withTraffic && run.phase === 'run' && !aid('steer') && !aid('cruise') && settled()) {
      const a = carAhead(MY_LANES[lane]);
      if (a && a.closing > 0 && a.gap / a.closing < 2.5) swerveAt ??= i + Math.round(0.4 * S / dt); else swerveAt = null;
      if (swerveAt !== null && i >= swerveAt) { if (laneClear(MY_LANES[1 - lane], 30)) moveOver(); swerveAt = null; }
    }
    if (window.RACER_BOT && run.phase === 'run') racerHabits();
    updateControls(dt); // the app's frame order: controls (the lever moves), aids, physics, the game
    updateAids(dt);
    stepCar(dt, updateEngine(dt, now));
    if (stalled) stalled = false;
    if (spinning) spinT += dt;
    updateRun(dt);
    if (run.revealed && window.passedAt == null) window.passedAt = +(runTime() - run.left).toFixed(1); // the moment #100 fell behind
    if (withTraffic) updateTraffic(dt, now / 1000);
    if (crashed) { crashed = false; crashes++; }
    if (i % TRACE_EVERY === 0 && trace.length < 400) trace.push([+(i * dt).toFixed(2), run.phase, gear, Math.round(rpm), +(speed * 3.6).toFixed(1),
      +gasPedal.toFixed(2), +throttle.toFixed(2), +clutchPedal.toFixed(2), +clutch.toFixed(2), locked, spinning, 0,
      +boost.toFixed(2), lever.path ? 'path' : '', +lever.y.toFixed(2)]);
    now += dt * 1000;
  }
  return { crashes, m: Math.round(odo), kmh: Math.round(speed * 3.6), gear, spin: +spinT.toFixed(1), stalls };
};

// a racer's habits on top of the aids: nitro when a racer is close ahead; the oncoming lanes when boxed in, and chicken
window.racerHabits = () => {
  const front = nearestRacers().front;
  nitroHeld = !!(lvl('nitro') && front && front.z - odo < 500 && progress.nitro > 0);
  if (!lvl('reckless')) return;
  const reach = a => a && a.closing > 0 ? a.gap / a.closing : Infinity;
  const oncoming = x => { let t = Infinity; for (const c of traffic) if (c.dir < 0 && sameLane(c.x, x) && c.z > odo - 5) t = Math.min(t, (c.z - odo) / Math.max(1, speed + c.v)); return t; };
  const settledHere = Math.abs(carX - ROAD_LANES[lane]) < 0.3;
  if (!settledHere) return;
  if (lane <= 1) { // boxed in on your side, the next lane over the line clear for a good while: go
    const mine = reach(carAhead(MY_LANES[lane])), other = reach(carAhead(MY_LANES[1 - lane]));
    const brave = lvl('chicken') && run.flashes > 0; // playing chicken: whatever comes can be flashed out of the way
    if (mine < 3 && other < 3 && speed > 15 && (oncoming(ROAD_LANES[2]) > 6 || brave) && lane === 1) changeLane(-1);
  } else {
    // a game of chicken: flash an oncoming car that can swerve out of the lane (flashLights' 800 ms wait is in real
    // time, so it is reset: simulated time runs much faster)
    const facing = traffic.find(c => sameLane(c.x, carX) && swerves(c) && (c.z - odo) / Math.max(1, speed + c.v) < 4.5);
    if (lvl('chicken') && run.flashes && facing) { flashedAt = -Infinity; flashLights(); }
    if (oncoming(ROAD_LANES[lane]) < 3.5 || reach(carAhead(MY_LANES[1])) > 4 && laneClear(MY_LANES[1], MY_FRONT + 6))
      changeLane(1); // back home: something is coming, or your side is open again
  }
};
