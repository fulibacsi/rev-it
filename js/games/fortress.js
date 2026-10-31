// The Fortress, Distance's fifth act (decided 28-29 Oct, built in layers: docs/design-notes.md, Act 5). Beating the
// tank opens it (distance.js: its tab and ACT V's card). Its first card, the Rebuild, makes the car a war rig from the
// tank's parts: no gear shifter and no pedals (the owner, 30 Oct: "we brake for no-one"), the robot driving with the
// aids it needs bolted on, and a cannon's firing pedal in the pedals' place. In the shifter's place, the fortress's
// board: its plan from above, ahead up as on the sonar, a lane wide and a car long at first, and the hold beside it
// with the parts you carry. A part goes on with a drag (it fits as it comes: no turning it), and comes off, for good,
// with a press and hold. The tank's cannon is the first part: mounted, its pedal fires a shell a press at the car in
// the reticle. On the road the reticle takes only the notable enemies, the army's tanks and the rival gang's war rigs;
// the raiders get the rest, the rival gang's racers among them, and those carry the cannon's shells.

Object.assign(UPGRADES, {
  // the tank's parts (the owner, 29 Oct), paid in points: piled up by then (act4.py: 1,800-2,900 at the tank) with
  // nothing else to buy, and every resource builds the fortress (the owner). The price a first guess, for act5.py
  rebuild: { name: 'Rebuild', tab: 'fortress', max: 1, base: 1500, wallet: 'points', needs: ['fortressTab'],
             bought: () => { progress.fortress.hold.push({ kind: 'cannon', cells: ONE }); progress.shells += SHELLS.tank; }, // distance.js buy
             info: () => "the tank's parts make your car a war rig: no shifter, no pedals, it drives itself. The tank's " +
               `cannon for its board, ${SHELLS.tank} shells and a firing pedal` },
  // the board longer, a row a level (the owner: the grid grows longer and wider; wider comes with the rig taking more
  // lanes), and the hold's slots (the owner: one, upgraded to three). Prices Claude's first guesses, for act5.py: about
  // 1,000-1,300 scrap and 400 points come in a race
  lengthen: { name: 'Lengthen', tab: 'fortress', max: 4, base: 400, growth: 2, needs: ['rebuild'],
              info: l => `the fortress ${1 + l} car${l ? 's' : ''} long: room for ${1 + l} row${l ? 's' : ''} of parts, and ` +
                'every row weighs and drags' },
  inventory: { name: 'Inventory', tab: 'fortress', max: 2, base: 600, growth: 2, wallet: 'points', needs: ['rebuild'],
               info: l => `${1 + l} slot${l ? 's' : ''} in the hold for the parts you pick up` },
  // the board a lane wider a level, to the road's four (the owner: its width is lanes), and the rig with it: from two
  // lanes wide a truck's wheel shifts it a lane at a time, the robot brakes for no one, and it rams (the owner, 30 Oct)
  widen: { name: 'Widen', tab: 'fortress', max: 3, base: 800, growth: 2.5, needs: ['rebuild'],
           info: l => l ? `the fortress ${1 + l} lanes wide: a truck's wheel shifts it a lane at a time, it brakes for no ` +
             'one and rams, head-on too; every lane drags' : 'a lane wide' },
});
const rigged = () => lvl('rebuild') > 0;
// with no shifter and no pedals the rig drives itself (the owner, 30 Oct): the aids that work them, bolted on, their
// garage cards under a metal plate (distance.js renderGarage), whatever their switches said
const RIG_AIDS = ['clutch', 'gas', 'shift', 'steer', 'cruise'];
const rigDrives = id => rigged() && RIG_AIDS.includes(id);
const ONE = [[0, 0]]; // a part's cells, across (lanes) and along (ahead up): a single block
const holdSize = () => 1 + lvl('inventory'); // the hold's slots (the owner: one, upgraded to three)
const boardW = () => 1 + lvl('widen'), boardH = () => 1 + lvl('lengthen'); // lanes, car lengths

