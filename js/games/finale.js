// The finale (the owner, 4 Nov): the warlord of the coast road, his fortress across all four lanes, head-on, both
// standing (the owner: "front-to-front, head on against each other, both occupying 4 lanes, waiting, like it's trench
// warfare"), 70 m apart (at 100 m he looked small on a phone). It opens once your fortress is full size, four lanes wide
// and five rows long, with the Grinder on its front (the owner); from then on the garage has FIGHT beside DRIVE, and a
// fight lost is back to the garage: a run to grind, or another fight. Nothing in it is automatic (the owner: "This is
// the finale, if you want to win, you have to play"): no driver aid, no Auto cannon or Auto gun, no War chief or
// Foreman. No traffic: his fortress holds the road. Your health is in the mirror where the time was, his over his
// fortress (the owner: health bars for the first iteration). Your weapons are instruments of their own on the dashboard,
// each there only if you have it (the owner): the CB radio sends a raiding party, the pedal fires the cannon, the lever
// a burst of the guns, the launch button a salvo from the rocket pods on the board. One at a time (the owner, 5 Nov):
// each move takes 3 s, its wind-up and all, and its side makes no other till it is over, so mashing them all wins
// nothing; Dispatch makes yours quicker. He has the same four moves, each with a wind-up of its own (below), and each
// move beats one of the others (the owner's rock-paper-scissors, below). Claude's numbers, from tests/balance/finale.py
// (a good player wins in about two minutes with the build it was tuned on, design notes): m between you; his health;
// s a move takes, wind-up and all, and Dispatch's share less a level of yours; s he waits once his move is over (at
// random between the two), before his first; % his shell before Armor plating (a rocket's 15); raiders a party; a
// burst's rounds, s apart; a salvo's damage a block of rocket pods (a block of cannon's shell is 250); % a ram of his
// raiders, a round of his guns, a rocket of his (a police car's ram 4, a jeep's round 0.4, a rocket car's 15); his
// chance to answer your move, s he takes to; s a countered side waits on after the counter has landed (your chance to strike)
const FINALE = { gap: 70, hp: 12000, move: 3, quicker: 0.08, his: [0.5, 2], first: 2, shot: 36, party: 3, burst: 8, burstEvery: 0.1,
                 salvo: 200, ram: 15, round: 1.8, rocket: 55, react: 0.3, reactAfter: 0.4, open: 1.5 };
const finaleOpen = () => rigged() && lvl('widen') >= 3 && lvl('lengthen') >= 4 && lvl('grinder') > 0;
let warlord = null, salvos = []; // his fortress, on the road while you fight; your rockets in the air { t, T, hit }
const fighting = () => !!run.fight && run.phase !== 'garage'; // a fight under way (run.fight: the last run was one)

// the pacing (the owner, 4 Nov: "make the codebase to be prepared for individual cooldowns or even turns"; 5 Nov, after
// playtesting it with a shared cooldown shorter than the moves, which overlapped: "stable 3s animations (including the
// wind-up) and only allow 1 move at a time, no cooldown. So basically a hidden cooldown"): a move takes its side's beat,
// however it ends (landed, beaten or countered: a wrong guess costs its time), and the side makes no other till then.
// ready() and spend() are all a fight asks, for you and for him alike; PACE says how they answer. 'shared': a move
// holds every move of its side; 'each': only itself. Turns would answer here too: ready only on your side's turn, spend
// passing it
const PACE = 'shared';
const MOVES = ['raid', 'cannon', 'guns', 'rockets'];
let cooling = { you: {}, him: {} }; // s left, a side's moves
const beatOf = side => FINALE.move * (side === 'you' ? 1 - FINALE.quicker * lvl('workRate') : 1); // a move's length; Dispatch: yours
const ready = (side, m) => (cooling[side][m] ?? 0) <= 0;                                           // quicker
function spend(side, m) { for (const k of PACE === 'shared' ? MOVES : [m]) cooling[side][k] = beatOf(side); }
const readiness = m => clamp(1 - (cooling.you[m] ?? 0) / beatOf('you'), 0, 1); // the instruments' bars

// your weapons, each there only if you have it (the owner): a war crew to raid with, a cannon on the board, guns (the
// War Rig's or on the board), a rocket pod on the board
const mounted = kind => progress.fortress.parts.some(p => p.kind === kind);
const HAVE = { raid: () => role('raider') > 0, cannon: () => mounted('cannon'), guns: () => lvl('guns') > 0 || mounted('gun'),
               rockets: () => mounted('rockets') };

