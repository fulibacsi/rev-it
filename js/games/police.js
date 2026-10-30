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
  const c = traffic.find(c => !c.racer && !c.police && !c.tank && !c.rig && c !== target && c !== quarry && c.z - odo > 600), other = 1 - lane;
  if (!c || lane <= 1 && !laneClear(MY_LANES[other], 10)) return;
  copClock = copEvery();
  const chance = suvChance(), suv = chance > 0 && rand() < chance; // the traffic's dice only on the war rig
  const reset = { police: true, suv, w: suv ? SUV.w : undefined, h: suv ? SUV.h : undefined, hp: null, wreck: false, swerve: null,
                  warned: false, beams: 0, d: NaN, hit: -Infinity };
  if (lane > 1) Object.assign(c, reset, { dir: -1, lane, x: ROAD_LANES[lane], z: odo + 450, v: 25, want: 70 });
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
  } else if (c.stage === 'back') { // the SUV: into the lane you're not in, and back behind you
    c.v = Math.max(0, speed - 12);
    if (lane <= 1) c.lane = 1 - lane;
    if (ahead < -30) c.stage = 'pass';
  } else c.v += clamp(c.want - c.v, -9 * dt, 6 * dt);
  c.x += clamp(MY_LANES[c.lane] - c.x, -3 * dt, 3 * dt);
  c.z += c.v * dt;
}

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