// ---- the board: the fortress's plan, progress.fortress ({ parts placed, hold }) ----
const ICONS = { // a part from above, ahead up, on its first block: the tank's turret and its gun; twin guns; a riveted
  cannon: '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" rx="1.5" fill="#4b5320"/><circle cx="5" cy="5.6" ' + // plate;
    'r="2.6" fill="#3d4419"/><rect x="4.4" y="0.4" width="1.2" height="4.4" fill="#22260d"/></svg>', // a spiked bar; an engine
  gun: '<svg viewBox="0 0 10 10"><rect x="2.4" y="4" width="5.2" height="4.4" rx="1" fill="#30343c"/><rect x="3.4" y="0.6" ' + // block
    'width="1" height="4.2" fill="#14161a"/><rect x="5.6" y="0.6" width="1" height="4.2" fill="#14161a"/></svg>',
  armor: '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" rx="0.6" fill="#8a8c94" stroke="#55575e" stroke-width=".5"/>' +
    '<g fill="#55575e"><circle cx="2.4" cy="2.4" r=".6"/><circle cx="7.6" cy="2.4" r=".6"/><circle cx="2.4" cy="7.6" r=".6"/>' +
    '<circle cx="7.6" cy="7.6" r=".6"/></g></svg>',
  spikes: '<svg viewBox="0 0 10 10"><rect x="1" y="5.4" width="8" height="2.4" rx=".4" fill="#3c3c42"/><path d="M1.8 5.4 2.7 1.2 ' +
    '3.6 5.4ZM4.1 5.4 5 1.2 5.9 5.4ZM6.4 5.4 7.3 1.2 8.2 5.4Z" fill="#e2e2ea"/></svg>',
  engine: '<svg viewBox="0 0 10 10"><rect x="2" y="1.4" width="6" height="7.2" rx="1" fill="#2e2e34"/><g fill="#8a8c94">' +
    '<circle cx="3.8" cy="3" r=".9"/><circle cx="6.2" cy="3" r=".9"/><circle cx="3.8" cy="5" r=".9"/><circle cx="6.2" cy="5" r=".9"/>' +
    '<circle cx="3.8" cy="7" r=".9"/><circle cx="6.2" cy="7" r=".9"/></g></svg>',
};
const extent = (cells, i) => 1 + Math.max(...cells.map(c => c[i]));
// a part as its blocks (a bent three leaves a corner empty), its icon on the first; cell: px a block, in the hold where
// a three-block part must fit one slot
const partHtml = (p, more = '', cell) => `<div class="part ${p.kind}" ${more} style="--w: ${extent(p.cells, 0)}; --h: ` +
  `${extent(p.cells, 1)};${p.x !== undefined ? ` --x: ${p.x}; --y: ${p.y};` : ''}${cell ? ` --cell: ${cell}px` : ''}">` +
  p.cells.map(([x, y], i) => `<i style="--cx: ${x}; --cy: ${y}">${i ? '' : ICONS[p.kind]}</i>`).join('') + '</div>';
const taken = (f, x, y) => f.parts.some(p => p.cells.some(([cx, cy]) => p.x + cx === x && p.y + cy === y));
const fitsAt = (f, cells, x, y) => cells.every(([cx, cy]) => x + cx >= 0 && y + cy >= 0 && x + cx < boardW() && y + cy < boardH() &&
  !taken(f, x + cx, y + cy));
let shownBoard = ''; // what the board shows: redrawn only when that changes
function renderBoard() {
  const f = progress.fortress, n = holdSize(), w = boardW(), h = boardH(), key = JSON.stringify(f) + [n, w, h, innerWidth, innerHeight];
  if (key === shownBoard) return;
  shownBoard = key;
  // the cells as big as the plate allows, the hold beside the plan: inside its padding (6 px), past the label (16 px),
  // the gaps (8 px; 4 px between slots) and the 1 px borders of the plan and each slot
  const b = $('board'), inW = b.clientWidth - 12, inH = b.clientHeight - 12 - 16 - 8;
  const cell = Math.floor(Math.min(72, (inW - 8 - 4) / (w + 1), (inH - 2) / h, (inH - 6 * n) / n));
  $('board').style.setProperty('--cell', `${cell}px`);
  Object.assign($('fort-grid').style, { width: `${cell * w}px`, height: `${cell * h}px` });
  $('fort-grid').innerHTML = f.parts.map((p, i) => partHtml(p, `data-part="${i}"`)).join('') + '<i id="fort-ghost"></i>';
  $('fort-hold').innerHTML = Array.from({ length: n }, (_, i) => `<div class="slot" data-slot="${i}">` +
    `${f.hold[i] ? partHtml(f.hold[i], '', cell / Math.max(extent(f.hold[i].cells, 0), extent(f.hold[i].cells, 1))) : ''}</div>`).join('');
  for (const el of $('fort-hold').querySelectorAll('.part')) drag(el, (e, first) => dragPart(e, first, +el.parentNode.dataset.slot), dropPart);
  for (const el of $('fort-grid').querySelectorAll('.part')) drag(el, (e, first) => holdPart(e, first, +el.dataset.part), letGo);
}