// the hold's weapons, for his fight (the owner, 6 Nov, after a pod bought from the dealer before the fight stayed in the
// hold, and so no launch button: "the crew mounts it"): as FIGHT is pressed, each weapon of the fight you lack
// (fortress.js FIGHT_PARTS, as the dealer offers them) that the hold has goes onto free cells of the board, the
// rearmost that fit (his shells and rams land on the front row), the biggest and then the soundest of its kind first.
// One that fits nowhere stays in the hold, and the garage says so on FIGHT (fightNote). go: mount them (fortress.js
// mount), else only the plan, on a copy of the board
function armUp(go) {
  const real = progress.fortress, f = go ? real : { parts: [...real.parts] }, mounts = [], none = [];
  const name = p => `${PARTS[p.kind].name} ${p.cells.length}`, sound = p => hpOf(p) / fullHp(p);
  for (const [kind, , has] of FIGHT_PARTS) {
    if (HAVE[has]()) continue;
    const parts = real.hold.filter(p => p.kind === kind).sort((a, b) => b.cells.length - a.cells.length || sound(b) - sound(a));
    let at = null;
    const p = parts.find(q => (at = spotFor(f, q.cells)));
    if (!p) { if (parts.length) none.push(name(parts[0])); continue; }
    mounts.push(name(p));
    if (go) mount(real.hold.indexOf(p), ...at); else f.parts.push({ ...p, x: at[0], y: at[1] });
  }
  return { mounts, none };
}
function spotFor(f, cells) { // free cells for a part, the rearmost row first
  for (let y = boardH() - 1; y >= 0; y--) for (let x = 0; x < boardW(); x++) if (onBoard(cells, x, y) && !under(f, cells, x, y).length) return [x, y];
  return null;
}
function fightNote() { // distance.js renderGarage: on FIGHT, what the crew will mount, and what won't fit
  if (!finaleOpen()) return '';
  const { mounts, none } = armUp(false);
  return mounts.length || none.length ? `<small${none.length ? ' class="none"' : ''}>${[mounts.length && `the crew mounts ${mounts.join(', ')}`,
    none.length && `no room for ${none.join(', ')}: make room on a run`].filter(Boolean).join(' · ')}</small>` : '';
}

function fightRun() { // startRun, for a fight: the road his, nobody else on it, both of you standing
  const { mounts } = armUp(true); // the crew at work before the fight
  traffic.length = 0;
  ambushes = []; // fortress.js: none today
  warlord = { warlord: true, dir: -1, x: carX, z: FINALE.gap, v: 0, w: 4 * LANE_W, h: 6.5, hp: null, wreck: false, warned: true,
              look: { front: WARLORD_SPRITE, rear: WARLORD_SPRITE }, d: NaN, hit: -Infinity, seen: null }; // road.js
  traffic.push(warlord);
  target = quarry = null; // gang.js: the reticle on him once the fight is on
  cooling = { you: {}, him: {} };
  Object.assign(run, { won: false, hisClock: FINALE.first, mounted: mounts.length ? { names: mounts, t: 0.8 } : null }); // said as FIGHT! fades, before his first move
  salvos = []; underway = []; answer = null;
}
function warlordDrive(c, dt) { // road.js updateTraffic: he stands his ground; in the ending his wreck is shoved aside
  if (run.phase === 'run') c.z = odo + FINALE.gap;
  else if (run.phase === 'ending' && c.z - odo < 45) c.x = Math.min(SHOULDER + 12, c.x + 12 * dt); // your Grinder's work
}

// distance.js updateRun, the fight's every frame: the cooldowns, the moves under way (a burst's rounds, then the
// landing), his answer or, once free and he has waited, his move; his rockets in the air (fortress.js)
function fightTick(dt) {
  if (!progress.toured.includes('warlordFight')) return openTour('warlordFight', true); // the first fight: its tutorial, paused
  for (const side of ['you', 'him']) for (const m of MOVES) cooling[side][m] = Math.max(0, (cooling[side][m] ?? 0) - dt);
  for (let i = traffic.length; i--;) if (leftBehind(traffic[i])) traffic.splice(i, 1); // oil.js: raiders home
  target = warlord.wreck ? null : warlord;
  rigTick(dt); // fortress.js: the cannon's reload, the engines' wear
  if (run.mounted && (run.mounted.t -= dt) <= 0) { flash(`CREW MOUNTED ${run.mounted.names.join(', ')}`, '#ffd23a', false); run.mounted = null; }
  for (const u of underway) {
    u.t -= dt;
    u.tick?.();
    if (u.t <= 0) { u.off = true; u.land(); }
  }
  underway = underway.filter(u => !u.off);
  for (const r of salvos) r.t -= dt; // in the air (drawSalvos)
  if (answer && (answer.t -= dt) <= 0) { const m = answer.m; answer = null; if (ready('him', m)) hisMove(m); } // his answer
  else if (!answer && ready('him', 'cannon') && (run.hisClock -= dt) <= 0) hisMove(); // his own
  rocketTick(dt);
}

