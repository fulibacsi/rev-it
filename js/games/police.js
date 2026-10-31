// Police heat, the end of the War Rig act. Totals and shots raise the heat (progress.wanted, 0 to 1), slowly, so you
// have to push for it; it stays between races and can't be bribed down. The police scanner on the right A-pillar shows
// it. The hotter, the more police: they never come at you from behind (there is no rear view), they overtake you, cut
// in and brake; while you drive in the oncoming lanes they floor it at you head-on. Past the top the tank comes
// (boss.js). Once the car is a war rig (fortress.js) they send their pursuit SUVs too, the notable enemy among them.

// heat a total (by kind) or a shot: 2.2 times half the first guesses, in step with the scrap, so 100% comes about as
// the guns can be afforded and act 4 takes about 15 races (act4.py); a shot's is unchanged
const WANTED = { car: 0.022, racer: 0.033, police: 0.088, gang: 0.011, shot: 0.00025 };
function raiseHeat(by) { // debug mode: ten times quicker, to get to the tank
  if (arOn()) progress.wanted = Math.min(1, progress.wanted + by * (debugSave ? 10 : 1));
}

// a police car every 30 s when barely wanted, every 6 s at the top (the first one too: copClock starts a run at that);
// two on the road at most. It takes over a car that is out of sight up the road; with no room to come past you, it
// waits
const copEvery = () => 30 - 24 * progress.wanted;
let copClock = 0;
// a pursuit SUV (Claude's, 30 Oct; the owner's: "police's buffed up SUV pursuers" for act 5's reticle): on the war rig
// a police car sent is one, the hotter the likelier (at 100%, always), one at a time. Armored, so it is the cannon's and
// the guns' (rams barely scratch it, as the tank), and it doesn't leave: braked, it drops back past you and comes
// again, until it is totaled. Health (three shells), scrap, size (m). First guesses, for act5.py
const SUV = { hp: 600, scrap: 110, w: 2.1, h: 1.9 };
const suvChance = () => rigged() && !traffic.some(c => c.suv && !c.wreck) ? progress.wanted : 0;
function updatePolice(dt) {
  if (!arOn() || !progress.wanted) return;
  copClock -= dt;
  if (copClock > 0 || traffic.filter(c => c.police && !c.wreck).length >= 2) return;
  // from behind in the lane beside you (fortress.js sideLane); with none (the oncoming lanes, or a fortress filling your
  // side) head-on, in the oncoming lane nearest you
  const c = traffic.find(c => !c.racer && !c.police && !c.tank && !c.rig && c !== target && c !== quarry && c.z - odo > 600), other = sideLane();
  if (!c || other != null && !laneClear(MY_LANES[other], 10)) return;
  copClock = copEvery();
  const chance = suvChance(), suv = chance > 0 && rand() < chance; // the traffic's dice only on the war rig
  const reset = { police: true, suv, w: suv ? SUV.w : undefined, h: suv ? SUV.h : undefined, hp: null, wreck: false, swerve: null,
                  warned: false, beams: 0, d: NaN, hit: -Infinity };
  if (other == null) Object.assign(c, reset, { dir: -1, lane: Math.max(2, lane), x: ROAD_LANES[Math.max(2, lane)], z: odo + 450, v: 25, want: 70 });
  else Object.assign(c, reset, { dir: 1, lane: other, x: MY_LANES[other], z: odo - 60, v: speed + 20, stage: 'pass',
                                 passing: true }); // from behind, in your other lane
}

// how a police car drives (road.js updateTraffic), its lights flashing. Head-on: flat out at you, steering for you
// until 1.2 s out, so you can still get out of its way. From behind: past you, into your lane 30 m ahead of you, a
// hard stop for 2.5 s, then off up the road; an SUV instead drops back past you in your other lane, 30 m behind, and
// comes past again
function policeDrive(c, dt) {
  c.look = (c.suv ? SUV_LOOKS : POLICE)[Math.floor(performance.now() / 250) % 2];
  if (c.dir < 0) {
    c.v = Math.min(c.want, c.v + 8 * dt);
    if ((c.z - odo) / Math.max(1, speed + c.v) > 1.2) c.x += clamp(carX - c.x, -3 * dt, 3 * dt);
    c.z -= c.v * dt;
    return;
  }
  const ahead = c.z - odo;
  c.passing = ahead < 0;
  if (c.stage === 'pass' && ahead > 30 && lane <= 1) Object.assign(c, { stage: 'cut', lane });
  if (c.stage === 'pass') c.v = speed + 20; // 20 m/s quicker than you, however fast you go
  else if (c.stage === 'cut') { c.v = speed + 2; if (Math.abs(c.x - MY_LANES[c.lane]) < 0.3) Object.assign(c, { stage: 'brake', t: 2.5 }); }
  else if (c.stage === 'brake') {
    c.v = Math.max(0, c.v - 9 * dt);
    if ((c.t -= dt) <= 0) Object.assign(c, c.suv ? { stage: 'back' } : { stage: 'leave', want: speed + 30 });
  } else if (c.stage === 'back') { // the SUV: into the lane beside you, and back behind you; with none, off it goes
    const side = sideLane();
    if (side == null) Object.assign(c, { stage: 'leave', want: speed + 30 });
    else { c.v = Math.max(0, speed - 12); c.lane = side; if (ahead < -30) c.stage = 'pass'; }
  } else c.v += clamp(c.want - c.v, -9 * dt, 6 * dt);
  c.x += clamp(MY_LANES[c.lane] - c.x, -3 * dt, 3 * dt);
  c.z += c.v * dt;
}