// a part dragged from the hold floats a cell above the finger (the thumb would hide it), a ghost on the board's cells
// under it, green where it fits; let go once the ghost has rested on green for a beat and it goes on, else it goes back
// to the hold (the owner, 29 Oct: a drop that is clear, and still quick). Resting is the finger still: a slow flick
// across the board passed over a cell long enough to arm it. Pressed and held, a part on the board is thrown off, gone
// for good. Claude's numbers, to try on a phone
const REST = 200, THROW = 500, STILL = 6; // ms, ms, px a resting finger may wander
let dragging = null, throwing = null; // { slot, part, at: [x, y], fits, since, x, y }; { i, from, x, y }
function dragPart(e, first, slot) {
  const f = progress.fortress, cell = parseFloat($('board').style.getPropertyValue('--cell'));
  if (first) {
    dragging = { slot, part: f.hold[slot], at: null, fits: false, since: 0, x: e.clientX, y: e.clientY };
    $('fort-hold').querySelector(`[data-slot="${slot}"]`).classList.add('lifted');
    $('fort-drag').innerHTML = partHtml(dragging.part);
    $('fort-drag').style.setProperty('--cell', `${cell}px`);
    $('fort-drag').hidden = false;
  }
  const w = extent(dragging.part.cells, 0) * cell, h = extent(dragging.part.cells, 1) * cell;
  const left = e.clientX - w / 2, top = e.clientY - h - cell * 0.6, g = $('fort-grid').getBoundingClientRect();
  Object.assign($('fort-drag').style, { left: `${left}px`, top: `${top}px` });
  const at = [Math.round((left - g.left) / cell), Math.round((top - g.top) / cell)];
  const over = left + w > g.left && left < g.right && top + h > g.top && top < g.bottom; // over the board at all
  if (!over) { dragging.at = null; $('fort-ghost').className = ''; return; }
  const moved = Math.hypot(e.clientX - dragging.x, e.clientY - dragging.y) > STILL;
  if (moved || String(at) !== String(dragging.at)) // not resting: the beat starts again
    Object.assign(dragging, { at, since: performance.now(), fits: fitsAt(f, dragging.part.cells, ...at), x: e.clientX, y: e.clientY });
  Object.assign($('fort-ghost').style, { left: `${at[0] * cell}px`, top: `${at[1] * cell}px`, width: `${w}px`, height: `${h}px` });
  $('fort-ghost').className = dragging.fits ? 'fit' : 'no';
}
const armed = () => !!dragging?.at && dragging.fits && performance.now() - dragging.since >= REST;
function dropPart() {
  const f = progress.fortress;
  if (armed()) {
    f.parts.push({ ...dragging.part, x: dragging.at[0], y: dragging.at[1] });
    f.hold.splice(dragging.slot, 1);
    applyUpgrades(); // distance.js: an engine pulls from now on
    save();
    beep(660, 0.08);
  }
  dragging = null;
  $('fort-drag').hidden = true;
  shownBoard = '';
}
function holdPart(e, first, i) {
  if (first) throwing = { i, from: performance.now(), x: e.clientX, y: e.clientY };
  else if (throwing && Math.hypot(e.clientX - throwing.x, e.clientY - throwing.y) > 12) letGo(); // a slide isn't a hold
}
function letGo() {
  if (throwing) $('fort-grid').querySelector(`[data-part="${throwing.i}"]`)?.style.setProperty('--held', 0);
  throwing = null;
}
function throwOff(i) {
  progress.fortress.parts.splice(i, 1);
  applyUpgrades(); // distance.js: lighter, and what it did goes with it
  save();
  crashSound();
  throwing = null;
  shownBoard = '';
}