// ---- the moves (the owner, 4 Nov: rock-paper-scissors, "pokemon solved this problem for a buttload of strengths vs
// weaknesses"): the cannon beats raiders (a shell into the convoy), raiders beat guns (they overrun the gun nests), guns
// beat rocket (bullets down the salvo), rockets beat the cannon (a salvo on the turret as it winds up); the opposites
// are neutral. A move lands as its beat ends (the cannon winds up, rockets go up and come down, raiders drive across, the
// guns spin up and fire): under way, the other side's move that beats it cancels it and does twice its damage, and the
// side it beat waits till that has landed and a beat more; the move it beats is cancelled itself, and it lands all the same; a neutral
// one, both land. Both sides alike: his moves wind up where you can see them (drawWarlord), and he answers yours now
// and then (FINALE.react)
const BEATS = { cannon: 'raid', raid: 'guns', guns: 'rockets', rockets: 'cannon' };
const beater = m => MOVES.find(k => BEATS[k] === m);
let underway = [], answer = null; // the moves under way: { side, m, t (s to land), T (its length), twice, tick(), land(), cancel() }; his answer coming
const NAMES = { cannon: 'CANNON', raid: 'RAIDERS', guns: 'GUNS', rockets: 'ROCKETS' };
// a move made: against the other side's under way, countered, cancelled or neutral; then under way itself
function made(side, m, u) {
  const theirs = underway.filter(o => o.side !== side && !o.off), hit = theirs.find(o => BEATS[m] === o.m), lost = theirs.find(o => BEATS[o.m] === m);
  Object.assign(u, { side, m, T: u.t, twice: !!hit });
  if (hit) { // countered: theirs cancelled, yours double, theirs waiting till yours has landed and a beat more
    Object.assign(hit, { off: true }); hit.cancel();
    const other = hit.side;
    for (const k of MOVES) cooling[other][k] = Math.max(cooling[other][k] ?? 0, u.t + FINALE.open);
    flash(side === 'you' ? `${NAMES[hit.m]} COUNTERED · ×2` : `YOUR ${NAMES[hit.m]} COUNTERED`, side === 'you' ? '#5f5' : '#f55', false);
  }
  if (lost && !hit) { u.off = true; u.cancel(); // beaten: yours is lost, theirs lands
    flash(side === 'you' ? `YOUR ${NAMES[m]}: BEATEN BY HIS ${NAMES[lost.m]}` : `HIS ${NAMES[m]}: BEATEN`, side === 'you' ? '#f55' : '#5f5', false);
    return;
  }
  underway.push(u);
}
// a move whose landing is a burst of the guns: its rounds over the last of its beat, the last as it lands
const burstTime = () => (FINALE.burst - 1) * FINALE.burstEvery;
function burst(t, round) {
  return { t, rounds: FINALE.burst, tick() { while (this.rounds > 0 && this.t <= (this.rounds - 1) * FINALE.burstEvery) { this.rounds--; round(this); } },
           land() {}, cancel() { this.rounds = 0; } };
}
// a raiding party's car, either side's: from a standstill at z0 down its lane, flat out, at z1 as its move lands
// (chargeDrive); the party's rams are the move's landing
function charger(u, i, n, car, z0, z1) {
  const c = { ...car, party: u, x: ROAD_LANES[lane + Math.floor((i + 0.5) * boardW() / n)], z: z0, z0, z1, v: 0, d: NaN, hit: -Infinity, seen: null };
  traffic.push(c);
  return c;
}
function chargeDrive(c) { // road.js updateTraffic: as far across as its move is, quicker and quicker
  const u = c.party, k = clamp(1 - u.t / u.T, 0, 1);
  c.z = c.z0 + (c.z1 - c.z0) * k * k;
  c.v = Math.abs(2 * (c.z1 - c.z0) * k / u.T);
}

