// The finale (the owner, 4 Nov): the warlord of the coast road, his fortress across all four lanes, head-on, both
// standing (the owner: "front-to-front, head on against each other, both occupying 4 lanes, waiting, like it's trench
// warfare"), 70 m apart (at 100 m he looked small on a phone). It opens once your fortress is full size, four lanes wide
// and five rows long, with the Grinder on its front (the owner); from then on the garage has FIGHT beside DRIVE, and a
// fight lost is back to the garage: a run to grind, or another fight. Nothing in it is automatic (the owner: "This is
// the finale, if you want to win, you have to play"): no driver aid, no Auto cannon or Auto gun, no War chief or
// Foreman. No traffic: his fortress holds the road. Your health is in the mirror where the time was, his over his
// fortress (the owner: health bars for the first iteration). Your weapons are instruments of their own on the dashboard,
// each there only if you have it (the owner): the CB radio sends a raiding party, the pedal fires the cannon, the lever
// a burst of the guns, the launch button a salvo from the rocket pods on the board. They share one cooldown, so mashing them
// all wins nothing (the owner), and Dispatch shortens it. He has the same four moves, each telegraphed (below), and each
// move beats one of the others (the owner's rock-paper-scissors, below). Claude's numbers, from tests/balance/finale.py
// (a good player wins in about two minutes with the build it was tuned on, design notes): m
// between you; his health; s a beat, and Dispatch's share less a level; s between his moves, the first; % his shell
// before Armor plating (a rocket's 15); raiders a party; a burst's rounds, s apart; a salvo's damage a block of rocket
// pods (a block of cannon's shell is 250); s a cannon winds up; % a ram of his raiders, a round of his guns, a rocket of
// his (a police car's ram 4, a jeep's round 0.4, a rocket car's 15); m/s his raiders come at you; his chance to answer
// your move, s he takes to
const FINALE = { gap: 70, hp: 30000, beat: 1.5, quicker: 0.08, his: 3, first: 2, shot: 15, party: 3, burst: 8, burstEvery: 0.1, salvo: 200,
                 wind: 1.2, ram: 6, round: 0.75, rocket: 22, charge: 30, react: 0.3, reactAfter: 0.4 };
const finaleOpen = () => rigged() && lvl('widen') >= 3 && lvl('lengthen') >= 4 && lvl('grinder') > 0;
let warlord = null, salvos = []; // his fortress, on the road while you fight; your rockets in the air { t, hit, twice }
const fighting = () => !!run.fight && run.phase !== 'garage'; // a fight under way (run.fight: the last run was one)

// the pacing (the owner, 4 Nov: "Let's go with the shared timeout and the dispatch improvement, but make the codebase to
// be prepared for individual cooldowns or even turns"): ready() and spend() are all a fight asks, for you and for him
// alike; PACE says how they answer. 'shared': a move cools every move of its side; 'each': only itself. Turns would
// answer here too: ready only on your side's turn, spend passing it
const PACE = 'shared';
const MOVES = ['raid', 'cannon', 'guns', 'rockets'];
let cooling = { you: {}, him: {} }; // s left, a side's moves
const beatOf = side => FINALE.beat * (side === 'you' ? 1 - FINALE.quicker * lvl('workRate') : 1); // Dispatch: yours; his moves
                                                                                                    // come on a clock of their own
const ready = (side, m) => (cooling[side][m] ?? 0) <= 0;
function spend(side, m) { for (const k of PACE === 'shared' ? MOVES : [m]) cooling[side][k] = beatOf(side); }
const readiness = m => clamp(1 - (cooling.you[m] ?? 0) / beatOf('you'), 0, 1); // the instruments' bars

// your weapons, each there only if you have it (the owner): a war crew to raid with, a cannon on the board, guns (the
// War Rig's or on the board), a rocket pod on the board
const mounted = kind => progress.fortress.parts.some(p => p.kind === kind);
const HAVE = { raid: () => role('raider') > 0, cannon: () => mounted('cannon'), guns: () => lvl('guns') > 0 || mounted('gun'),
               rockets: () => mounted('rockets') };