// ---- the tank's cannon (the owner, 29-30 Oct): mounted, a shell a press of the firing pedal (or Space) at the car in
// the reticle, in reach and in sight, then it reloads; holding the pedal fires no more. Heavy: a car, a racer, a police
// car in one; the next tank (1,500) in six. Act IV's guns stay on the rig. First guesses, for act5.py. It needs shells
// (the owner, 30 Oct): the tank's with the Rebuild, then two from every rival gang car totaled; the count is on its pedal
const CANNON = { damage: 250, reload: 2, reach: 300, heat: 10 }; // reach m, reload s, heat: a gun shot's times ten
const SHELLS = { tank: 10, gang: 2 };
const gangShells = c => rigged() && c.racer && !c.fleet ? SHELLS.gang : 0; // a car totaled (gang.js total): its shells
const cannonOn = () => rigged() && progress.fortress.parts.some(p => p.kind === 'cannon');
let reloading = 0, firedAt = -Infinity;
function fireCannon() {
  if (!cannonOn() || run.phase !== 'run' || reloading > 0) return false;
  if (progress.shells < 1) { beep(140, 0.05); flash('NO SHELLS', '#fb3', false); return false; }
  progress.shells--;
  reloading = CANNON.reload;
  firedAt = performance.now();
  const hit = target?.seen && target.z - odo < CANNON.reach ? target : null; // gang.js
  tracers.push(['cannon', hit, firedAt]); // drawn as a shell (gang.js drawTracers)
  beep(45, 0.3);
  shake = Math.max(shake, 0.35); // main.js: the rig jolts
  raiseHeat(WANTED.shot * CANNON.heat); // police.js
  if (hit) hurtCar(hit, CANNON.damage * blocks('cannon')); // every cannon block on the board, one shell
  return true;
}
function rigTick(dt) { reloading = Math.max(0, reloading - dt); } // distance.js updateRun
// the war rig's keys (distance.js key): Space fires the cannon, a shell a press; the gas, clutch, brake, gears and
// nitro are the robot's now, so their keys do nothing
function rigKey(k, repeat) {
  if (!rigged()) return false;
  if (k === ' ') { if (!repeat) fireCannon(); return true; }
  return ['Shift', 'b', 'B', 'ArrowUp', 'ArrowDown', 'n', 'N'].includes(k);
}
// ---- the road (the owner, 30 Oct): the reticle takes only the notable enemies, the army's tanks, the rival gang's war
// rigs and the police's pursuit SUVs (police.js; helicopters to come); the rest are the raiders' (gang.js crewTarget),
// and Hunter's
const notable = c => !!(c.tank || c.rig || c.suv);
// the lane beside the rig on your side of the road, for an enemy coming past it: your other lane while it is a lane
// wide, the one to the right of a fortress over the double yellow; none while it fills your side (car.js lane, rigW)
const sideLane = () => rigW === 1 ? (lane <= 1 ? 1 - lane : null) : lane >= 1 ? Math.min(lane - 1, 1) : null;
// the reticle's tag (gang.js renderGang), as the crew's over a spot (oil.js; the owner, 30 Oct: "I really like how the
// resources have their metadata over them"): what it is, its health, the shells it would take, how far
function notableTag(t) {
  const shots = Math.ceil(Math.max(0, t.hp ?? health(t)) / CANNON.damage);
  return [t.tank ? 'TANK' : t.rig ? 'RIG' : 'SUV', `${Math.round(100 * hpLeft(t))}%`, cannonOn() && `${shots} SHOT${shots === 1 ? '' : 'S'}`,
          `${Math.round(t.z - odo)} m`].filter(Boolean).join(' · ');
}

// the rival gang (the owner, 30 Oct): once the war rig is built, the racers you never paid off turn on you. Every
// GANG_CAR.every s it sends the nearest one still behind you, from beyond the sonar (so you see it come) up your other
// lane, and it drives at you as the police do from behind (police.js): past you, into your lane CHECK m ahead of you and
// a hard stop, then it races on, and does it again a while later; so does a rival coming past you on its own. One that
// gets away has a place on you; one totaled is out of the race, behind you (race.js position): places are won by
// destroying them now. In the oncoming lanes you are out of their way
const GANG_CAR = { every: 8, from: 260, closing: 30 }; // s, m behind you, m/s quicker than you
const CHECK = { near: 25, far: 60, cut: 3, stop: 2, again: 8 }; // m ahead; s to get across, braking, between goes
let gangClock = 0;
function updateGangCars(dt) { // distance.js updateRun
  const side = sideLane(); // no lane to come past in: none sent
  if (!rigged() || (gangClock -= dt) > 0 || side == null) return;
  const c = rivals().filter(c => !c.wreck && !c.stage && c.z < odo - GANG_CAR.from).sort((a, b) => b.z - a.z)[0];
  if (!c) return;
  gangClock = GANG_CAR.every;
  Object.assign(c, { stage: 'chase', z: odo - GANG_CAR.from, lane: side, x: MY_LANES[side], v: speed + GANG_CAR.closing });
}
function gangDrive(c, dt) { // road.js updateTraffic: true while it is at you; else it races as any racer does
  if (!rigged() || c.fleet || c.wreck) return false;
  const now = runTime() - run.left, ahead = c.z - odo, on = run.phase === 'run' && lane <= 1;
  if (!c.stage && on && ahead > CHECK.near && ahead < CHECK.far && c.v > speed - 1 && now >= (c.again ?? 0)) c.stage = 'chase';
  if (!c.stage) return false;
  if (c.stage === 'chase') { // up your other lane and past you
    c.v = speed + GANG_CAR.closing;
    if (ahead > CHECK.near) Object.assign(c, on ? { stage: 'cut', lane, t: CHECK.cut } : { stage: null, again: now + CHECK.again });
  } else if (c.stage === 'cut') { // across into your lane
    c.v = speed + 2;
    if (Math.abs(c.x - MY_LANES[c.lane]) < 0.3 || (c.t -= dt) <= 0) Object.assign(c, { stage: 'brake', t: CHECK.stop });
  } else if ((c.t -= dt) > 0) c.v = Math.max(0, c.v - 9 * dt); // stamping on the brakes
  else { Object.assign(c, { stage: null, again: now + CHECK.again }); return false; }
  c.x += clamp(MY_LANES[c.lane] - c.x, -3 * dt, 3 * dt);
  c.z += c.v * dt;
  return !!c.stage;
}

