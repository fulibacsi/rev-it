// The finale (the owner, 4 Nov): the warlord of the coast road, his fortress across all four lanes, head-on, both
// standing (the owner: "front-to-front, head on against each other, both occupying 4 lanes, waiting, like it's trench
// warfare"), 70 m apart (at 100 m he looked small on a phone). It opens once your fortress is full size, four lanes wide
// and five rows long, with the Grinder on its front (the owner); from then on the garage has FIGHT beside DRIVE, and a
// fight lost is back to the garage: a run to grind, or another fight. Nothing in it is automatic (the owner: "This is
// the finale, if you want to win, you have to play"): no driver aid, no Auto cannon or Auto gun, no War chief or
// Foreman. No traffic: his fortress holds the road. Your health is in the mirror where the time was, his over his
// fortress (the owner: health bars for the first iteration). Your weapons are instruments of their own on the dashboard,
// each there only if you have it (the owner): the CB radio sends a raiding party, the pedal fires the cannon, the lever
// a burst of the guns, the launch button the rockets (their pods are to come). They share one cooldown, so mashing them
// all wins nothing (the owner), and Dispatch shortens it. This first layer: his attacks on his own clock, his cannon at
// your front row and his rockets on a cell of the board; the moves that beat one another (the owner's
// rock-paper-scissors) come next. Claude's numbers, for the balance to come: m between you; his health; s a beat, and
// Dispatch's share less a level; s between his moves, the first; % his shell before Armor plating (a rocket's 15);
// raiders a party; a burst's shots, s apart
const FINALE = { gap: 70, hp: 8000, beat: 1.5, quicker: 0.08, his: 3, first: 2, shot: 10, party: 3, burst: 8, burstEvery: 0.1 };
const finaleOpen = () => rigged() && lvl('widen') >= 3 && lvl('lengthen') >= 4 && lvl('grinder') > 0;
let warlord = null; // his fortress, on the road while you fight
const fighting = () => !!run.fight && run.phase !== 'garage'; // a fight under way (run.fight: the last run was one)

// the pacing (the owner, 4 Nov: "Let's go with the shared timeout and the dispatch improvement, but make the codebase to
// be prepared for individual cooldowns or even turns"): ready() and spend() are all a fight asks, for you and for him
// alike; PACE says how they answer. 'shared': a move cools every move of its side; 'each': only itself. Turns would
// answer here too: ready only on your side's turn, spend passing it
const PACE = 'shared';
const MOVES = ['raid', 'cannon', 'guns', 'rockets'];
let cooling = { you: {}, him: {} }; // s left, a side's moves
const beatOf = side => side === 'you' ? FINALE.beat * (1 - FINALE.quicker * lvl('workRate')) : FINALE.his; // Dispatch: yours
const ready = (side, m) => (cooling[side][m] ?? 0) <= 0;
function spend(side, m) { for (const k of PACE === 'shared' ? MOVES : [m]) cooling[side][k] = beatOf(side); }
const readiness = m => clamp(1 - (cooling.you[m] ?? 0) / beatOf('you'), 0, 1); // the instruments' bars

// your weapons, each there only if you have it (the owner): a war crew to raid with, a cannon on the board, guns (the
// War Rig's or on the board), a rocket pod (to come)
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
  cooling = { you: {}, him: { cannon: FINALE.first, rockets: FINALE.first } };
  Object.assign(run, { burst: 0, burstAt: 0, won: false });
}
function warlordDrive(c) { c.z = odo + FINALE.gap; } // road.js updateTraffic: he stands his ground

// distance.js updateRun, the fight's every frame: the cooldowns, a burst under way, his move when his clock allows,
// his rockets in the air (fortress.js)
function fightTick(dt) {
  for (const side of ['you', 'him']) for (const m of MOVES) cooling[side][m] = Math.max(0, (cooling[side][m] ?? 0) - dt);
  for (let i = traffic.length; i--;) if (leftBehind(traffic[i])) traffic.splice(i, 1); // oil.js: raiders home
  target = warlord.wreck ? null : warlord;
  rigTick(dt); // fortress.js: the cannon's reload, the engines' wear
  if (run.burst > 0 && (run.burstAt -= dt) <= 0) gunShot();
  if (ready('him', 'cannon')) hisMove();
  rocketTick(dt);
}

// ---- your moves: an instrument pressed (or its key). Each fails, spending nothing, if it isn't there, isn't ready, or
// (the cannon) has no shells
function move(m) {
  if (!run.fight || run.phase !== 'run' || warlord.wreck || !HAVE[m]() || !ready('you', m)) return false;
  if (m === 'cannon') { reloading = 0; if (!fireCannon()) return false; } // fortress.js: the beat is the reload
  if (m === 'raid') for (let n = Math.min(FINALE.party, role('raider')); n > 0; n--) sendRaider({ car: warlord }); // gang.js
  if (m === 'guns') Object.assign(run, { burst: FINALE.burst, burstAt: 0 });
  if (m === 'rockets') return false; // their pods are to come
  spend('you', m);
  beep(m === 'raid' ? 520 : 880, 0.05);
  return true;
}
function gunShot() { // a round of the burst: the War Rig's guns and the board's, as fireGuns does (gang.js)
  run.burst--;
  run.burstAt = FINALE.burstEvery;
  beep(70, 0.04);
  tracers.push([null, warlord, performance.now()]);
  hurtCar(warlord, GUN * (lvl('guns') + blocks('gun')));
  wearOut('gun', WEAR.gun); // fortress.js
}
// keys (fortress.js rigKey): S the raiders (SEND's), Space the cannon, G the guns, R the rockets
function fightKey(k, repeat) {
  const m = { s: 'raid', S: 'raid', ' ': 'cannon', g: 'guns', G: 'guns', r: 'rockets', R: 'rockets' }[k];
  if (m && !repeat) move(m);
  return !!m;
}

// ---- his moves, on his own clock: a shell at your front row, in a column at random, or a rocket locked on a cell of
// the board (fortress.js rocketTick lands it)
function hisMove() {
  const m = rand() < 0.5 ? 'cannon' : 'rockets', col = Math.floor(rand() * boardW());
  spend('him', m);
  if (m === 'rockets') {
    rockets.push({ c: warlord, x: ROAD_LANES[lane + col], y: Math.floor(rand() * boardH()), t: ROCKET.lock, air: false });
    flash('ROCKET!', '#f55', false);
    beep(1200, 0.08);
    return;
  }
  tracers.push([warlord, 'you', performance.now()]); // gang.js
  hitCell(FINALE.shot * (1 - armorCut()), col, 0); // fortress.js: his shells come from ahead
  flash('HIT', '#f55', false);
  crashSound();
  shake = Math.max(shake, 0.5);
  if (wrecked()) finishRun('wrecked');
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