function fightRun() { // startRun, for a fight: the road his, nobody else on it, both of you standing
  traffic.length = 0;
  ambushes = []; // fortress.js: none today
  warlord = { warlord: true, dir: -1, x: carX, z: FINALE.gap, v: 0, w: 4 * LANE_W, h: 6.5, hp: null, wreck: false, warned: true,
              look: { front: WARLORD_SPRITE, rear: WARLORD_SPRITE }, d: NaN, hit: -Infinity, seen: null }; // road.js
  traffic.push(warlord);
  target = quarry = null; // gang.js: the reticle on him once the fight is on
  cooling = { you: {}, him: {} };
  Object.assign(run, { burst: 0, burstAt: 0, won: false, hisClock: FINALE.first });
  salvos = []; underway = []; answer = hisBurst = null;
}
function warlordDrive(c, dt) { // road.js updateTraffic: he stands his ground; in the ending his wreck is shoved aside
  if (run.phase === 'run') c.z = odo + FINALE.gap;
  else if (run.phase === 'ending' && c.z - odo < 45) c.x = Math.min(SHOULDER + 12, c.x + 12 * dt); // your Grinder's work
}

// distance.js updateRun, the fight's every frame: the cooldowns, the moves under way landing, the bursts' rounds, his
// answer or his move when his clock allows, his rockets in the air (fortress.js)
function fightTick(dt) {
  for (const side of ['you', 'him']) for (const m of MOVES) cooling[side][m] = Math.max(0, (cooling[side][m] ?? 0) - dt);
  for (let i = traffic.length; i--;) if (leftBehind(traffic[i])) traffic.splice(i, 1); // oil.js: raiders home
  target = warlord.wreck ? null : warlord;
  rigTick(dt); // fortress.js: the cannon's reload, the engines' wear
  for (const u of underway) { // a move lands; a party is home, or wrecked
    if (u.lasts && !u.lasts()) u.off = true;
    else if ((u.t -= dt) <= 0) { u.off = true; u.land(); }
  }
  underway = underway.filter(u => !u.off);
  for (const r of salvos) r.t -= dt; // in the air (drawSalvos)
  if (run.burst > 0 && (run.burstAt -= dt) <= 0) gunShot(); // your burst's rounds
  if (hisBurst && (hisBurst.at -= dt) <= 0) hisRound(); // his
  if (answer && (answer.t -= dt) <= 0) { const m = answer.m; answer = null; if (ready('him', m)) hisMove(m); } // his answer
  else if (!answer && (run.hisClock -= dt) <= 0 && ready('him', 'cannon')) { hisMove(); run.hisClock = FINALE.his; } // his own
  rocketTick(dt);
}

// ---- the moves (the owner, 4 Nov: rock-paper-scissors, "pokemon solved this problem for a buttload of strengths vs
// weaknesses"): the cannon beats raiders (a shell into the convoy), raiders beat guns (they overrun the gun nests), guns
// beat rockets (bullets down the salvo), rockets beat the cannon (a salvo on the turret as it winds up); the opposites
// are neutral. A move takes a while to land (the cannon winds up, rockets lock on and fly, raiders drive across, a burst
// lasts): under way, the other side's move that beats it cancels it and does twice its damage, and the side it beat is
// open a beat (its next move a beat later); the move it beats is cancelled itself, and it lands all the same; a neutral
// one, both land. Both sides alike: his moves telegraphed (his turret glowing as it winds up, his rockets' marks on the
// board, his raiders driving at you, his gun nests flashing), and he answers yours now and then (FINALE.react)
const BEATS = { cannon: 'raid', raid: 'guns', guns: 'rockets', rockets: 'cannon' };
const beater = m => MOVES.find(k => BEATS[k] === m);
let underway = [], answer = null; // the moves under way: { side, m, t (s to land), twice, land(), cancel(), lasts() }; his answer coming
const NAMES = { cannon: 'CANNON', raid: 'RAIDERS', guns: 'GUNS', rockets: 'ROCKETS' };
// a move made: against the other side's under way, countered, cancelled or neutral; then under way itself
function made(side, m, u) {
  const theirs = underway.filter(o => o.side !== side && !o.off && (o.lasts?.() ?? true)), hit = theirs.find(o => BEATS[m] === o.m), lost = theirs.find(o => BEATS[o.m] === m);
  Object.assign(u, { side, m, twice: !!hit });
  if (hit) { // countered: theirs cancelled, yours double, theirs open a beat
    Object.assign(hit, { off: true }); hit.cancel();
    const other = hit.side;
    for (const k of MOVES) cooling[other][k] = Math.max(cooling[other][k] ?? 0, beatOf(other));
    flash(side === 'you' ? `${NAMES[hit.m]} COUNTERED · ×2` : `YOUR ${NAMES[hit.m]} COUNTERED`, side === 'you' ? '#5f5' : '#f55', false);
  }
  if (lost && !hit) { u.off = true; u.cancel(); // beaten: yours is lost, theirs lands
    flash(side === 'you' ? `YOUR ${NAMES[m]}: BEATEN BY HIS ${NAMES[lost.m]}` : `HIS ${NAMES[m]}: BEATEN`, side === 'you' ? '#f55' : '#5f5', false);
    return;
  }
  underway.push(u);
}