// the rival gang's war rigs (Claude's, 30 Oct), the notable enemy of a race without the tank: a tanker welded up for
// war (road.js RIG_SPRITE). One at a time, the first a while into the race: it takes over a car out of sight up the
// road, as the police do, and comes up from behind you in your other lane; it holds the road ahead of you for a few
// seconds, in the reticle; then drops back beside you and swings into your side, and pulls ahead again; until it is
// totaled. Rams barely scratch it, as the tank. First guesses, for act5.py: six shells, or four and the guns
const RIG = { hp: 1500, first: 10, every: 12, ahead: 45, hold: 3, hit: 6, scrap: 150, w: 2.8, h: 3.4 }; // s, m, s, % a ram
let rigClock = 0;
const rigRun = () => { rigClock = RIG.first; gangClock = GANG_CAR.every; }; // distance.js startRun: the rigs, the gang
function updateRigs(dt) { // distance.js updateRun
  if (!rigged() || run.boss || traffic.some(c => c.rig && !c.wreck) || (rigClock -= dt) > 0) return;
  const c = traffic.find(c => !c.racer && !c.police && !c.tank && !c.rig && !c.fleet && c !== target && c !== quarry && c.z - odo > 600);
  const side = sideLane(), wide = side == null && rigW > 1 && lane <= 1; // a fortress filling your side: it waits up the road
  if (!c || !wide && (side == null || !laneClear(MY_LANES[side], 10))) return;
  rigClock = RIG.every;
  Object.assign(c, { rig: true, dir: 1, look: { rear: RIG_SPRITE }, w: RIG.w, h: RIG.h, hp: null, wreck: false, swerve: null, warned: false,
                     beams: 0, d: NaN, hit: -Infinity }, wide ? { lane, x: MY_LANES[lane], z: odo + 300, v: speed, stage: 'hold', t: RIG.hold }
                     : { lane: side, x: MY_LANES[side], z: odo - 60, v: speed + 15, stage: 'pass' });
  flash('RIVAL RIG!', '#f55', false);
  horn();
}
function rigDrive(c, dt) { // road.js updateTraffic
  // a lane beside you to come at you in, in the race; with none (a fortress filling your side) it holds the road ahead
  const gap = c.z - odo, side = sideLane(), by = side != null && run.phase === 'run';
  if (c.stage === 'pass') { c.v = speed + 15; if (by) c.lane = side; if (gap > RIG.ahead) Object.assign(c, { stage: 'hold', t: RIG.hold }); }
  else if (c.stage === 'hold') { c.v = Math.max(0, speed + (RIG.ahead - gap) * 0.6); if ((c.t -= dt) <= 0 && by) c.stage = 'drop'; }
  else if (c.stage === 'drop') { c.v = Math.max(0, speed - 15); if (by) c.lane = side; if (gap < 1) c.stage = by ? 'ram' : 'pass'; }
  else { // its side into yours, however wide you are
    c.v = speed;
    c.x += clamp(carX - c.x, -4 * dt, 4 * dt);
    if (!by) c.stage = 'pass';
    else if (Math.abs(c.x - carX) < (RIG.w + CAR_W) / 2 + 1.75 * (rigW - 1)) rigRam(c);
  }
  if (c.stage !== 'ram') c.x += clamp(MY_LANES[c.lane] - c.x, -2 * dt, 2 * dt);
  c.z += c.v * dt;
}
function rigRam(c) { // its side into yours: damage (Armor plating takes some), a shove and a jolt; then it pulls ahead
  c.stage = 'pass';
  slide += 4 * Math.sign(carX - c.x); // car.js: knocked across, and steered back
  speed *= 0.9;
  shake = Math.max(shake, 0.5);
  crashSound();
  flash('RAMMED', '#f55', false);
  addDamage(RIG.hit * (1 - armorCut())); // damage.js
  if (wrecked()) finishRun('wrecked');
}

