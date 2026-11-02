// Police heat, the end of the War Rig act. Totals and shots raise the heat (progress.wanted, 0 to 1), slowly, so you
// have to push for it; it stays between races and can't be bribed down. The police scanner on the right A-pillar shows
// it. The hotter, the more police: they never come at you from behind (there is no rear view), they overtake you, cut
// in and brake; while you drive in the oncoming lanes they floor it at you head-on. Past the top the tank comes
// (boss.js). Once the car is a war rig (fortress.js) the heat and its scanner retire: the police come in their
// ambushes, with their pursuit SUVs and helicopters.

// heat a total (by kind) or a shot: 2.2 times half the first guesses, in step with the scrap, so 100% comes about as
// the guns can be afforded and act 4 takes about 15 races (act4.py); a shot's is unchanged
const WANTED = { car: 0.022, racer: 0.033, police: 0.088, gang: 0.011, shot: 0.00025 };
function raiseHeat(by) { // debug mode: ten times quicker, to get to the tank. On the war rig heat retires (fortress.js
  if (arOn() && !rigged()) progress.wanted = Math.min(1, progress.wanted + by * (debugSave ? 10 : 1)); // ambushes)
}

// a police car every 30 s when barely wanted, every 6 s at the top (the first one too: copClock starts a run at that);
// two on the road at most. It takes over a car that is out of sight up the road; with no room to come past you, it
// waits
const copEvery = () => 30 - 24 * progress.wanted;
let copClock = 0;
// a pursuit SUV (Claude's, 30 Oct; the owner's: "police's buffed up SUV pursuers" for act 5's reticle): armored, so it
// is the cannon's and the guns' (rams barely scratch it, as the tank). On the war rig the police come only in their
// ambushes (fortress.js), SUVs among them, and an SUV comes head-on (the owner, 2 Nov: "they come from the incoming
// lane, straight at you, like kamikaze", Need for Speed: Most Wanted's): from far up the road in the oncoming lane
// nearest you, flat out, steering for you until 1.2 s out as a police car head-on does, so you can still get out of
// its way, or shoot it on the way in. Into you, it slams the front of the column it hits and wrecks itself (no scrap,
// no crate: it was its doing), the rig ramming on, however wide; missed, it turns and comes again, until it is
// totaled. Health (three shells), scrap, size (m); m up the road it comes from, m/s, % the slam (a head-on rammed
// through is 20). First guesses, for act5.py
const SUV = { hp: 600, scrap: 110, w: 2.1, h: 1.9, from: 900, charge: 40, slam: 30 };
// on the war rig a police car rams you (the factions, 2 Nov: "police rams you directly"; Claude's numbers, for
// act5.py): it comes up from behind and rams your back row, or comes level with your rear in the lane beside you and
// swings into your side, a PIT (that side's back cell, a shove across and a jolt). Each time your bull bar and spikes
// hurt it as a ram of yours does; it drops back and comes again, three times, then falls behind and is gone. % a ram
// and a PIT before Armor plating; m/s quicker than you; m it drops back; rams before it gives up
const RAM = { rear: 4, pit: 5, closing: 8, back: 25, rams: 3 };
function updatePolice(dt) { // act 4: the heat sends them (on the war rig, the ambushes do)
  if (!arOn() || !progress.wanted || rigged()) return;
  copClock -= dt;
  if (copClock > 0 || traffic.filter(c => c.police && !c.wreck).length >= 2) return;
  if (sendCop(false)) copClock = copEvery();
}
// a police car (or an SUV) takes over a car out of sight up the road. In act 4: from behind in the lane beside you
// (fortress.js sideLane); with none (the oncoming lanes) head-on, in the oncoming lane nearest you. On the war rig: a
// police car from behind, to ram you; an SUV head-on, kamikaze (above). False if there is no car to take, or no room
// to come past you
function sendCop(suv) {
  const c = traffic.find(c => takeable(c) && c.z - odo > 600);
  if (!c) return false;
  const reset = { police: true, suv, w: suv ? SUV.w : undefined, h: suv ? SUV.h : undefined, hp: null, wreck: false, swerve: null,
                  warned: false, beams: 0, d: NaN, hit: -Infinity };
  if (rigged()) return suv ? charge(Object.assign(c, reset)) : chase(Object.assign(c, reset));
  const other = sideLane();
  if (other != null && !laneClear(MY_LANES[other], 10)) return false;
  if (other == null) Object.assign(c, reset, { dir: -1, lane: Math.max(2, lane), x: ROAD_LANES[Math.max(2, lane)], z: odo + 450, v: 25, want: 70 });
  else Object.assign(c, reset, { dir: 1, lane: other, x: MY_LANES[other], z: odo - 60, v: speed + 20, stage: 'pass',
                                 passing: true }); // from behind, in your other lane
  return true;
}