// ---- your moves: an instrument pressed (or its key). Each fails, spending nothing, if it isn't there, isn't ready, or
// (the cannon) has no shells; else it is under way, and he may answer it
function move(m) {
  if (!run.fight || run.phase !== 'run' || warlord.wreck || !HAVE[m]() || !ready('you', m)) return false;
  const u = YOURS[m]();
  if (!u) return false;
  spend('you', m);
  beep(m === 'raid' ? 520 : 880, 0.05);
  made('you', m, u);
  if (!u.off && !answer && ready('him', beater(m)) && rand() < FINALE.react) answer = { m: beater(m), t: FINALE.reactAfter };
  return true;
}
const YOURS = { // each move as it starts: its landing, and its undoing if it is beaten
  cannon() { // a shell spent at once; it winds up, then fires (fortress.js)
    if (!blocks('cannon')) { beep(140, 0.05); flash('JAMMED', '#6af', false); return null; } // every cannon knocked out
    if (progress.shells < 1) { beep(140, 0.05); flash('NO SHELLS', '#fb3', false); return null; }
    progress.shells--;
    return { t: FINALE.wind, land() { reloading = 0; progress.shells++; fireCannon(this.twice); }, cancel() {} };
  },
  raid() { // a party up the shoulder at him (gang.js): its rams are its landing; beaten, its cars are shot up, wrecks
    const cars = [];
    for (let n = Math.min(FINALE.party, role('raider')); n > 0; n--) { sendRaider({ car: warlord }); cars.push(traffic.at(-1)); }
    const u = { t: Infinity, land() {}, cancel: () => { for (const c of cars) if (!c.gone && !c.wreck) crewHit(WRECK.hp, c); },
                lasts: () => cars.some(c => !c.gone && !c.wreck) };
    cars.forEach(c => { c.party = u; }); // its rams double if it counters (gang.js raidRam)
    return u;
  },
  guns() { // a burst: its rounds are its landing
    const u = { t: FINALE.burst * FINALE.burstEvery, land() {}, cancel() { run.burst = 0; } };
    Object.assign(run, { burst: FINALE.burst, burstAt: 0, burstOf: u });
    return u;
  },
  rockets() { // a salvo: up at once, landing a rocket's flight later
    const n = blocks('rockets');
    if (!n) { beep(140, 0.05); flash('JAMMED', '#6af', false); return null; } // every pod knocked out (a War Boy's grenade)
    const s = { t: ROCKET.flight, hit: FINALE.salvo * n };
    salvos.push(s);
    wearOut('rockets', WEAR.rockets); // fortress.js
    beep(220, 0.2);
    return { t: ROCKET.flight, land() { salvos = salvos.filter(x => x !== s); if (!warlord.wreck) { hurtCar(warlord, s.hit * (this.twice ? 2 : 1)); crashSound(); } },
             cancel() { salvos = salvos.filter(x => x !== s); } };
  },
};
function drawFight() { drawWarlord(); drawSalvos(); } // gang.js renderGang: his telegraphs, your rockets
// a salvo in the air: from your rig's front up in a high arc and down onto his fortress, a trail of smoke behind each
// rocket, as his come at you (fortress.js drawRockets)
function drawSalvos() { // the fight's, at him, and the pods' in a race, at their car (gang.js firePods)
  const w = canvas.width, h = canvas.height;
  for (const r of [...salvos, ...podSalvos]) {
    const s = (r.car ?? warlord)?.seen;
    if (!s) continue;
    const k = 1 - r.t / ROCKET.flight, [x1, y1] = [w / 2, h * 0.7], [x2, y2] = [s[0] + s[2] / 2, s[1] + s[3] / 2];
    for (let i = 0; i < 3; i++) { // three rockets abreast
      const at = q => [x1 + (x2 - x1) * q + (i - 1) * w * 0.03 * (1 - q), y1 + (y2 - y1) * q - Math.sin(Math.PI * q) * h * 0.25];
      for (let j = 4; j > 0; j--) {
        const [x, y] = at(Math.max(0, k - j * 0.04));
        g2d.fillStyle = `rgba(170, 170, 170, ${(0.5 - j * 0.1).toFixed(2)})`; g2d.beginPath(); g2d.arc(x, y, w / 260 * (1 + j * 0.3), 0, 2 * Math.PI); g2d.fill();
      }
      const [x, y] = at(k);
      g2d.fillStyle = '#ffb347'; g2d.beginPath(); g2d.arc(x, y, w / 220, 0, 2 * Math.PI); g2d.fill();
    }
  }
}
function gunShot() { // a round of the burst: the War Rig's guns and the board's, as fireGuns does (gang.js)
  run.burst--;
  run.burstAt = FINALE.burstEvery;
  beep(70, 0.04);
  tracers.push([null, warlord, performance.now()]);
  hurtCar(warlord, GUN * (lvl('guns') + blocks('gun')) * (run.burstOf?.twice ? 2 : 1)); // double if it countered
  wearOut('gun', WEAR.gun); // fortress.js
}
// keys (fortress.js rigKey): S the raiders (SEND's), Space the cannon, G the guns, R the rockets
function fightKey(k, repeat) {
  const m = { s: 'raid', S: 'raid', ' ': 'cannon', g: 'guns', G: 'guns', r: 'rockets', R: 'rockets' }[k];
  if (m && !repeat) move(m);
  return !!m;
}