// ---- the loot (layer 6; the owner, 29-30 Oct): the notable enemies and, rarely, the rival gang's cars drop parts as they
// are totaled, each enemy by its drop table; a crate skids along the road from where it fell, and you steer over it to
// pick it up into the hold (with the hold full it stays on the road); then the board's drag puts it on. Each part does
// what it came from does, its size its strength (the owner: "each one functional, depending on the source"), and every
// block weighs. Claude's first draft of the tables and every number, to explore (design notes: Drop tables)
const PARTS = { // a block's kg, and the sizes (blocks) it comes in
  cannon: { name: 'CANNON', kg: 900, sizes: [1, 2] }, gun: { name: 'GUN', kg: 250, sizes: [1, 2] },
  armor: { name: 'ARMOR', kg: 500, sizes: [1, 2, 3] }, spikes: { name: 'SPIKES', kg: 300, sizes: [1, 2, 3] },
  engine: { name: 'ENGINE', kg: 700, sizes: [1, 2] },
};
// the nine shapes (the owner: one to three blocks, each turn its own drop, never turned): one; two stacked, two side by
// side; three in a line along and across, and the bent three in its four turns
const SHAPES = { 1: [ONE], 2: [[[0, 0], [0, 1]], [[0, 0], [1, 0]]], 3: [[[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]], [[1, 0], [0, 1], [1, 1]]] };
const DROPS = { // an enemy's chance of a part, and which (the owner's examples: a rival car rarely; a tank always, its
  gang: [0.05, { armor: 0.4, spikes: 0.4, engine: 0.2 }], // turret mostly)
  rig: [1, { armor: 0.4, spikes: 0.3, engine: 0.3 }],
  suv: [0.5, { armor: 0.5, engine: 0.3, gun: 0.2 }],
  tank: [1, { cannon: 0.7, armor: 0.2, engine: 0.1 }],
};
const ENGINE_POWER = { gang: 0.06, suv: 0.1, rig: 0.15, tank: 0.25 }; // more pull a block, by the engine it came from
const LOOT = { slow: 8, reach: 3 }; // m/s² a crate skids to a stop at; m either way it is picked up within
const pick = table => { let r = rand(); const ks = Object.keys(table); return ks.find(k => (r -= table[k]) < 0) ?? ks.at(-1); };
const sourceOf = c => c.tank ? 'tank' : c.rig ? 'rig' : c.suv ? 'suv' : c.racer && !c.fleet ? 'gang' : null;
function makePart(kind, from) { // a size it comes in, then a shape of it no wider than the board (one wider never fits)
  const sizes = PARTS[kind].sizes, shapes = SHAPES[sizes[Math.floor(rand() * sizes.length)]].filter(c => extent(c, 0) <= boardW());
  return { kind, from, cells: shapes[Math.floor(rand() * shapes.length)] };
}
function dropLoot(c) { // gang.js total, boss.js tankDown: its drop, if any; on the road, or the tank's into the hold
  const from = rigged() && sourceOf(c);
  if (!from || rand() >= DROPS[from][0]) return;
  const part = makePart(pick(DROPS[from][1]), from);
  if (from === 'tank') stow(part); // the run is over: the tank's parts are yours
  else run.loot.push({ part, z: c.z, x: c.x, v: c.v });
  if (!progress.toured.includes('loot')) openTour('loot', true);
}
function stow(part) { // into the hold, if it has room
  const f = progress.fortress, name = `${PARTS[part.kind].name} ${part.cells.length}`;
  if (f.hold.length >= holdSize()) { flash(`HOLD FULL: ${name} LEFT`, '#fb3', false); return false; }
  f.hold.push(part);
  applyUpgrades(); // distance.js: its weight
  save();
  flash(`+${name} INTO THE HOLD`, '#ffd23a', false);
  beep(880, 0.06);
  return true;
}
function lootTick(dt) { // distance.js updateRun: the crates skid to a stop; steered over, one is picked up (tried once: a
  for (const l of run.loot) { // full hold leaves it); passed, gone
    l.v = Math.max(0, l.v - LOOT.slow * dt);
    l.z += l.v * dt;
    if (!l.tried && Math.abs(l.z - odo) < LOOT.reach && onCar(l.x)) { l.tried = true; l.got = stow(l.part); } // any lane it covers
  }
  run.loot = run.loot.filter(l => !l.got && l.z > odo - 20);
}
const lootMarks = () => (run.loot ?? []).map(l => ({ z: l.z, kind: 'loot', value: l })); // distance.js roadMarks