function charge(c) { // an SUV head-on at the war rig (above), from far up the road; again once it has missed
  const at = Math.max(2, lane); // the oncoming lane nearest you (road.js ROAD_LANES)
  return Object.assign(c, { dir: -1, lane: at, x: ROAD_LANES[at], z: odo + SUV.from, v: SUV.charge, want: SUV.charge, warned: false, beams: 0 });
}
function chase(c) { // a police car at the war rig (above): from behind, up the lane beside you for a PIT, or one of yours
  const side = sideLane(), pit = side != null && laneClear(MY_LANES[side], 10) && rand() < 0.5;
  const at = pit ? MY_LANES[side] : ROAD_LANES[lane + Math.floor(rand() * rigW)]; // car.js: lane the rig's rightmost
  return Object.assign(c, { dir: 1, x: at, at, z: odo - 60, v: speed + 20, stage: 'chase', pit, rams: 0, passing: true });
}

// how a police car drives (road.js updateTraffic), its lights flashing. Head-on: flat out at you, steering for you
// until 1.2 s out, so you can still get out of its way. From behind: past you, into your lane 30 m ahead of you, a
// hard stop for 2.5 s, then off up the road. On the war rig a police car rams instead (rammerDrive), and an SUV that
// has missed you comes again
function policeDrive(c, dt) {
  c.look = (c.suv ? SUV_LOOKS : POLICE)[Math.floor(performance.now() / 250) % 2];
  if (c.dir < 0) {
    c.v = Math.min(c.want, c.v + 8 * dt);
    if ((c.z - odo) / Math.max(1, speed + c.v) > 1.2) c.x += clamp(carX - c.x, -3 * dt, 3 * dt);
    c.z -= c.v * dt;
    if (c.suv && c.z < odo - 30) charge(c); // turned round, up the road again (before road.js lets it go)
    return;
  }
  if (c.stage === 'chase' || c.stage === 'swing' || c.stage === 'back' || c.stage === 'gone') return rammerDrive(c, dt);
  const ahead = c.z - odo;
  c.passing = ahead < 0;
  if (c.stage === 'pass' && ahead > 30 && lane <= 1) Object.assign(c, { stage: 'cut', lane });
  if (c.stage === 'pass') c.v = speed + 20; // 20 m/s quicker than you, however fast you go
  else if (c.stage === 'cut') { c.v = speed + 2; if (Math.abs(c.x - MY_LANES[c.lane]) < 0.3) Object.assign(c, { stage: 'brake', t: 2.5 }); }
  else if (c.stage === 'brake') {
    c.v = Math.max(0, c.v - 9 * dt);
    if ((c.t -= dt) <= 0) Object.assign(c, { stage: 'leave', want: speed + 30 });
  } else c.v += clamp(c.want - c.v, -9 * dt, 6 * dt);
  c.x += clamp(MY_LANES[c.lane] - c.x, -3 * dt, 3 * dt);
  c.z += c.v * dt;
}
// a police car at the war rig (chase, above): up behind you; for a PIT level with your rear quarter in the lane beside
// you (its front 1.5 m past your back), then its side into yours; else straight into your back. Then it drops back and
// comes again, until it has rammed you three times; then it falls behind, back into the traffic (road.js)
function rammerDrive(c, dt) {
  // where its front meets your back; touching (road.js onCar, a hair sooner, so the ram is its and not a bump of yours)
  const behind = odo - MY_REAR - CAR_LEN, reach = CAR_W + 1.75 * (rigW - 1) + 0.2, side = sideLane();
  if (c.pit && side == null) c.pit = false; // widened: from behind instead
  if (c.stage !== 'gone') c.at = c.pit ? MY_LANES[side] : yours(c.at); // you changed lanes: after you
  if (c.stage === 'chase' && c.pit) {
    c.v = speed + clamp((behind + 1.5 - c.z) * 1.5, -10, RAM.closing + 12);
    if (Math.abs(behind + 1.5 - c.z) < 1 && Math.abs(c.x - c.at) < 0.3) c.stage = 'swing';
  } else if (c.stage === 'chase') c.v = speed + RAM.closing;
  else if (c.stage === 'swing') { c.v = speed; c.x += clamp(carX - c.x, -4 * dt, 4 * dt); }
  else if (c.stage === 'back') {
    c.v = speed - 6;
    if (c.z - odo < -RAM.back) c.stage = c.rams >= RAM.rams ? 'gone' : 'chase';
  } else { c.v = speed - 15; if (c.z - odo < -60) c.passing = false; } // gone: road.js takes it back into the traffic
  if (c.stage !== 'swing') c.x += clamp(c.at - c.x, -3 * dt, 3 * dt);
  c.z += c.v * dt;
  // contact, once it has moved: a long frame (or the simulations' steps) carried it past the moment, into you, and
  // road.js took it for a car you ran into (a fortress crushed it)
  if (c.stage === 'swing' && Math.abs(c.x - carX) < reach) copRam(c, true);
  else if (c.stage === 'chase' && !c.pit && c.z >= behind - 0.3 && Math.abs(c.x - carX) < reach) copRam(c, false);
}
// the rig's lane nearest x (car.js: lane the rightmost of the rigW it covers)
const yours = x => ROAD_LANES.slice(lane, lane + rigW).reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a);
function copRam(c, pit) { // its front into your back, or its side into your rear quarter: a hit, a jolt; it drops back
  c.rams++;
  c.stage = 'back';
  shake = Math.max(shake, pit ? 0.45 : 0.35); // main.js
  crashSound();
  flash(pit ? 'PIT!' : 'RAMMED', '#f55', false);
  if (pit) { // knocked across and slowed, the hit on its side's back cell (fortress.js); it bounces off, clear of you
    slide += 3 * Math.sign(carX - c.x); // car.js: steered back
    c.x = carX + Math.sign(c.x - carX) * (CAR_W + 1.75 * (rigW - 1) + 0.3);
    speed *= 0.93;
    hitCell(RAM.pit * (1 - armorCut()), c.x < carX ? 0 : boardW() - 1, boardH() - 1);
  } else { c.z = odo - MY_REAR - CAR_LEN - 0.5; speed += 1.5; strike(RAM.rear, c.x, c.z); } // shoved on; on the back row
  ram({ car: c, kmh: 40, side: pit }); // gang.js: your bull bar and spikes, as a ram of yours
  if (wrecked()) finishRun('wrecked');
}
function slam(c) { // road.js: a kamikaze SUV into the war rig (above), the rig ramming on
  Object.assign(c, { wreck: true, hp: 0, dir: 1, v: 0 });
  if (c === target) target = nextTarget(); // gang.js
  speed *= 0.7;
  shake = Math.max(shake, 0.8);
  crashSound();
  flash('SLAMMED', '#f55', false);
  strike(SUV.slam, c.x, c.z); // fortress.js: head-on, on the front row
  if (wrecked()) finishRun('wrecked');
}