// ---- his moves, on his own clock, any of the four at random, each telegraphed; and his answers to yours (move, above)
let hisBurst = null; // his gun nests firing: { n rounds left, at s to the next, u its move }
function hisMove(m = MOVES[Math.floor(rand() * MOVES.length)]) {
  spend('him', m);
  made('him', m, HIS[m]());
}
const HIS = { // each move as it starts, as yours (YOURS, above)
  cannon() { // his turret winds up, glowing (drawWarlord), then a shell at a column of your front row
    const col = Math.floor(rand() * boardW());
    flash('HIS CANNON!', '#f55', false);
    beep(160, 0.3);
    return { t: FINALE.wind, land() { hisShell(col, this.twice); }, cancel() {} };
  },
  rockets() { // locked on a cell of the board, its mark blinking, then up (fortress.js rocketTick lands them)
    const r = { c: warlord, x: ROAD_LANES[lane + Math.floor(rand() * boardW())], y: Math.floor(rand() * boardH()), t: ROCKET.lock, air: false,
                hit: FINALE.rocket };
    rockets.push(r);
    flash('ROCKETS!', '#f55', false);
    beep(1200, 0.08);
    const u = { t: ROCKET.lock + ROCKET.flight, land() {}, cancel() { rockets = rockets.filter(x => x !== r); } };
    r.party = u; // doubled if it counters (fortress.js landRocket)
    return u;
  },
  raid() { // three of his cars out of his gate and straight at you (hisRaiderDrive), each to ram your front row
    const n = Math.min(FINALE.party, boardW()), cars = [];
    for (let i = 0; i < n; i++) {
      const k = 1 + Math.floor(rand() * 999);
      cars.push({ hisRaider: true, dir: -1, x: ROAD_LANES[lane + Math.floor((i + 0.5) * boardW() / n)], z: warlord.z - 6 - 4 * i, v: FINALE.charge,
                  look: madLook(trafficLook(k)), w: CAR_M, warned: true, d: NaN, hit: -Infinity, seen: null }); // road.js
    }
    traffic.push(...cars);
    flash('HIS RAIDERS!', '#f55', false);
    horn();
    const u = { t: Infinity, land() {}, cancel() { for (const c of cars) if (!c.gone) Object.assign(c, { wreck: true, v: 0 }); },
                lasts: () => cars.some(c => !c.gone && !c.wreck) };
    cars.forEach(c => { c.party = u; });
    return u;
  },
  guns() { // his gun nests fire a burst at you, round after round (hisRound)
    const u = { t: FINALE.burst * FINALE.burstEvery, land() {}, cancel() { hisBurst = null; } };
    hisBurst = { n: FINALE.burst, at: 0, u };
    flash('HIS GUNS!', '#f55', false);
    return u;
  },
};
function hisShell(col, twice) { // his cannon's: at a column of your front row (fortress.js hitCell)
  tracers.push([warlord, 'you', performance.now()]); // gang.js
  hitCell(FINALE.shot * (twice ? 2 : 1) * (1 - armorCut()), col, 0);
  flash('HIT', '#f55', false);
  crashSound();
  shake = Math.max(shake, 0.5);
  if (wrecked()) finishRun('wrecked');
}
function hisRound() { // a round of his guns, at a cell of your front row
  const b = hisBurst;
  b.at = FINALE.burstEvery;
  if (--b.n <= 0) hisBurst = null;
  tracers.push([warlord, 'you', performance.now()]);
  beep(90, 0.03);
  hitCell(FINALE.round * (b.u.twice ? 2 : 1) * (1 - armorCut()), Math.floor(rand() * boardW()), 0);
  if (wrecked()) finishRun('wrecked');
}
// road.js updateTraffic: his raiders, straight at you down their lanes; one that reaches your front rams it, and is gone
function hisRaiderDrive(c, dt) {
  c.z -= c.v * dt;
  if (c.z - odo > MY_FRONT + 1) return;
  c.gone = true;
  hitCell(FINALE.ram * (c.party?.twice ? 2 : 1) * (1 - armorCut()), clamp(columnAt(c.x), 0, boardW() - 1), 0); // fortress.js
  crashSound();
  shake = Math.max(shake, 0.4);
  if (wrecked()) finishRun('wrecked');
}
// his telegraphs, drawn over his fortress (gang.js renderGang): his turret's mouth glowing as it winds up, brighter the
// nearer the shot; his gun nests' muzzles flashing while they fire
function drawWarlord() {
  const s = warlord?.seen;
  if (!s || warlord.wreck) return;
  for (const u of underway) {
    if (u.side !== 'him') continue;
    if (u.m === 'cannon') {
      const k = clamp(1 - u.t / FINALE.wind, 0, 1), x = s[0] + s[2] / 2, y = s[1] + s[3] * 0.2, r = s[3] * (0.05 + 0.1 * k);
      const glow = g2d.createRadialGradient(x, y, 0, x, y, r * 2);
      glow.addColorStop(0, `rgba(255, 220, 120, ${(0.5 + 0.5 * k).toFixed(2)})`); glow.addColorStop(1, 'rgba(255, 90, 20, 0)');
      g2d.fillStyle = glow; g2d.fillRect(x - 2 * r, y - 2 * r, 4 * r, 4 * r);
    }
    if (u.m === 'guns' && performance.now() % 120 < 60) for (const f of [0.12, 0.88]) {
      g2d.fillStyle = '#fff3c0'; g2d.beginPath(); g2d.arc(s[0] + s[2] * f, s[1] + s[3] * 0.24, s[3] * 0.06, 0, 2 * Math.PI); g2d.fill();
    }
  }
}