// what the parts on the board add up to (distance.js applyUpgrades, gang.js, damage.js): blocks of a kind, the weight
// the deck and every part in it and in the hold carry, the drag of its length, an engine's pull
const blocks = kind => rigged() ? progress.fortress.parts.reduce((n, p) => n + (p.kind === kind ? p.cells.length : 0), 0) : 0;
const DECK = 250; // kg a cell of deck
const rigWeight = () => !rigged() ? 0 : boardW() * boardH() * DECK +
  [...progress.fortress.parts, ...progress.fortress.hold].reduce((kg, p) => kg + PARTS[p.kind].kg * p.cells.length, 0);
const rigDrag = () => rigged() ? boardW() + 0.1 * (boardH() - 1) : 1; // its width is frontal area: a lane's more each; its
                                                                       // length a little
const rigPower = () => rigged() ? progress.fortress.parts.reduce((k, p) => k + (p.kind === 'engine' ? ENGINE_POWER[p.from] * p.cells.length : 0), 0) : 0;
const armorCut = () => Math.min(0.9, 0.25 * lvl('armour') + 0.05 * blocks('armor')); // Armor plating, and armor plates

// an engine heard (the owner, 30 Oct: "a new engine sound added on top of the existing one"): a voice for each kind of
// engine on the board, louder the more blocks of it (engine.js setVoices); the heavy ones' file loaded the first time
// one is mounted, so the page weighs no more until then
const ENGINE_SOUND = { gang: 'boxer', suv: 'v8', rig: 'truck', tank: 'tank' }; // a rival car's boxer, an SUV's V8, a rig's
let heard = '', rigSounds = false;                                              // truck diesel, a tank's V12 diesel
function engineVoices() { // renderRig, every frame: set again only when it changes
  const want = {};
  for (const p of rigged() ? progress.fortress.parts : []) {
    if (p.kind === 'engine') want[ENGINE_SOUND[p.from]] = Math.min(1, (want[ENGINE_SOUND[p.from]] ?? 0.2) + 0.2 * p.cells.length);
  }
  if (!rigSounds && Object.keys(want).some(n => !SOUNDS[n])) {
    rigSounds = true;
    document.head.append(Object.assign(document.createElement('script'), { src: 'assets/rig-sounds.js', onload: () => { heard = ''; } }));
  }
  const key = JSON.stringify(want) + !!ctx + rigSoundsIn(); // before the first click there is no sound to set
  if (key !== heard) { heard = key; setVoices(want); }
}
function quietRig() { heard = ''; setVoices({}); } // distance.js stop: leaving Distance

// a fortress's rams (car.js bump and headOn, distance.js onCollision): a car crushed hurts the rig by the weight it
// carries against a car's; head-on, it rams through for HEADON% (the owner, 30 Oct: "about 20%"), less its armor
const HEADON = 20;
const plowDamage = i => (i.headOn ? HEADON : clamp(i.kmh * 0.25, 2, 25) * CAR_KG / engine.mass) * (1 - armorCut());

let pedalDown = false;
$('cannon-pedal').onpointerdown = e => { e.preventDefault(); pedalDown = true; fireCannon(); };
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) $('cannon-pedal').addEventListener(ev, () => { pedalDown = false; });

// every frame of Distance (distance.js render): the rig's cockpit, the board, a part being dragged or held, the pedal
function renderRig() {
  const on = rigged(), now = performance.now();
  engineVoices();
  document.body.classList.toggle('rig', on);
  document.body.classList.toggle('wide', on && rigW > 1); // a truck's wheel
  if (!on) return;
  renderBoard();
  $('fort-drag').classList.toggle('armed', armed());
  if (throwing) {
    const held = (now - throwing.from) / THROW;
    if (held >= 1) throwOff(throwing.i);
    else $('fort-grid').querySelector(`[data-part="${throwing.i}"]`)?.style.setProperty('--held', held.toFixed(2));
  }
  $('cannon-pedal').classList.toggle('pressed', pedalDown || now - firedAt < 150);
  $('cannon-pedal').parentNode.classList.toggle('mounted', cannonOn());
  $('cannon-pedal').parentNode.classList.toggle('empty', progress.shells < 1);
  $('cannon-pedal').parentNode.style.setProperty('--reload', (1 - reloading / CANNON.reload).toFixed(2));
  text('shell-count', String(progress.shells));
  const first = id => target?.seen && run.phase === 'run' && !progress.toured.includes(id); // the first one in sight
  if (target?.rig && first('rivals')) openTour('rivals', true);
  else if (target?.suv && first('pursuit')) openTour('pursuit', true);
}

