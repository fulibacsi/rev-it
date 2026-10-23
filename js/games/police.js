// Police heat, the end of the War Rig act. Totals and shots raise the heat (progress.wanted, 0 to 1), slowly, so you
// have to push for it; it stays between races and can't be bribed down. The police scanner on the right A-pillar shows
// it. The hotter, the more police: they never come at you from behind (there is no rear view), they overtake you, cut
// in and brake; while you drive in the oncoming lanes they floor it at you head-on. Past the top the tank comes
// (boss.js).

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
function updatePolice(dt) {
  if (!arOn() || !progress.wanted) return;
  copClock -= dt;
  if (copClock > 0 || traffic.filter(c => c.police && !c.wreck).length >= 2) return;
  const c = traffic.find(c => !c.racer && !c.police && !c.tank && c !== target && c.z - odo > 600), other = 1 - lane;
  if (!c || lane <= 1 && !laneClear(MY_LANES[other], 10)) return;
  copClock = copEvery();
  const reset = { police: true, hp: null, wreck: false, swerve: null, warned: false, beams: 0, d: NaN, hit: -Infinity };
  if (lane > 1) Object.assign(c, reset, { dir: -1, lane, x: ROAD_LANES[lane], z: odo + 450, v: 25, want: 70 });
  else Object.assign(c, reset, { dir: 1, lane: other, x: MY_LANES[other], z: odo - 60, v: speed + 20, stage: 'pass',
                                 passing: true }); // from behind, in your other lane
}

// how a police car drives (road.js updateTraffic), its lights flashing. Head-on: flat out at you, steering for you
// until 1.2 s out, so you can still get out of its way. From behind: past you, into your lane 30 m ahead of you, a
// hard stop for 2.5 s, then off up the road
function policeDrive(c, dt) {
  c.look = POLICE[Math.floor(performance.now() / 250) % 2];
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
  else if (c.stage === 'brake') { c.v = Math.max(0, c.v - 9 * dt); if ((c.t -= dt) <= 0) Object.assign(c, { stage: 'leave', want: speed + 30 }); }
  else c.v += clamp(c.want - c.v, -9 * dt, 6 * dt);
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