// ---- your moves: an instrument pressed (or its key). Each fails, spending nothing, if it isn't there, isn't ready, or
// (the cannon) has no shells; else it is under way, and he may answer it
function move(m) {
  if (!run.fight || run.phase !== 'run' || warlord.wreck || !HAVE[m]() || !ready('you', m)) return false;
  const u = YOURS[m](beatOf('you'));
  if (!u) return false;
  spend('you', m);
  beep(m === 'raid' ? 520 : 880, 0.05);
  made('you', m, u);
  if (!u.off && !answer && ready('him', beater(m)) && rand() < FINALE.react) answer = { m: beater(m), t: FINALE.reactAfter };
  return true;
}
const YOURS = { // each move as it starts, t its beat: its landing, and its undoing if it is beaten
  cannon(t) { // a shell spent at once; it winds up, then fires (fortress.js)
    if (!blocks('cannon')) { beep(140, 0.05); flash('JAMMED', '#6af', false); return null; } // every cannon knocked out
    if (progress.shells < 1) { beep(140, 0.05); flash('NO SHELLS', '#fb3', false); return null; }
    progress.shells--;
    windSound('cannon', t, 0.5);
    return { t, land() { reloading = 0; progress.shells++; fireCannon(this.twice); }, cancel() {} };
  },
  raid(t) { // a party out from your front and across at him abreast: a ram each as it lands (gang.js); beaten, they are
    const u = { t, cars: [] }, n = Math.min(FINALE.party, role('raider')); // shot up, wrecks
    for (let i = 0; i < n; i++) u.cars.push(charger(u, i, n, { raider: warlord, fleet: true, dir: 1, rammed: 0, gun: 0, turn: run.t,
      look: racerSprite(FIELD - (run.sent++ % Math.max(1, riders())), true, true) }, odo + MY_FRONT + 2, warlord.z - 6));
    return Object.assign(u, { land() { for (const c of this.cars) if (!c.gone && !c.wreck) raidRam(c, warlord); },
      cancel() { for (const c of this.cars) { if (!c.gone && !c.wreck) crewHit(WRECK.hp, c); if (!c.wreck) c.gone = true; } } }); // oil.js
  },
  guns(t) { // they spin up, then a burst (gunShot)
    windSound('guns', t - burstTime(), 0.5);
    return burst(t, gunShot);
  },
  rockets(t) { // a salvo: up from your rig, over at the top and down onto him (drawSalvos)
    const n = blocks('rockets');
    if (!n) { beep(140, 0.05); flash('JAMMED', '#6af', false); return null; } // every pod knocked out (a War Boy's grenade)
    const s = { t, T: t, hit: FINALE.salvo * n };
    salvos.push(s);
    wearOut('rockets', WEAR.rockets); // fortress.js
    windSound('rockets', t, 0.5);
    return { t, land() { salvos = salvos.filter(x => x !== s); if (!warlord.wreck) { hurtCar(warlord, s.hit * (this.twice ? 2 : 1)); crashSound(); } },
             cancel() { salvos = salvos.filter(x => x !== s); } };
  },
};
function gunShot(u) { // a round of your burst: the War Rig's guns and the board's, as fireGuns does (gang.js)
  beep(70, 0.04);
  tracers.push([null, warlord, performance.now()]);
  hurtCar(warlord, GUN * (lvl('guns') + blocks('gun')) * (u.twice ? 2 : 1)); // double if it countered
  wearOut('gun', WEAR.gun); // fortress.js
}
// keys (fortress.js rigKey): S the raiders (SEND's), Space the cannon, G the guns, R the rockets
function fightKey(k, repeat) {
  const m = { s: 'raid', S: 'raid', ' ': 'cannon', g: 'guns', G: 'guns', r: 'rockets', R: 'rockets' }[k];
  if (m && !repeat) move(m);
  return !!m;
}