// the police's helicopter (the owner, 30 Oct: "the police's buffed-up SUV pursuers and helicopters", for act 5's
// reticle; Claude's design, 31 Oct): on the war rig, from half heat, one at a time, never in the tank's race. It flies in
// from up the road and hovers ahead of you over one of the fortress's lanes, its searchlight on it: a beat to get off
// it. Then it strafes it: a burst walking down the lane at you, and the rounds that reach you hit the board's column over
// that lane, front to back (fortress.js strafe), or nothing if no column is over it any more. Notable: the reticle's,
// the cannon's and the guns'. Shot down it falls onto the road and drops its gun or its turbine. It flies over the
// traffic (dir 0: no car brakes behind it or goes round it). First guesses, for act5.py
const HELI = { hp: 800, scrap: 160, heat: 0.5, first: 20, every: 30, ahead: 60, alt: 7, aim: 1.5, walk: 0.8, rounds: 6, gap: 0.07,
               hit: 5, again: 4, w: 9, h: 4 }; // from half heat; s; m ahead and up; s of searchlight, of the burst walking at
                                                // you, between its rounds on you; % a round; s before it aims again; m
let heliClock = 0, puffs = []; // s to the next one; its rounds' dust on the road, { x, z, t }
function updateHeli(dt) { // distance.js updateRun
  if (!rigged() || run.boss || progress.wanted < HELI.heat || traffic.some(c => c.heli && !c.wreck) || (heliClock -= dt) > 0) return;
  const c = traffic.find(c => !c.racer && !c.police && !c.tank && !c.rig && !c.fleet && c !== target && c !== quarry && c.z - odo > 600);
  if (!c) return;
  heliClock = HELI.every;
  Object.assign(c, { heli: true, dir: 0, look: HELI_LOOKS[0], w: HELI.w, h: HELI.h, hp: null, wreck: false, swerve: null, warned: false,
                     beams: 0, d: NaN, hit: -Infinity, x: carX, z: odo + 400, v: speed, alt: 3 * HELI.alt, stage: 'come' });
  flash('HELICOPTER!', '#f55', false);
}
function heliDrive(c, dt) { // road.js updateTraffic: ahead of you however fast you go, coming down to its height
  c.look = HELI_LOOKS[Math.floor(performance.now() / 90) % 2]; // its rotor turning, its lights flashing
  c.v = Math.max(0, speed + (HELI.ahead - (c.z - odo)) * 0.8);
  c.z += c.v * dt;
  c.alt += clamp(HELI.alt - c.alt, -5 * dt, 5 * dt);
  if (c.stage === 'come') { if (c.z - odo < HELI.ahead + 15) aimHeli(c); }
  else if (c.stage === 'aim') { c.x += clamp(c.aim - c.x, -5 * dt, 5 * dt); if ((c.t -= dt) <= 0) Object.assign(c, { stage: 'fire', t: 0, shot: 0, puffed: -1, hits: 0 }); }
  else if (c.stage === 'fire') strafeRun(c, dt);
  else if ((c.t -= dt) <= 0) aimHeli(c); // waited
}
function aimHeli(c) { // its searchlight on one of the lanes the fortress covers, at random
  Object.assign(c, { stage: 'aim', t: HELI.aim, aim: ROAD_LANES[lane + Math.floor(rand() * rigW)] });
}
function strafeRun(c, dt) { // the burst walks down the lane at you, dust and tracers; then its rounds hit you, front to back
  c.t += dt;
  const now = performance.now();
  if (c.t < HELI.walk) {
    if (c.t - c.puffed < 0.06) return;
    c.puffed = c.t;
    const p = { x: c.aim, z: c.z - (c.z - odo - MY_FRONT) * c.t / HELI.walk, t: now };
    puffs.push(p);
    tracers.push([c, p, now]); // gang.js: drawn to the dust (road.js marks it seen)
    return;
  }
  while (c.shot < HELI.rounds && c.t >= HELI.walk + c.shot * HELI.gap) {
    if (strafe(HELI.hit, c.aim, Math.floor(c.shot * boardH() / HELI.rounds))) { c.hits++; shake = Math.max(shake, 0.2); } // fortress.js
    tracers.push([c, 'you', now]);
    if (++c.shot === HELI.rounds) {
      flash(c.hits ? 'STRAFED' : 'DODGED', c.hits ? '#f55' : '#3f6', false);
      Object.assign(c, { stage: 'wait', t: HELI.again });
    }
    if (wrecked()) return finishRun('wrecked');
  }
}
const heliMarks = () => { // distance.js roadMarks: the searchlight, a little beyond it so it draws first; the dust
  const now = performance.now(), c = traffic.find(c => c.heli && !c.wreck && c.stage === 'aim');
  puffs = puffs.filter(p => now - p.t < 300);
  return [...c ? [{ z: c.z + 0.5, kind: 'spot', value: { x: c.aim, alt: c.alt } }] : [], ...puffs.map(p => ({ z: p.z, kind: 'dust', value: p, ref: p }))];
};

// the scanner: ten lights for the heat, a readout, and red and blue while the police are on the road
function renderPolice() {
  const on = run.phase !== 'garage' && arOn();
  document.body.classList.toggle('has-heat', on);
  if (!on) return;
  const lit = Math.round(progress.wanted * 10), cops = traffic.some(c => c.police && !c.wreck), now = performance.now();
  [...$('scanner-leds').children].forEach((r, i) => r.setAttribute('fill', i >= lit ? '#2a2a30' : i < 5 ? '#4c4' : i < 8 ? '#fb3' : '#f33'));
  $('scanner-lcd').textContent = cops ? (now % 600 < 400 ? 'PURSUIT' : '') : `HEAT ${Math.round(progress.wanted * 100)}%`;
  $('scanner-light').setAttribute('fill', cops ? (now % 500 < 250 ? '#f33' : '#36f') : '#333');
}