// ---- the end: his fortress down (gang.js total), or yours wrecked (finishRun). The run stops there, as the tank's did:
// a fight earns nothing on the road; won, the ending's screen after it (distance.js renderRun)
function warlordDown(c) {
  Object.assign(c, { wreck: true, hp: 0 });
  target = null;
  progress.warlord = (progress.warlord ?? 0) + 1;
  finishFight(true);
}
function finishFight(won) {
  run.won = won;
  run.gain = 0; // the garage's line of numbers: a run, but a fight's (distance.js runLine)
  progress.runs++;
  run.repaired = autoRepairOn() ? autoRepair() + fixCrew() : 0; // damage.js, oil.js: Auto repair, as after a race
  save();
  Object.assign(run, { phase: 'finish', count: won ? 4 : FINISH });
}

// ---- the dashboard in a fight (distance.js render): the instruments you have, each with its readiness (the cannon's
// is its pedal: fortress.js renderRig); his health over his fortress
const GAUGES = ['raid', 'guns', 'rockets'];
let shownFight = '';
function renderFight() {
  const on = !!run.fight && run.phase !== 'garage';
  document.body.classList.toggle('fight', on);
  if (!on) return;
  const has = GAUGES.filter(m => HAVE[m]()).join(' ');
  if (has !== shownFight) { shownFight = has; for (const m of GAUGES) $(`fight-${m}`).hidden = !has.includes(m); }
  for (const m of GAUGES) {
    $(`fight-${m}`).style.setProperty('--ready', readiness(m).toFixed(2));
    $(`fight-${m}`).classList.toggle('cooling', readiness(m) < 1);
  }
  const s = warlord?.seen, bar = $('warlord-bar');
  bar.hidden = !s || warlord.wreck;
  if (bar.hidden) return;
  const k = 1 / canvas.px;
  Object.assign(bar.style, { left: `${(s[0] + s[2] / 2) * k}px`, top: `${s[1] * k}px`, width: `${s[2] * k}px` });
  bar.style.setProperty('--hp', hpLeft(warlord).toFixed(3)); // oil.js
}