// ---- his moves, any of the four at random once he is free and has waited a while, each winding up where you can see
// it; and his answers to yours (move, above)
function hisMove(m = MOVES[Math.floor(rand() * MOVES.length)]) {
  spend('him', m);
  run.hisClock = FINALE.his[0] + rand() * (FINALE.his[1] - FINALE.his[0]); // his wait once this one is over
  made('him', m, HIS[m](beatOf('him')));
}
const HIS = { // each move as it starts, as yours (YOURS, above)
  cannon(t) { // his turret winds up, a ring closing on its mouth (drawWarlord), then a shell at a column of your front row
    const col = Math.floor(rand() * boardW());
    flash('HIS CANNON!', '#f55', false);
    windSound('cannon', t, 1);
    return { t, land() { hisShell(col, this.twice); }, cancel() {} };
  },
  rockets(t) { // up out of his deck on their smoke, over at the top and down onto a cell of the board, its mark blinking
    const r = { c: warlord, x: ROAD_LANES[lane + Math.floor(rand() * boardW())], y: Math.floor(rand() * boardH()), t: t / 2, flight: t / 2,
                air: false, hit: FINALE.rocket }; // fortress.js rocketTick lands it
    rockets.push(r);
    flash('ROCKETS!', '#f55', false);
    windSound('rockets', t, 1);
    const u = { t, rocket: r, land() {}, cancel() { rockets = rockets.filter(x => x !== r); } };
    r.party = u; // doubled if it counters (fortress.js landRocket)
    return u;
  },
  raid(t) { // three of his cars out of his gate and across at you abreast, each to ram your front row as it lands
    const u = { t, cars: [] }, n = Math.min(FINALE.party, boardW());
    for (let i = 0; i < n; i++) u.cars.push(charger(u, i, n, { hisRaider: true, dir: -1, w: CAR_M, warned: true,
      look: madLook(trafficLook(1 + Math.floor(rand() * 999))) }, warlord.z - 6, odo + MY_FRONT + 1));
    flash('HIS RAIDERS!', '#f55', false);
    horn();
    return Object.assign(u, { land() { for (const c of this.cars) if (!c.gone && !c.wreck) hisRam(c, this.twice); },
                              cancel() { for (const c of this.cars) if (!c.gone) Object.assign(c, { wreck: true, v: 0 }); } });
  },
  guns(t) { // his gun nests spin up (drawWarlord), then a burst at you, round after round (hisRound)
    flash('HIS GUNS!', '#f55', false);
    windSound('guns', t - burstTime(), 1);
    return burst(t, hisRound);
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
function hisRound(u) { // a round of his guns, at a cell of your front row
  tracers.push([warlord, 'you', performance.now()]);
  beep(90, 0.03);
  hitCell(FINALE.round * (u.twice ? 2 : 1) * (1 - armorCut()), Math.floor(rand() * boardW()), 0);
  if (wrecked()) finishRun('wrecked');
}
function hisRam(c, twice) { // one of his raiders into your front row, and gone
  c.gone = true;
  hitCell(FINALE.ram * (twice ? 2 : 1) * (1 - armorCut()), clamp(columnAt(c.x), 0, boardW() - 1), 0); // fortress.js
  crashSound();
  shake = Math.max(shake, 0.4);
  if (wrecked()) finishRun('wrecked');
}

// the wind-ups' sounds (Web Audio, engine.js), his louder than yours: the cannon a hum rising to its shot, the guns a
// rattle spinning up, the rockets a roar going up and a whistle coming down
function windSound(kind, secs, loud) {
  if (!ctx) return;
  const t = ctx.currentTime, mid = t + secs / 2, end = t + secs;
  // a sound through a filter (at Hz), swept from f0 to f1 Hz (its own pitch, or the filter's for a hiss), swelling to vol
  const voice = (src, filter, at, f0, f1, from, to, vol) => {
    const g = ctx.createGain(), f = Object.assign(ctx.createBiquadFilter(), { type: filter }), p = src.frequency ?? f.frequency;
    f.frequency.value = at;
    p.setValueAtTime(f0, from); p.exponentialRampToValueAtTime(f1, to);
    g.gain.setValueAtTime(0.0001, from); g.gain.exponentialRampToValueAtTime(vol * loud, to - 0.03); g.gain.exponentialRampToValueAtTime(0.0001, to + 0.05);
    src.connect(f).connect(g).connect(carBus); src.start(from); src.stop(to + 0.1);
  };
  const osc = type => Object.assign(ctx.createOscillator(), { type }), hiss = () => Object.assign(ctx.createBufferSource(), { buffer: noise, loop: true });
  if (kind === 'cannon') voice(osc('sawtooth'), 'lowpass', 900, 45, 180, t, end, 0.12);
  if (kind === 'guns') voice(osc('square'), 'highpass', 300, 5, 30, t, end, 0.1);
  if (kind === 'rockets') { voice(hiss(), 'bandpass', 0, 300, 1500, t, mid, 0.25); voice(osc('sine'), 'lowpass', 4000, 1600, 400, mid, end, 0.05); }
}

// his wind-ups, drawn over his fortress (gang.js renderGang), each its own (the owner, 5 Nov, after playtesting: "it's
// hard to spot what is coming (except the enemy raiders - those are great)"; "I like the cannon closing circle"): his
// cannon's ring closing on his turret's mouth, its glow growing, the shot as it closes; his gun nests spinning up,
// glowing and throwing sparks, then flashing as they fire; his rockets up out of his deck on their smoke, over at the top
// and down at you (the owner's: "they could first go up and then turn towards the player"). His raiders are their cars
function drawWarlord() {
  const s = warlord?.seen;
  if (!s || warlord.wreck) return;
  const cx = s[0] + s[2] / 2, now = performance.now();
  for (const u of underway) {
    if (u.side !== 'him') continue;
    const k = clamp(1 - u.t / u.T, 0, 1);
    if (u.m === 'cannon') {
      const y = s[1] + s[3] * 0.2, mouth = s[3] * 0.07, r = mouth + (Math.max(s[2] * 0.6, canvas.height * 0.3) - mouth) * (1 - k);
      const glow = g2d.createRadialGradient(cx, y, 0, cx, y, s[3] * (0.1 + 0.3 * k));
      glow.addColorStop(0, `rgba(255, 220, 120, ${(0.4 + 0.6 * k).toFixed(2)})`); glow.addColorStop(1, 'rgba(255, 90, 20, 0)');
      g2d.fillStyle = glow; g2d.beginPath(); g2d.arc(cx, y, s[3] * (0.1 + 0.3 * k), 0, 2 * Math.PI); g2d.fill();
      ring(cx, y, mouth, Math.max(2 * canvas.px, s[3] * 0.025), 'rgba(255, 240, 200, 0.7)'); // where it closes
      if (k < 0.9 || now % 160 < 100) // closing, blinking at the last
        ring(cx, y, r, Math.max(4 * canvas.px, s[3] * 0.06 * (0.6 + 0.8 * k)), `rgb(255, ${Math.round(220 - 160 * k)}, 40)`);
    }
    if (u.m === 'guns') for (const f of [0.12, 0.88]) {
      const x = s[0] + s[2] * f, y = s[1] + s[3] * 0.24;
      if (u.rounds < FINALE.burst) { // firing
        if (now % 120 < 60) { g2d.fillStyle = '#fff3c0'; g2d.beginPath(); g2d.arc(x, y, s[3] * 0.16, 0, 2 * Math.PI); g2d.fill(); }
        continue;
      }
      spinUp(x, y, s[3] * 0.17, spun(u, k));
    }
    if (u.m === 'rockets') { // three abreast, out of his deck and up, over at the top, down onto the cell they are locked on
      const r = u.rocket, w = canvas.width, col = (r.x - carX) / LANE_W + (boardW() - 1) / 2, to = [w * (0.4 + 0.2 * (col + 0.5) / boardW()), canvas.height * 0.72];
      for (let i = -1; i <= 1; i++) drawRocket(k, [cx + i * s[2] * 0.15, s[1] + s[3] * 0.3], [cx + i * w * 0.05, canvas.height * PEAK], to, w / 240, w / 60);
    }
  }
}
// a rocket in the fight, either side's: up from where it was fired, over at the top of the windshield (PEAK down the
// screen: below the mirror) and down onto what it is after, at k (0 to 1) of its beat; a trail of smoke behind it; its
// size size0 going up, size1 as it lands
const PEAK = 0.2;
function rocketAt(k, from, peak, to) {
  if (k < 0.5) { const q = (2 * k) ** 2; return [from[0] + (peak[0] - from[0]) * q, from[1] + (peak[1] - from[1]) * q]; } // up, quicker and quicker
  const q = (2 * k - 1) ** 1.4, over = [peak[0] + (to[0] - peak[0]) * 0.25, peak[1] - canvas.height * 0.08], p = 1 - q; // over, and down
  return [p * p * peak[0] + 2 * p * q * over[0] + q * q * to[0], p * p * peak[1] + 2 * p * q * over[1] + q * q * to[1]];
}
function drawRocket(k, from, peak, to, size0, size1) {
  const size = q => q < 0.5 ? size0 : size0 + (size1 - size0) * (2 * q - 1) ** 2;
  for (let j = 8; j > 0; j--) { // the smoke
    const q = Math.max(0, k - j * 0.02), [x, y] = rocketAt(q, from, peak, to);
    g2d.fillStyle = `rgba(190, 190, 190, ${(0.7 - j * 0.075).toFixed(2)})`; g2d.beginPath(); g2d.arc(x, y, size(q) * (0.9 + j * 0.25), 0, 2 * Math.PI); g2d.fill();
  }
  const [x, y] = rocketAt(k, from, peak, to);
  g2d.fillStyle = '#ffb347'; g2d.beginPath(); g2d.arc(x, y, size(k) * 1.1, 0, 2 * Math.PI); g2d.fill(); // its flame, its nose
  g2d.fillStyle = '#2b3011'; g2d.beginPath(); g2d.arc(x, y, size(k) * 0.7, 0, 2 * Math.PI); g2d.fill();
}
// a burst's spin-up, either side's (the guns' wind-up; the owner, 6 Nov: "it would be nice if guns would spin up like
// gatling guns"): how far along (0 to 1) at k of its beat; drawn at x, y, r across: a gatling's barrels front on, six
// round a hub in their dark housing, turning quicker and quicker, a blur at speed, heating from steel to orange,
// glowing and throwing sparks
const spun = (u, k) => clamp(k * u.T / (u.T - burstTime()), 0, 1);
function spinUp(x, y, r, q) {
  const a = performance.now() / 1000 * (2 + 45 * q * q), px = canvas.px, dot = (cx, cy, rr) => { g2d.beginPath(); g2d.arc(cx, cy, rr, 0, 2 * Math.PI); g2d.fill(); };
  const glow = g2d.createRadialGradient(x, y, r * 0.5, x, y, r * (1.4 + 0.8 * q));
  glow.addColorStop(0, `rgba(255, 190, 80, ${(0.2 + 0.6 * q).toFixed(2)})`); glow.addColorStop(1, 'rgba(255, 90, 20, 0)');
  g2d.fillStyle = glow; dot(x, y, r * (1.4 + 0.8 * q));
  g2d.fillStyle = '#16161a'; dot(x, y, r); // the housing
  g2d.strokeStyle = '#8a8a94'; g2d.lineWidth = Math.max(px, r * 0.1); g2d.beginPath(); g2d.arc(x, y, r, 0, 2 * Math.PI); g2d.stroke();
  const hot = `rgb(${Math.round(110 + 145 * q)}, ${Math.round(110 + 70 * q)}, ${Math.round(118 - 70 * q)})`; // steel to orange
  if (q > 0.25) { // the blur of the barrels going round
    g2d.strokeStyle = `rgba(255, 200, 130, ${(0.6 * (q - 0.25)).toFixed(2)})`; g2d.lineWidth = r * 0.34;
    g2d.beginPath(); g2d.arc(x, y, r * 0.6, 0, 2 * Math.PI); g2d.stroke();
  }
  for (let i = 0; i < 6; i++) { const b = a + i * Math.PI / 3; g2d.fillStyle = hot; dot(x + Math.cos(b) * r * 0.6, y + Math.sin(b) * r * 0.6, r * 0.17);
    g2d.fillStyle = '#060606'; dot(x + Math.cos(b) * r * 0.6, y + Math.sin(b) * r * 0.6, r * 0.08); } // each barrel's bore
  g2d.fillStyle = '#5a5a62'; dot(x, y, r * 0.2); // the hub
  g2d.fillStyle = '#ffd36a'; // sparks
  for (let i = 0; i < Math.round(10 * q); i++) { const b = Math.random() * 2 * Math.PI, d = r * (1.2 + Math.random() * 1.4), z = Math.max(1.5 * px, r * 0.12);
    g2d.fillRect(x + Math.cos(b) * d, y + Math.sin(b) * d, z, z); }
}
// a wind-up's ring or corner, outlined dark so it shows over the sun on a phone too
function ring(x, y, r, lw, color) {
  for (const [c, w] of [['rgba(20, 8, 4, 0.55)', lw + 3 * canvas.px], [color, lw]]) {
    g2d.strokeStyle = c; g2d.lineWidth = w; g2d.beginPath(); g2d.arc(x, y, r, 0, 2 * Math.PI); g2d.stroke();
  }
}
// your wind-ups (the owner, 6 Nov, on a phone: "the gun wind-up animation disappeared ... I meant cannon"; yours were
// heard only, and a phone on silent mutes them): the guns on your hood spinning up at their muzzles (gang.js MUZZLES; a deck gunner's
// place without them), then their burst's tracers; your cannon's lock on him, four brackets closing on his hull in the
// heads-up display's color (his ring is his turret's, in his fire's), the shot as they close. Your rockets and raiders
// show themselves
function drawYours() {
  const s = warlord?.seen, w = canvas.width, h = canvas.height;
  if (!s || warlord.wreck) return;
  for (const u of underway) {
    if (u.side !== 'you') continue;
    const k = clamp(1 - u.t / u.T, 0, 1);
    if (u.m === 'guns' && u.rounds === FINALE.burst) { // spinning up
      const q = spun(u, k), at = lvl('guns') ? [-1, 1].map(i => [w * MUZZLES[i][0], h * MUZZLES[i][1]]) : [[w * 0.5, h * 0.62]];
      for (const [x, y] of at) spinUp(x, y, w * 0.02, q);
    }
    if (u.m === 'cannon' && (k < 0.9 || performance.now() % 160 < 100)) { // closing, blinking at the last
      const cx = s[0] + s[2] / 2, cy = s[1] + s[3] * 0.55, half = s[2] * (0.25 + 0.55 * (1 - k)), arm = Math.max(s[2] * 0.08, w * 0.012);
      const lw = Math.max(3 * canvas.px, w * 0.004 * (1 + k));
      for (const [c, lwc] of [['rgba(0, 20, 18, 0.55)', lw + 3 * canvas.px], [`rgba(110, 255, 230, ${(0.6 + 0.4 * k).toFixed(2)})`, lw]]) {
        g2d.strokeStyle = c; g2d.lineWidth = lwc; // outlined, as his ring
        for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { // a corner each
          const x = cx + dx * half, y = cy + dy * half * 0.6;
          g2d.beginPath(); g2d.moveTo(x - dx * arm, y); g2d.lineTo(x, y); g2d.lineTo(x, y - dy * arm); g2d.stroke();
        }
      }
    }
  }
}
function drawFight() { drawWarlord(); drawYours(); drawSalvos(); } // gang.js renderGang: his wind-ups, yours, your rockets
// your salvos in the air: in the fight up from your rig, over at the top and down onto him (drawRocket); the pods' in a
// race, at their car (gang.js firePods), from your rig's front up in a high arc and down onto it, as a rocket car's come
// at you (fortress.js drawRockets)
function drawSalvos() {
  const w = canvas.width, h = canvas.height;
  for (const r of [...salvos, ...podSalvos]) {
    const s = (r.car ?? warlord)?.seen;
    if (!s) continue;
    const [x1, y1] = [w / 2, h * 0.7], [x2, y2] = [s[0] + s[2] / 2, s[1] + s[3] / 2];
    if (r.T) { // the fight's
      for (let i = -1; i <= 1; i++) drawRocket(1 - r.t / r.T, [x1 + i * w * 0.03, y1], [x1 + i * w * 0.05, h * PEAK], [x2 + i * s[2] * 0.15, y2], w / 160, w / 400);
      continue;
    }
    const k = 1 - r.t / ROCKET.flight;
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

// ---- the end: his fortress down (gang.js total), or yours wrecked (finishRun). The run stops there, as the tank's did:
// a fight earns nothing on the road; won, the ending's screen after it (distance.js renderRun)
function warlordDown(c) {
  Object.assign(c, { wreck: true, hp: 0 });
  target = null;
  progress.warlord = (progress.warlord ?? 0) + 1;
  finishFight(true);
}
function finishFight(won) {
  for (let i = traffic.length; i--;) if (traffic[i].party) traffic.splice(i, 1); // raiding parties, either side's, gone
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
  Object.assign(bar.style, { left: `${s[0] * k}px`, top: `${s[1] * k}px`, width: `${s[2] * k}px` }); // over him, as wide
  bar.style.setProperty('--hp', hpLeft(warlord).toFixed(3)); // oil.js
}

// the instruments: a press as the finger lands, as SEND's (oil.js); the cannon's is its pedal (fortress.js)
for (const m of GAUGES) $(`fight-${m}`).onpointerdown = e => { e.preventDefault(); move(m); };

// the fight's tutorial (the owner, 6 Nov: "can we create a tutorial for the bossfight along with a cheat-sheet of
// who-beats-who (maybe something that is accessible even during the fight somehow)?"): in the cockpit as the first
// fight starts, paused, each instrument you have lit up in turn (inFight: not popped up in the garage, where they
// aren't; tutorial.js popTour), and in HOW TO DRIVE after. A new id, so a game that saw the garage's three pages has
// this one too
TUTORIALS.push({ id: 'warlordFight', name: "The warlord's fight", inFight: true, open: () => finaleOpen(), pages: [
  { title: 'THE WARLORD',
    both: 'His fortress holds the road, 70 m off: bring it down before he wrecks yours. His health is over him, yours in ' +
      'the mirror. Wrecked, you are back in the garage: a run to grind, or another go. The fight waits while you read.' },
  { title: 'THE CB RADIO', at: '#fight-raid', if: () => HAVE.raid(),
    touch: 'Tap the CB radio: a raiding party of three drives across at him, a ram each.',
    desk: 'S, or click the CB radio: a raiding party of three drives across at him, a ram each.' },
  { title: 'THE CANNON', at: '#cannon-pedal', if: () => HAVE.cannon(),
    touch: 'Press the pedal: your cannon locks on, the brackets closing on him, and fires as they close. A shell a shot.',
    desk: 'Space, or click the pedal: your cannon locks on, the brackets closing on him, and fires as they close. A shell a shot.' },
  { title: 'THE GUNS', at: '#fight-guns', if: () => HAVE.guns(),
    touch: 'Pull the lever: your guns spin up, then fire a burst.',
    desk: 'G, or click the lever: your guns spin up, then fire a burst.' },
  { title: 'THE ROCKETS', at: '#fight-rockets', if: () => HAVE.rockets(),
    touch: 'Hit the launch button: a salvo goes up, over the top and down on him.',
    desk: 'R, or click the launch button: a salvo goes up, over the top and down on him.' },
  { title: 'ONE AT A TIME',
    both: 'Each move takes 3 seconds, its wind-up and all, and nothing else goes till it lands: the bars under the ' +
      'instruments fill again. Dispatch makes yours quicker.' },
  { title: 'WHAT BEATS WHAT', at: '#fight-sheet',
    touch: 'The card on the windshield: the cannon beats raiders, raiders beat guns, guns beat rockets, and rockets beat the ' +
      'cannon. Tap it in the fight to read this again.',
    desk: 'The card on the windshield: the cannon beats raiders, raiders beat guns, guns beat rockets, and rockets beat the ' +
      'cannon. Click it in the fight to read this again.' },
  { title: 'HIS MOVES',
    both: 'His moves wind up for 3 seconds too: a ring closing on his turret is his cannon, his gun nests spinning up his ' +
      'guns, rockets rising from his deck his rockets, his cars coming at you his raiders.' },
  { title: 'COUNTER, THEN STRIKE',
    both: 'Answer his move with the one that beats it: his is cancelled, yours does double, and he reels a moment after ' +
      'yours lands: strike then. Answer with the one it beats and yours is lost. Strike while he is free and he may answer.' },
] });
const SHEET_PAGE = 'WHAT BEATS WHAT';
// the card on the windshield (index.html #fight-sheet), the cycle drawn: a tap opens the tutorial at it, the fight paused
$('fight-sheet').onpointerdown = e => {
  e.preventDefault();
  openTour('warlordFight', true);
  tour.page = pagesOf(tutorial('warlordFight')).findIndex(p => p.title === SHEET_PAGE);
  renderTour();
};

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