// the police's helicopter (the owner, 30 Oct: "the police's buffed-up SUV pursuers and helicopters", for act 5's
// reticle; Claude's design, 31 Oct): on the war rig, one at a time, in the police's ambushes (fortress.js). It flies in
// from up the road and hovers ahead of you over one of the fortress's lanes, its searchlight on it: a beat to get off
// it. Then it drops a spike strip across that lane under it (the owner, 2 Nov: the police ram, they don't shoot; its
// call for help was too quiet to notice), lying still on the road: the column of the board over that lane runs over
// it, its front cell hit and the rig slowed for a few seconds, its tires torn (stripTick); off the lane, it misses.
// Notable: the reticle's, the cannon's and the guns'. Shot down it falls onto the road and drops its gun or its
// turbine. It flies over the traffic (dir 0: no car brakes behind it or goes round it). First guesses, for act5.py
// health, scrap; m ahead and up; s of searchlight; s before it aims again; m
const HELI = { hp: 800, scrap: 160, ahead: 60, alt: 7, aim: 1.5, again: 4, w: 9, h: 4 };
const SPIKE = { hit: 12, slow: 3, keep: 0.6 }; // % on the front cell before Armor plating; s slowed; the speed you keep
let strips = [], torn = 0, tornTo = 0; // the strips on the road { x, z, over }; s still slowed, m/s at most till then
function sendHeli() { // fortress.js ambushes: one at a time; false if there is one, or no car to take over
  if (traffic.some(c => c.heli && !c.wreck)) return false;
  const c = traffic.find(c => takeable(c) && c.z - odo > 600);
  if (!c) return false;
  Object.assign(c, { heli: true, dir: 0, look: HELI_LOOKS[0], w: HELI.w, h: HELI.h, hp: null, wreck: false, swerve: null, warned: false,
                     beams: 0, d: NaN, hit: -Infinity, x: carX, z: odo + 400, v: speed, alt: 3 * HELI.alt, stage: 'come' });
  flash('HELICOPTER!', '#f55', false);
  return true;
}
function heliDrive(c, dt) { // road.js updateTraffic: ahead of you however fast you go, coming down to its height
  c.look = HELI_LOOKS[Math.floor(performance.now() / 90) % 2]; // its rotor turning, its lights flashing
  c.v = Math.max(0, speed + (HELI.ahead - (c.z - odo)) * 0.8);
  c.z += c.v * dt;
  c.alt += clamp(HELI.alt - c.alt, -5 * dt, 5 * dt);
  if (c.stage === 'come') { if (c.z - odo < HELI.ahead + 15) aimHeli(c); }
  else if (c.stage === 'aim') { c.x += clamp(c.aim - c.x, -5 * dt, 5 * dt); if ((c.t -= dt) <= 0) dropStrip(c); }
  else if ((c.t -= dt) <= 0) aimHeli(c); // waited
}
function aimHeli(c) { // its searchlight on one of the lanes the fortress covers, at random
  Object.assign(c, { stage: 'aim', t: HELI.aim, aim: ROAD_LANES[lane + Math.floor(rand() * rigW)] });
}
function dropStrip(c) { // across the lane in its light, under it
  strips.push({ x: c.aim, z: c.z });
  Object.assign(c, { stage: 'wait', t: HELI.again });
}
function stripTick(dt) { // distance.js updateRun: a strip reached, run over or missed; the rig slowed while its tires are torn
  if (torn > 0) { torn -= dt; speed = Math.min(speed, tornTo); }
  for (const s of strips) {
    if (s.over || odo + MY_FRONT < s.z) continue;
    s.over = true;
    if (!runOver(SPIKE.hit, s.x)) { flash('MISSED IT', '#3f6', false); continue; } // fortress.js
    torn = SPIKE.slow;
    tornTo = speed *= SPIKE.keep;
    shake = Math.max(shake, 0.3); // main.js
    flash('SPIKED', '#f55', false);
    if (wrecked()) return finishRun('wrecked');
  }
  strips = strips.filter(s => s.z > odo - 20);
}
const heliMarks = () => { // distance.js roadMarks: the searchlight, a little beyond it so it draws first; the strips
  const c = traffic.find(c => c.heli && !c.wreck && c.stage === 'aim');
  return [...c ? [{ z: c.z + 0.5, kind: 'spot', value: { x: c.aim, alt: c.alt } }] : [], ...strips.map(s => ({ z: s.z, kind: 'strip', value: s }))];
};

// the scanner: ten lights for the heat, a readout, and red and blue while the police are on the road
function renderPolice() { // gone with the Rebuild, as the heat is (the owner, 2 Nov: it is the heat meter)
  const on = run.phase !== 'garage' && arOn() && !rigged();
  document.body.classList.toggle('has-heat', on);
  if (!on) return;
  const lit = Math.round(progress.wanted * 10), cops = traffic.some(c => c.police && !c.wreck), now = performance.now();
  [...$('scanner-leds').children].forEach((r, i) => r.setAttribute('fill', i >= lit ? '#2a2a30' : i < 5 ? '#4c4' : i < 8 ? '#fb3' : '#f33'));
  $('scanner-lcd').textContent = cops ? (now % 600 < 400 ? 'PURSUIT' : '') : `HEAT ${Math.round(progress.wanted * 100)}%`;
  $('scanner-light').setAttribute('fill', cops ? (now % 500 < 250 ? '#f33' : '#36f') : '#333');
}