// the instruments: a press as the finger lands, as SEND's (oil.js); the cannon's is its pedal (fortress.js)
for (const m of GAUGES) $(`fight-${m}`).onpointerdown = e => { e.preventDefault(); move(m); };

// the fight's tutorial: popped up after THE WARLORD's card (distance.js), as the last of the trigger is bought
TUTORIALS.push({ id: 'fight', name: "The warlord's fight", open: () => finaleOpen(), pages: [
  { title: 'YOUR WEAPONS',
    both: 'In his fight each weapon is an instrument of its own: the CB radio sends a raiding party, the pedal fires the ' +
      'cannon, the lever a burst of the guns, the launch button the rockets (with a rocket pod on the board). They share ' +
      'one cooldown: Dispatch shortens it.' },
  { title: 'WHAT BEATS WHAT',
    both: 'The cannon beats raiders, raiders beat guns, guns beat rockets, and rockets beat the cannon as it winds up.' },
  { title: 'HIS MOVES',
    both: 'Each of his moves shows itself before it lands. Answer with the one that beats it: his is cancelled, yours does ' +
      'double. Answer with the one it beats and yours is lost. He answers yours too, now and then.' },
] });

// ---- the warning signs (the owner, 4 Nov: "only start to appear when war rig's size is at least 2 for each
// dimension"): his fortress far off on the horizon, a silhouette against the sunset with its lights on and its smoke
// going up, nearer (bigger) as yours grows, two lanes by two rows at the first (0) to four by five (1), when his fight
// opens. Never named: the fight's card names him. Gone once he is beaten, and in his fight, where he is on the road
const warning = () => rigged() && !progress.warlord && !fighting() && boardW() >= 2 && boardH() >= 2 ? (boardW() * boardH() - 4) / 16 : -1;
function drawOmen(g, w, horizon) { // road.js drawSky, behind the near hills: up the road, right of where it meets the
  const k = warning();             // sky (the heads-up display's tags are over the middle), swaying a little with the bends
  if (k < 0) return;
  const ww = w * (0.035 + 0.075 * k), hh = ww * 0.32, x = w * (0.68 + 0.06 * Math.sin(scenery / w)), y = horizon - w * 0.006;
  const now = performance.now() / 1000;
  for (let i = 0; i < 6; i++) { // his engines' smoke, drifting up and fading
    const f = (now * 0.15 + i / 6) % 1, sx = x - ww * 0.3 + (i % 3) * ww * 0.3 + f * ww * 0.15;
    g.fillStyle = `rgba(40, 24, 50, ${(0.45 * (1 - f)).toFixed(2)})`;
    g.beginPath(); g.arc(sx, y - hh - f * hh * 2.5, hh * (0.25 + f * 0.5), 0, 2 * Math.PI); g.fill();
  }
  g.fillStyle = '#1c0e26'; // the silhouette: his wall of steel, its turret, the spikes along its foot
  g.fillRect(x - ww / 2, y - hh, ww, hh);
  g.fillRect(x - ww * 0.12, y - hh * 1.45, ww * 0.24, hh * 0.5);
  g.fillRect(x - ww * 0.02, y - hh * 1.75, ww * 0.04, hh * 0.35); // its gun, up
  for (let i = 0; i < 10; i++) { const sx = x - ww / 2 + (i + 0.5) * ww / 10; g.beginPath(); g.moveTo(sx - ww * 0.02, y); g.lineTo(sx, y + hh * 0.18); g.lineTo(sx + ww * 0.02, y); g.fill(); }
  g.fillStyle = '#ffcf6a'; // its lights, a few winking out and on
  for (let i = 0; i < 7; i++) if (Math.sin(now * 0.7 + i * 2.3) > -0.6) g.fillRect(x - ww * 0.42 + i * ww * 0.13, y - hh * 0.62, Math.max(1, ww * 0.025), Math.max(1, hh * 0.1));
}