TUTORIALS.push( // the war rig's, once rebuilt (the owner's: the controls change with it)
  { id: 'rig', name: 'The war rig', for: ['rebuild'], open: () => rigged(), pages: [
    { title: 'THE WAR RIG',
      both: "The tank's parts made your car a war rig: no gear shifter and no pedals. It drives itself now, and the " +
        'aids that drive it are bolted on.' },
    { title: 'THE BOARD', at: '#board',
      both: 'Your fortress from above, ahead up: one lane wide and one car long for now. Beside it, the hold: the parts ' +
        "you carry, the tank's cannon first." },
    { title: 'MOUNT A PART', at: '#board',
      touch: 'Drag a part from the hold onto the board: it floats above your finger. Hold it still over green until ' +
        'it turns solid, then let go. Red: it does not fit there. Parts go on as they come, never turned.',
      desk: 'Drag a part from the hold onto the board with the mouse. Hold it still over green until it turns solid, ' +
        'then let go. Red: it does not fit there. Parts go on as they come, never turned.' },
    { title: 'THROW IT OFF', at: '#board',
      both: 'Press and hold a part on the board until its ring closes: it is thrown off, gone for good.' },
    { title: 'THE CANNON', at: '.cannon-box',
      touch: 'Mounted, the cannon fires at the car in the reticle: a press of the firing pedal, a shell. Then it reloads. ' +
        `The shells left are on the pedal: ${SHELLS.tank} came with the tank.`,
      desk: 'Mounted, the cannon fires at the car in the reticle: Space (or a click on the firing pedal), a shell. Then ' +
        `it reloads. The shells left are on the pedal: ${SHELLS.tank} came with the tank.` },
  ] },
  // on the road, the first time a rival rig is in the reticle (renderRig); listed once seen
  { id: 'rivals', name: 'The rival gang', open: () => rigged() && progress.toured.includes('rivals'), pages: [
    { title: 'A RIVAL RIG', at: '#ar',
      both: "The rival gang's war rig. Only rigs, tanks and police SUVs are in the reticle now: the cannon and guns " +
        'are for them. It holds the road ahead, then rams you from the side.' },
    { title: 'ITS TAG', at: '#ar',
      both: 'Over the reticle: what it is, its health, the shells it would take, how far.' },
    { title: 'THE RIVAL GANG',
      both: 'The racers you never paid off are a gang now. They come past you, cut in and stamp on the brakes. Your ' +
        'raiders go after them, and the rest of the traffic: Hunter too.' },
    { title: 'SHELLS', at: '.cannon-box',
      both: `Every gang car totaled is out of the race, behind you, and brings ${SHELLS.gang} shells for the cannon.` },
  ] },
  // the fortress widened (the owner, 30 Oct: the wheel changes from two lanes wide, and the robot rams)
  { id: 'wide', name: 'A wide fortress', for: ['widen'], open: () => lvl('widen') > 0, pages: [
    { title: 'A TRUCK\'S WHEEL', at: '#wheel',
      both: "Two lanes wide and more, a truck's wheel steers the fortress: a turn shifts it a lane, slowly, over the " +
        'double yellow too, as far as the road goes.' },
    { title: 'NO BRAKES',
      both: 'The robot brakes for no one now and leaves the lanes to you: a car in the way is crushed, for a little speed. ' +
        'Head-on, the fortress rams through: the car is scrap, the rig takes a beating.' },
  ] },
  // on the road, the first loot dropped (dropLoot); listed once seen
  { id: 'loot', name: 'Loot', open: () => rigged() && progress.toured.includes('loot'), pages: [
    { title: 'LOOT',
      both: 'The big ones drop parts as they go down, the rival gang rarely: a crate skids along the road. Steer over it ' +
        'to pick it up into the hold; with the hold full it stays on the road.' },
    { title: 'PARTS', at: '#board',
      both: 'Drag it from the hold onto the board. A cannon adds to every shell, a gun to the guns, armor takes the ' +
        'hits, spikes hurt in a ram, an engine pulls. The bigger, the stronger, and every block weighs.' },
  ] },
  // on the road, the first time a police SUV is in the reticle (renderRig); listed once seen
  { id: 'pursuit', name: 'Police SUVs', open: () => rigged() && progress.toured.includes('pursuit'), pages: [
    { title: 'A POLICE SUV', at: '#ar',
      both: "The police's pursuit SUV, armored: in the reticle, and rams barely scratch it. It cuts in and brakes, drops " +
        'back and comes again, until you bring it down.' },
  ] },
);