// ---- the ending (the owner, 29 Oct: "the camera rises and falls back, and the fortress, four lanes wide, crosses the
// wasteland into the sun with the crew following. Then the WARLORD screen"): after THE WARLORD IS DOWN, the cockpit
// fades away, the camera rises and falls back behind your fortress (drawn from your own board), which drives on into
// the sun, shoving his wreck aside, your crew's cars falling in behind it; then the WARLORD screen. A tap or a key skips
// it. Once it has risen the camera all but stops, and the fortress and the crew pull away from it into the sun.
// Claude's numbers: s it lasts, s the camera takes to rise, m up, m back, m/s the fortress's top speed, cars following,
// the camera's share of the fortress's speed once risen
const ENDING = { secs: 10, rise: 3, up: 9, back: 32, top: 24, crew: 12, stay: 0.15 };
const ease = k => k * k * (3 - 2 * k);
function startEnding() { // distance.js updateRun, after a won fight's finish: the phase it goes on in
  run.ending = { t: 0, v: 0, at: odo, cam: odo }; // cam: where the camera is
  traffic.push({ yours: true, dir: 1, x: carX, z: odo - MY_REAR, w: boardW() * LANE_W, h: 4.6, look: { rear: fortressSprite() },
                 warned: true, d: NaN, hit: -Infinity, seen: null });
  for (let i = 0; i < Math.min(ENDING.crew, fleetSize()); i++) // out of the rig's dust behind the camera, into their places
    traffic.push({ follower: i, dir: 1, x: ROAD_LANES[i % 4], z: odo - ENDING.back - 15 - 6 * i, v: 30, look: racerSprite(FIELD - i, true, true),
                   warned: true, d: NaN, hit: -Infinity, seen: null });
  document.body.classList.add('ending');
  return 'ending';
}
function endingTick(dt) { // distance.js updateRun, the ending's every frame
  const e = run.ending;
  e.t += dt;
  const k = ease(Math.min(1, e.t / ENDING.rise));
  e.v = Math.min(ENDING.top, e.v + 5 * dt);
  e.at += e.v * dt;
  e.cam = e.t < ENDING.rise ? e.at - ENDING.back * k : e.cam + ENDING.stay * e.v * dt; // following it, then left behind
  cam = { back: e.at - e.cam, up: ENDING.up * k }; // road.js
  odo = e.at; speed = e.v; // the fortress's, as the road scrolls under it
  const w = canvas.width, sun = -0.12 * w + 2 * w * Math.round((scenery + 0.12 * w) / (2 * w)); // road.js drawSky: the sun
  scenery += (sun - scenery) * Math.min(1, dt * 0.8);                                          // where the road meets the sky
  if (e.t >= ENDING.secs) endEnding();
}
function endingDrive(c, dt) { // road.js updateTraffic: your fortress where you are; your crew into rows of four behind it
  if (c.yours) { c.z = odo - MY_REAR; return; }
  const slot = odo - MY_REAR - 10 - 8 * Math.floor(c.follower / 4), lane = ROAD_LANES[c.follower % 4];
  c.v = (run.ending?.v ?? 0) + clamp((slot - c.z) * 1.2, -8, 14);
  c.z += c.v * dt;
  c.x += clamp(lane - c.x, -3 * dt, 3 * dt);
}
function endEnding() { // its time up, or skipped: the WARLORD screen (distance.js renderRun, on the way to the garage)
  if (run.phase !== 'ending') return;
  cam = null;
  for (let i = traffic.length; i--;) if (traffic[i].yours || traffic[i].follower != null) traffic.splice(i, 1);
  document.body.classList.remove('ending');
  run.phase = 'garage';
}
addEventListener('pointerdown', () => endEnding()); // a tap skips it
addEventListener('keydown', () => endEnding());     // as does a key

// your fortress from behind, for the ending: its eight wheels and tail lights, the deck, and on it what each column of
// your board carries, the mightiest part of it standing (a cannon's turret, a rocket pod, a gun, an engine's stacks,
// spikes, armor), in its colors
const MIGHT = ['cannon', 'rockets', 'gun', 'engine', 'spikes', 'armor'];
function fortressSprite() {
  const cols = boardW(), parts = progress.fortress.parts;
  return sprite(140 * cols, 300, (g, w, h) => {
    const cw = w / cols, deck = h * 0.52;
    g.fillStyle = '#141416'; // the wheels
    for (let i = 0; i < 2 * cols; i++) { g.beginPath(); g.roundRect(w * (0.02 + i * 0.96 / (2 * cols)), h * 0.84, w * 0.9 / (2 * cols) - 6, h * 0.16, 6); g.fill(); }
    g.fillStyle = '#2c2622'; g.fillRect(0, deck, w, h * 0.34); // the back of it, rusted steel
    g.fillStyle = '#3c3c42'; g.fillRect(0, deck, w, h * 0.04); // the deck's edge
    g.fillStyle = '#d33'; for (const x of [0.02, 0.9]) g.fillRect(w * x, h * 0.74, w * 0.08, h * 0.05); // tail lights
    for (let c = 0; c < cols; c++) { // the column's mightiest part, standing on the deck
      const kinds = parts.filter(p => p.cells.some(([cx]) => p.x + cx === c)).map(p => p.kind), kind = MIGHT.find(k => kinds.includes(k));
      if (!kind) continue;
      const x = c * cw, mid = x + cw / 2, tone = CRATE_TONES[kind]; // road.js
      g.fillStyle = tone;
      if (kind === 'cannon') { g.beginPath(); g.roundRect(x + cw * 0.15, deck - h * 0.24, cw * 0.7, h * 0.24, 14); g.fill();
        g.fillStyle = '#22260d'; g.fillRect(mid - cw * 0.05, deck - h * 0.48, cw * 0.1, h * 0.26); } // its gun, up and ahead
      else if (kind === 'rockets') { g.fillRect(x + cw * 0.2, deck - h * 0.22, cw * 0.6, h * 0.22); g.fillStyle = '#0c0e06';
        for (const [a, b] of [[0.35, 0.07], [0.65, 0.07], [0.35, 0.16], [0.65, 0.16]]) { g.beginPath(); g.arc(x + cw * a, deck - h * b, cw * 0.08, 0, 2 * Math.PI); g.fill(); } }
      else if (kind === 'gun') { g.fillRect(x + cw * 0.3, deck - h * 0.14, cw * 0.4, h * 0.14); g.fillStyle = '#14161a';
        g.fillRect(mid - cw * 0.12, deck - h * 0.3, cw * 0.06, h * 0.16); g.fillRect(mid + cw * 0.06, deck - h * 0.3, cw * 0.06, h * 0.16); }
      else if (kind === 'engine') { g.fillRect(x + cw * 0.2, deck - h * 0.12, cw * 0.6, h * 0.12); g.fillStyle = '#9a9aa4';
        g.fillRect(x + cw * 0.25, deck - h * 0.34, cw * 0.08, h * 0.22); g.fillRect(x + cw * 0.67, deck - h * 0.34, cw * 0.08, h * 0.22); }
      else if (kind === 'spikes') { g.fillStyle = '#e2e2ea';
        for (let i = 0; i < 3; i++) { const sx = x + cw * (0.2 + i * 0.3); g.beginPath(); g.moveTo(sx - cw * 0.08, deck); g.lineTo(sx, deck - h * 0.16); g.lineTo(sx + cw * 0.08, deck); g.fill(); } }
      else { g.fillRect(x + cw * 0.08, deck - h * 0.1, cw * 0.84, h * 0.1); } // armor plating
    }
  });
}
