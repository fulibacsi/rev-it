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
  // lanes), and the hold's slots (the owner: one, upgraded to three). It grows backward and to the right (the owner, 31
  // Oct: "my basic instinct is backwards and right"), nothing mounted moving. Paid in meters, as the board's size is (the
  // map, 2 Nov: the decent people, engineers, build it bigger; 60-78k come in a race, and had only the pump to go to).
  // Prices Claude's, from act5.py (layer 13): two lanes wide by race 4, three by race 8, four by about race 15; half as
  // dear again, two lanes came at race 7. built: 0, none of it the car's build (race.js headStart, act1.py: the cards
  // paid in meters were the car's)
  lengthen: { name: 'Lengthen', tab: 'fortress', max: 4, base: 25000, growth: 2, wallet: 'bank', built: 0, needs: ['rebuild'],
              info: l => `the fortress ${1 + l} car${l ? 's' : ''} long: room for ${1 + l} row${l ? 's' : ''} of parts, and ` +
                'every row weighs and drags' },
  inventory: { name: 'Inventory', tab: 'fortress', max: 2, base: 20000, growth: 2, wallet: 'bank', built: 0, needs: ['rebuild'],
               info: l => `${1 + l} slot${l ? 's' : ''} in the hold for the parts you pick up` },
  // the board a lane wider a level, to the road's four (the owner: its width is lanes), and the rig with it: from two
  // lanes wide a truck's wheel shifts it a lane at a time, the robot brakes for no one, and it rams (the owner, 30 Oct)
  widen: { name: 'Widen', tab: 'fortress', max: 3, base: 50000, growth: 2.5, wallet: 'bank', built: 0, needs: ['rebuild'],
           info: l => l ? `the fortress ${1 + l} lanes wide: a truck's wheel shifts it a lane at a time, it brakes for no ` +
             'one and rams, head-on too; every lane drags' : 'a lane wide' },
  // the cannon's offense, paid in scrap (the map, 2 Nov: scrap pays for war, the cannon's reload and damage; it lost
  // Lengthen and Widen to meters). Claude's numbers, for act5.py: 15% off the reload a level, 25% on a shell's damage
  // a level; prices for the 1,000-2,800 scrap a race that came in with nothing left to buy
  autoloader: { name: 'Autoloader', tab: 'fortress', max: 3, base: 1500, growth: 2, needs: ['rebuild'],
                info: l => `the cannon reloads in ${reloadTime(l).toFixed(1)} s` },
  heavyShells: { name: 'Heavy shells', tab: 'fortress', max: 3, base: 2000, growth: 2, needs: ['rebuild'],
                 info: l => `a shell does ${shellDamage(l)} damage a cannon block` },
  // the front's (the owner, 2 Nov: "Mine picker is baseline, negates mines, gives you shells. Grinder on top of it
  // negates frontal damage"; they were planned as a mine roller from two lanes wide and a Grinder on its own): the mine
  // picker lifts a mine the fortress runs over off the road, no blast, its charge for the cannon; the Grinder, bolted on
  // in front of it, eats what the fortress runs into, so a crash at its front costs nothing (mineTick, damage.js hurt,
  // police.js slam). Prices Claude's first guesses, for act5.py
  minePicker: { name: 'Mine picker', tab: 'fortress', max: 1, base: 2500, needs: ['rebuild'],
                info: () => `a mine under the fortress is picked up, not set off: ${MINE.shells} shells for the cannon` },
  grinder: { name: 'Grinder', tab: 'fortress', max: 1, base: 6000, needs: ['minePicker'],
             info: () => 'eats what the fortress runs into: no damage from a crash at its front (a car crushed or rammed ' +
               "through, the back of one, an SUV's slam)" },
  // the rig's sides and back (the owner, 2 Nov: rams, "damage mitigation and knockback"; the Grinder has its front):
  // steel plates a ram glances off, its hit a quarter less a level, and the police car that rammed you (or PITted you)
  // thrown 8 m further back a level before it comes again (police.js copRam; a side-swipe, damage.js hurt). Claude's
  // numbers, for act5.py
  ramPlates: { name: 'Ram plates', tab: 'fortress', max: 3, base: 1500, growth: 2, needs: ['rebuild'],
               info: l => l ? `a ram on the rig's sides and back hurts it ${Math.round(100 * PLATES.cut * l)}% less, and the ` +
                 `car that rammed you is thrown ${PLATES.knock * l} m back` : 'bare sides and back' },
});
// the act's automation (layer 14), the first: the upgrade graph's, planned, "fires the cannon for you, as Auto gun does
// the guns". Paid in points (Claude's proposal for them, the owner, 2 Nov: "we have to find an alternative sink"; the
// currencies' plan had points paying for the crew's upgrades, the act's automation). A switch, as every one-level card
// is. The price a first guess, for act5.py
Object.assign(UPGRADES, {
  autocannon: { name: 'Auto cannon', tab: 'fortress', max: 1, base: 3000, wallet: 'points', needs: ['rebuild', 'autogun'],
                info: () => 'fires the cannon for you whenever it is loaded and the car in the reticle is in reach; the pedal ' +
                  'reads AUTO' },
});
const autoCannon = () => lvl('autocannon') > 0 && !progress.off.autocannon;
const ground = () => lvl('grinder') > 0; // the Grinder on the front: a crash there costs nothing
const PLATES = { cut: 0.25, knock: 8 }; // Ram plates: a ram's damage less a level; m further back a level
const plated = () => 1 - PLATES.cut * lvl('ramPlates'); // the share of a ram on the sides and back that gets through
const knockback = () => PLATES.knock * lvl('ramPlates');
const rigged = () => lvl('rebuild') > 0;
// with no shifter and no pedals the rig drives itself (the owner, 30 Oct): the aids that work them, bolted on, their
// garage cards under a metal plate (distance.js renderGarage), whatever their switches said
const RIG_AIDS = ['clutch', 'gas', 'shift', 'steer', 'cruise'];
const rigDrives = id => rigged() && RIG_AIDS.includes(id);
// and the headlight flash goes with the Rebuild, as the pedals do (the owner, 1 Nov): no stalk, no F, no charges; its
// cards under a plate too (distance.js renderGarage)
const RIG_GONE = ['flash', 'flashRecharge', 'autoflash'];
const rigTook = id => rigged() && RIG_GONE.includes(id);
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
const partAt = (f, x, y) => f.parts.findIndex(p => p.cells.some(([cx, cy]) => p.x + cx === x && p.y + cy === y));
const onBoard = (cells, x, y) => cells.every(([cx, cy]) => x + cx >= 0 && y + cy >= 0 && x + cx < boardW() && y + cy < boardH());
const under = (f, cells, x, y) => [...new Set(cells.map(([cx, cy]) => partAt(f, x + cx, y + cy)).filter(i => i >= 0))]; // the parts there
const fitsAt = (f, cells, x, y) => onBoard(cells, x, y) && !under(f, cells, x, y).length;
let shownBoard = ''; // what the board shows: redrawn only when that changes
function renderBoard() {
  if (dragging || throwing) return; // never under a finger: the drag would go with the element it holds (a hit on a part
                                    // redrew the board, and a drag on the road failed most times); it redraws after
  const f = progress.fortress, n = holdSize(), w = boardW(), h = boardH(); // redrawn on what shows: its cracks, not its health
  const key = JSON.stringify([...f.parts, ...f.hold].map(p => [p.kind, p.x, p.y, p.cells, wear(p)])) + [f.parts.length, n, w, h, innerWidth, innerHeight, fallen.length,
    f.parts.indexOf(aimedAt()), [...jammed.keys()].map(p => f.parts.indexOf(p))];
  if (key === shownBoard) return;
  shownBoard = key;
  // the cells as big as the plate allows, the hold beside the plan: inside its padding (6 px), past the label (16 px),
  // the gaps (8 px; 4 px between slots) and the 1 px borders of the plan and each slot
  const b = $('board'), inW = b.clientWidth - 12, inH = b.clientHeight - 12 - 16 - 8;
  const cell = Math.floor(Math.min(72, (inW - 8 - 4) / (w + 1), (inH - 2) / h, (inH - 6 * n) / n));
  $('board').style.setProperty('--cell', `${cell}px`);
  Object.assign($('fort-grid').style, { width: `${cell * w}px`, height: `${cell * h}px` });
  $('fort-grid').innerHTML = f.parts.map((p, i) => partHtml(p, `data-part="${i}" data-wear="${wear(p)}"${p === aimedAt() ? ' data-hooked' : ''}${live(p) ? '' : ' data-jam'}`)).join('') +
    fallen.map(({ p }) => partHtml(p, `data-fall data-wear="2"`)).join('') + '<i id="fort-ghost"></i><i id="fort-hit"></i>' +
    '<i class="fort-aim"></i>'.repeat(3); // the rockets' marks (markRockets): two rocket cars', and one still in the air
  $('fort-hold').innerHTML = Array.from({ length: n }, (_, i) => `<div class="slot" data-slot="${i}">` +
    `${f.hold[i] ? partHtml(f.hold[i], `data-wear="${wear(f.hold[i])}"`, cell / Math.max(extent(f.hold[i].cells, 0), extent(f.hold[i].cells, 1))) : ''}</div>`).join('');
  for (const el of $('fort-hold').querySelectorAll('.slot')) // the whole slot is its handle: a part shrunk to fit one is small
    if (f.hold[+el.dataset.slot]) drag(el, (e, first) => dragPart(e, first, +el.dataset.slot), dropPart);
  for (const el of $('fort-grid').querySelectorAll('.part')) drag(el, (e, first) => holdPart(e, first, +el.dataset.part), letGo);
}

// a part dragged from the hold floats a cell above the finger (the thumb would hide it), a ghost on the board's cells
// under it: green where it fits, amber where it would replace mounted parts (marked, the whole of each), red off the
// board. Let go once the ghost has rested on its cells for a beat and it goes on, whatever it replaces thrown off for
// good; else it goes back to the hold (the owner, 29 Oct: a drop that is clear, and still quick; 31 Oct: a swap in one
// move). The beat starts again only when the ghost moves to other cells, and it moves only once the part is well past
// the edge (STICK of a cell), so a thumb's wobble doesn't reset it: it did when the finger had to keep within 6 px, and on
// the owner's phone (1 Nov) a drop took two tries or more. Pressed and held, a part on the board is thrown off, gone for
// good. Packing is the run's (the owner, 31 Oct): in the garage the board only shows. Claude's numbers, to try on a phone
const REST = 150, THROW = 500, STICK = 0.3; // ms, ms, a cell's share past the edge before the ghost moves on
let dragging = null, throwing = null; // { slot, part, at: [x, y], ok, swaps, since }; { i, from, x, y }
const packing = () => run.phase !== 'garage';
function dragPart(e, first, slot) {
  const f = progress.fortress, cell = parseFloat($('board').style.getPropertyValue('--cell'));
  if (first && !packing()) return;
  if (!first && !dragging) return;
  if (first) {
    dragging = { slot, part: f.hold[slot], at: null, ok: false, swaps: [], since: 0 };
    $('fort-hold').querySelector(`[data-slot="${slot}"]`).classList.add('lifted');
    $('fort-drag').innerHTML = partHtml(dragging.part);
    $('fort-drag').style.setProperty('--cell', `${cell}px`);
    $('fort-drag').hidden = false;
  }
  const w = extent(dragging.part.cells, 0) * cell, h = extent(dragging.part.cells, 1) * cell;
  const left = e.clientX - w / 2, top = e.clientY - h - cell * 0.6, g = $('fort-grid').getBoundingClientRect();
  Object.assign($('fort-drag').style, { left: `${left}px`, top: `${top}px` });
  const fx = (left - g.left) / cell, fy = (top - g.top) / cell, was = dragging.at; // cells, fractions of one
  const at = was && Math.abs(fx - was[0]) < 0.5 + STICK && Math.abs(fy - was[1]) < 0.5 + STICK ? was : [Math.round(fx), Math.round(fy)];
  const over = left + w > g.left && left < g.right && top + h > g.top && top < g.bottom; // over the board at all
  if (!over) { dragging.at = null; doom([]); $('fort-ghost').className = ''; return; }
  if (at !== was) // other cells: the beat starts again
    Object.assign(dragging, { at, since: performance.now(), swaps: under(f, dragging.part.cells, ...at), // not over a part knocked out
                              ok: onBoard(dragging.part.cells, ...at) && under(f, dragging.part.cells, ...at).every(i => live(f.parts[i])) });
  Object.assign($('fort-ghost').style, { left: `${at[0] * cell}px`, top: `${at[1] * cell}px`, width: `${w}px`, height: `${h}px` });
  $('fort-ghost').className = !dragging.ok ? 'no' : dragging.swaps.length ? 'swap' : 'fit';
  doom(dragging.ok ? dragging.swaps : []);
}
const doom = list => { for (const el of $('fort-grid').querySelectorAll('[data-part]')) el.classList.toggle('doomed', list.includes(+el.dataset.part)); };
const armed = () => !!dragging?.at && dragging.ok && performance.now() - dragging.since >= REST;
function dropPart() {
  if (armed()) mount(dragging.slot, ...dragging.at);
  dragging = null;
  $('fort-drag').hidden = true;
  shownBoard = '';
}
function mount(slot, x, y) { // the hold's part onto the board at x, y, throwing off whatever is there (act5.py's bot too)
  const f = progress.fortress, part = f.hold[slot], swaps = under(f, part.cells, x, y);
  if (swaps.some(i => !live(f.parts[i]))) return false; // a part knocked out stays
  for (const i of swaps.sort((a, b) => b - a)) f.parts.splice(i, 1);
  f.parts.push({ ...part, x, y });
  f.hold.splice(slot, 1);
  applyUpgrades(); // distance.js: an engine pulls from now on, and what was thrown off goes with it
  save();
  beep(660, 0.08);
  if (swaps.length) crashSound();
}
function holdPart(e, first, i) {
  const p = progress.fortress.parts[i];
  if (first && !live(p)) return restart(p); // knocked out: a tap restarts it, and it can't be thrown off
  if (first && packing()) throwing = { i, from: performance.now(), x: e.clientX, y: e.clientY };
  else if (throwing && Math.hypot(e.clientX - throwing.x, e.clientY - throwing.y) > 0.5 * parseFloat($('board').style.getPropertyValue('--cell')))
    letGo(); // a slide isn't a hold; a thumb's wobble (within half a cell) is
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
const CANNON = { damage: 250, reload: 2, reach: 300, heat: 10, faster: 0.15, heavier: 0.25 }; // reach m, reload s, heat: a gun
// shot's times ten; a level of Autoloader off the reload, of Heavy shells on the damage (above)
const reloadTime = (l = lvl('autoloader')) => CANNON.reload * (1 - CANNON.faster * l);
const shellDamage = (l = lvl('heavyShells')) => Math.round(CANNON.damage * (1 + CANNON.heavier * l));
const shellHit = () => shellDamage() * Math.max(1, blocks('cannon')); // every cannon block on the board, one shell
const SHELLS = { tank: 10, gang: 2, crate: 10, price: 100 }; // the crate: shells, points (Claude's first guess, for act5.py)
const gangShells = c => rigged() && c.racer && !c.fleet ? SHELLS.gang : 0; // a car totaled (gang.js total): its shells
// a crate of shells for points (the owner, 31 Oct: points need something to buy; 1 Nov: no shells and nowhere to buy
// them), on the Fortress page once rebuilt, as often as you like: the cannon's ammunition, spent as you fight
function shellCard() { // distance.js renderGarage
  if (garageTab !== 'fortress' || !rigged()) return '';
  return `<div class="card shells"><b>Shells</b><small>${SHELLS.crate} for ${fmt(SHELLS.price)} points · ` +
    `${bottomless() ? '∞' : fmt(progress.shells)} in the rig</small><button data-shells${progress.points >= SHELLS.price ? '' : ' disabled'}>` +
    `Buy ${SHELLS.crate} · ${fmt(SHELLS.price)} pts</button></div>`;
}
function buyShells() { // distance.js, a tap on the card's button
  if (progress.points < SHELLS.price) return false;
  progress.points -= SHELLS.price;
  progress.shells += SHELLS.crate;
  save();
  return true;
}
const cannonOn = () => rigged() && progress.fortress.parts.some(p => p.kind === 'cannon'); // knocked out too (below)
let reloading = 0, firedAt = -Infinity;
function fireCannon() {
  if (!cannonOn() || run.phase !== 'run' || reloading > 0) return false;
  if (!blocks('cannon')) { beep(140, 0.05); flash('JAMMED', '#6af', false); return false; } // every cannon knocked out (War Boys)
  if (progress.shells < 1) { beep(140, 0.05); flash('NO SHELLS', '#fb3', false); return false; }
  progress.shells--;
  reloading = reloadTime();
  firedAt = performance.now();
  const hit = target?.seen && target.z - odo < CANNON.reach ? target : null; // gang.js
  tracers.push(['cannon', hit, firedAt]); // drawn as a shell (gang.js drawTracers)
  beep(45, 0.3);
  shake = Math.max(shake, 0.35); // main.js: the rig jolts
  raiseHeat(WANTED.shot * CANNON.heat); // police.js
  if (hit) hurtCar(hit, shellHit());
  wearOut('cannon', WEAR.cannon); // each shell wears every cannon (below)
  return true;
}
function rigTick(dt) { // distance.js updateRun
  reloading = Math.max(0, reloading - dt);
  if (autoCannon() && !reloading && progress.shells > 0 && blocks('cannon') && target?.seen && target.z - odo < CANNON.reach) fireCannon();
  if (throttle > 0.8) wearOut('engine', WEAR.engine * dt); // engine.js: pulling flat out
}
// the war rig's keys (distance.js key): Space fires the cannon, a shell a press; the gas, clutch, brake, gears and
// nitro are the robot's now, so their keys do nothing
function rigKey(k, repeat) {
  if (!rigged()) return false;
  if (k === ' ') { if (!repeat) fireCannon(); return true; }
  return ['Shift', 'b', 'B', 'ArrowUp', 'ArrowDown', 'n', 'N', 'f', 'F'].includes(k);
}
// ---- the road (the owner, 30 Oct): the reticle takes only the notable enemies, the army's tanks and rocket cars, the
// rival gang's war rigs and harpoon trucks, the police's pursuit SUVs and helicopters (police.js); the rest are the
// raiders' (gang.js crewTarget), and Hunter's
const notable = c => !!(c.tank || c.rig || c.suv || c.heli || c.harpoon || c.rocket);
// a car out of sight up the road an enemy can take over (police.js, boss.js, here): the traffic's, none of theirs
const takeable = c => !c.racer && !c.police && !c.tank && !c.rig && !c.heli && !c.harpoon && !c.jeep && !c.rocket && !c.fleet && c !== target &&
  c !== quarry;
// the lane beside the rig on your side of the road, for an enemy coming past it: your other lane while it is a lane
// wide, the one to the right of a fortress over the double yellow; none while it fills your side (car.js lane, rigW)
const sideLane = () => rigW === 1 ? (lane <= 1 ? 1 - lane : null) : lane >= 1 ? Math.min(lane - 1, 1) : null;
// the reticle's tag (gang.js renderGang), as the crew's over a spot (oil.js; the owner, 30 Oct: "I really like how the
// resources have their metadata over them"): what it is, its health, the shells it would take, how far
function notableTag(t) {
  const shots = Math.ceil(Math.max(0, t.hp ?? health(t)) / shellHit()); // every cannon block counted (it counted one)
  return [t.tank ? 'TANK' : t.rig ? 'RIG' : t.heli ? 'HELI' : t.harpoon ? 'HARPOON' : t.rocket ? 'ROCKET' : 'SUV', `${Math.round(100 * hpLeft(t))}%`, cannonOn() && `${shots} SHOT${shots === 1 ? '' : 'S'}`,
          `${Math.round(t.z - odo)} m`].filter(Boolean).join(' · ');
}

// the rival gang (the owner, 30 Oct): once the war rig is built, the racers you never paid off turn on you. Every
// GANG_CAR.every s it sends the nearest one still behind you, from beyond the sonar (so you see it come) up your other
// lane, and it drives at you as the police do from behind (police.js): past you, into your lane CHECK m ahead of you and
// a hard stop, then it races on, and does it again a while later; so does a rival coming past you on its own. One that
// gets away has a place on you; one totaled is out of the race, behind you (race.js position): places are won by
// destroying them now. In the oncoming lanes you are out of their way
// s between them, m behind you, m/s quicker than you; the share that lay mines (below)
const GANG_CAR = { every: 8, from: 260, closing: 30, mines: 0.5 };
const CHECK = { near: 25, far: 60, cut: 3, stop: 2, again: 8 }; // m ahead; s to get across, braking, between goes
let gangClock = 0;
function updateGangCars(dt) { // distance.js updateRun: one now and then, besides the gang's ambushes (below)
  if (!rigged() || (gangClock -= dt) > 0) return;
  if (sendGangCar()) gangClock = GANG_CAR.every;
}
// the gang is unlimited (the owner, 2 Nov: "a randomly numbered enemy gang car attacks regularly"; the racers you paid
// off left the race's own gang thin, none by race 4): a car out of sight up the road taken over, the gang's look and a
// number at random, its rank (gang.js total pays it); then it races on and goes back into the traffic (road.js). Not in
// the race: your place is the race's (race.js racers). Half of them lay mines from ahead (below); the rest come from
// behind up the lane beside you, or with none (a fortress filling your side) up the right shoulder, the way your crew's
// cars go to their spots (the owner, 2 Nov), to cut in ahead of you and brake. False with no car to take over, or no
// way to come at you
const SHOULDER_X = SHOULDER - 0.6; // road.js: the crew's line, off the road on the right (oil.js, gang.js)
const sendGangCar = () => rand() < GANG_CAR.mines ? sendMiner() || sendChaser() : sendChaser() || sendMiner();
function gangCar() { // a car out of sight up the road, taken over by the gang, its number at random
  const c = traffic.find(c => takeable(c) && c.z - odo > 600);
  if (!c) return null;
  const k = 1 + Math.floor(rand() * FIELD); // race.js
  return Object.assign(c, { racer: k, gang: true, look: racerSprite(k, true, false, true), dir: 1, hp: null, wreck: false, swerve: null,
                            warned: false, beams: 0, d: NaN, hit: -Infinity, want: speed + 15, again: 0, shoulder: false, miner: false });
}
function sendChaser() {
  const side = sideLane(), shoulder = side == null && lane === 0, c = (side != null || shoulder) && gangCar();
  if (!c) return false;
  Object.assign(c, { stage: 'chase', z: odo - GANG_CAR.from, lane: side ?? 0, x: shoulder ? SHOULDER_X : MY_LANES[side], shoulder,
                     v: speed + GANG_CAR.closing });
  return true;
}
function gangDrive(c, dt) { // road.js updateTraffic: true while it is at you; else it races as any racer does
  if (!rigged() || c.fleet || c.wreck) return false;
  const now = runTime() - run.left, ahead = c.z - odo, on = run.phase === 'run' && lane <= 1;
  if (!c.stage && on && ahead > CHECK.near && ahead < CHECK.far && c.v > speed - 1 && now >= (c.again ?? 0)) c.stage = 'chase';
  if (!c.stage) return false;
  if (c.miner) return minerDrive(c, dt);
  if (c.stage === 'chase') { // up your other lane (or the shoulder) and past you
    c.v = speed + GANG_CAR.closing;
    if (ahead > CHECK.near) Object.assign(c, on ? { stage: 'cut', lane, t: CHECK.cut, shoulder: false } : { stage: null, again: now + CHECK.again });
  } else if (c.stage === 'cut') { // across into your lane
    c.v = speed + 2;
    if (Math.abs(c.x - MY_LANES[c.lane]) < 0.3 || (c.t -= dt) <= 0) Object.assign(c, { stage: 'brake', t: CHECK.stop });
  } else if ((c.t -= dt) > 0) c.v = Math.max(0, c.v - 9 * dt); // stamping on the brakes
  else { Object.assign(c, { stage: null, again: now + CHECK.again }); return false; }
  c.x += clamp((c.shoulder ? SHOULDER_X : MY_LANES[c.lane]) - c.x, -3 * dt, 3 * dt);
  c.z += c.v * dt;
  return !!c.stage;
}

// the gang's mines (the owner, 2 Nov: "mines from ahead"): a gang car up the road in one of your lanes, slower than you;
// once you are close it drops mines in its lane, then pulls off onto the right shoulder and races on. A mine run over
// hits the front cell of the column over it (runOver, as a spike strip's); off its lane it misses. Four lanes wide
// there is no dodging them: the mine roller's (layer 13). Claude's numbers, for act5.py: m up the road, m/s slower, m
// from you when it drops, s between mines, mines, % a mine before Armor plating (a spike strip's 12). Dropping at 50 m
// from 300 m up the road, most were stopped by your raiders first (they go for the gang first): few mines were laid
const MINE = { ahead: 200, slower: 15, near: 120, every: 0.4, drop: 3, hit: 15, shells: 2 }; // shells: one picked up (below)
let mines = []; // on the road: { x, z, over }
function sendMiner() {
  const c = gangCar();
  if (!c) return false;
  const at = ROAD_LANES[lane + Math.floor(rand() * rigW)]; // one of the rig's lanes (car.js: lane its rightmost)
  Object.assign(c, { miner: true, stage: 'mine', z: odo + MINE.ahead, x: at, lane: 0, v: speed - MINE.slower, dropped: 0, t: 0 });
  return true;
}
function minerDrive(c, dt) { // gangDrive: up ahead and slower, then its mines, then off the road and away
  if (c.stage === 'mine') {
    c.v = speed - MINE.slower;
    if (c.z - odo < MINE.near && run.phase === 'run') { Object.assign(c, { stage: 'drop', t: 0 }); flash('MINES!', '#f55', false); }
  } else if (c.stage === 'drop') {
    c.v = speed - MINE.slower;
    if ((c.t -= dt) <= 0) { mines.push({ x: c.x, z: c.z - 1 }); c.t = MINE.every; if (++c.dropped === MINE.drop) c.stage = 'off'; }
  } else { // onto the shoulder, flat out
    c.v = Math.min(c.v + 12 * dt, speed + 15);
    c.x += clamp(SHOULDER_X - c.x, -5 * dt, 5 * dt);
    if (Math.abs(c.x - SHOULDER_X) < 0.2 && c.z - odo > 0) Object.assign(c, { miner: false, stage: null, lane: 0, again: Infinity });
  }
  c.z += c.v * dt;
  return true;
}
function mineTick() { // distance.js updateRun: a mine reached, run over or missed
  for (const m of mines) {
    if (m.over || odo + MY_FRONT < m.z) continue;
    m.over = true;
    if (lvl('minePicker')) { pickMine(m); continue; } // the Mine picker (above): lifted, a charge for the cannon
    if (!runOver(MINE.hit, m.x)) continue; // under a column of the board, or between them
    shake = Math.max(shake, 0.6); // main.js
    crashSound();
    flash('MINE!', '#f55', false);
    if (wrecked()) return finishRun('wrecked');
  }
  mines = mines.filter(m => m.z > odo - 20);
}
function pickMine(m) { // under a column of the board: picked up; between them, or beside the rig, missed
  const cx = columnAt(m.x);
  if (cx < 0 || cx >= boardW()) return;
  progress.shells += MINE.shells;
  run.shells += MINE.shells;
  beep(1320, 0.06);
  flash(`MINE PICKED +${MINE.shells} SHELLS`, '#ffd23a', false);
}
const mineMarks = () => mines.map(m => ({ z: m.z, kind: 'mine', value: m })); // distance.js roadMarks

// the rival gang's war rigs (Claude's, 30 Oct), its notable enemy: a tanker welded up for war (road.js RIG_SPRITE),
// in the gang's ambushes (below). It takes over a car out of sight up the road, as the police do, and comes up from
// behind you in your other lane; it holds the road ahead of you, in the reticle, until it is totaled, and its War Boys
// throw grenades back at you (below; the owner, 2 Nov: it rammed your side until then, the police's verb now). Rams
// barely scratch it, as the tank. First guesses, for act5.py: six shells, or four and the guns; m ahead it holds; s to
// its first grenade, between them, in the air
const RIG = { hp: 1500, ahead: 45, scrap: 150, w: 2.8, h: 3.4, first: 2, every: 4, flight: 0.8 };
// distance.js startRun: the gang, its mines, the ambushes, the police's spike strips (police.js)
const rigRun = () => {
  gangClock = GANG_CAR.every; ambushes = drawAmbushes(); strips = []; torn = 0; mines = []; hooked = null; lobs = []; rockets = [];
  if (jammed.size) { jammed.clear(); applyUpgrades(); } // a new race: everything restarted
};
function sendRig() { // the ambushes: two at a time at most; false if not now (no car to take, no room)
  if (traffic.filter(c => c.rig && !c.wreck).length >= 2) return false;
  const c = traffic.find(c => takeable(c) && c.z - odo > 600);
  const side = sideLane(), wide = side == null && rigW > 1 && lane <= 1; // a fortress filling your side: it waits up the road
  if (!c || !wide && (side == null || !laneClear(MY_LANES[side], 10))) return false;
  Object.assign(c, { rig: true, dir: 1, look: { rear: RIG_SPRITE }, w: RIG.w, h: RIG.h, hp: null, wreck: false, swerve: null, warned: false,
                     beams: 0, d: NaN, hit: -Infinity }, wide ? { lane, x: MY_LANES[lane], z: odo + 300, v: speed, stage: 'hold', t: RIG.first }
                     : { lane: side, x: MY_LANES[side], z: odo - 60, v: speed + 15, stage: 'pass' });
  flash('RIVAL RIG!', '#f55', false);
  horn();
  return true;
}
function rigDrive(c, dt) { // road.js updateTraffic: past you up the lane beside you, then the road ahead held, its War
  const gap = c.z - odo, side = sideLane();                 // Boys throwing their grenades back at you
  if (c.stage === 'pass') { c.v = speed + 15; if (side != null) c.lane = side; if (gap > RIG.ahead) Object.assign(c, { stage: 'hold', t: RIG.first }); }
  else {
    c.v = Math.max(0, speed + (RIG.ahead - gap) * 0.6);
    if ((c.t -= dt) <= 0 && run.phase === 'run') { c.t = RIG.every; lob(c); }
  }
  c.x += clamp(MY_LANES[c.lane] - c.x, -2 * dt, 2 * dt);
  c.z += c.v * dt;
}

// the War Boys' grenades (the owner, 2 Nov): one arcs back from the rig onto a cell of the board, at random, and its
// blast (a blue flash) knocks out the powered parts there and on the four cells beside it: the cannon, guns, engines;
// armor and spikes shrug it off, so placing counts. A part knocked out does nothing (blocks, rigPower, the engine's
// voice) and shows it (JAMMED: blue, static, a lightning mark) until a tap restarts it, or it restarts on its own after
// 10 s; knocked out it can't be thrown off or swapped out. Claude's numbers, for act5.py
const EMP = { secs: 10, kinds: ['cannon', 'gun', 'engine'] };
let lobs = [], jammed = new Map(); // grenades in the air { c, t, at: [x, y] }; a part knocked out: s until it restarts
const live = p => !jammed.has(p);
function lob(c) { lobs.push({ c, t: 0, at: [Math.floor(rand() * boardW()), Math.floor(rand() * boardH())] }); }
function lobTick(dt) { // distance.js updateRun: the grenades land; the parts knocked out restart on their own
  for (const g of lobs) if ((g.t += dt) >= RIG.flight) blast(g.at);
  lobs = lobs.filter(g => g.t < RIG.flight);
  for (const [p, t] of jammed) if (t <= dt) restart(p); else jammed.set(p, t - dt);
}
function blast([x, y]) {
  const f = progress.fortress, near = new Set();
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const i = partAt(f, x + dx, y + dy); if (i >= 0) near.add(f.parts[i]); }
  const out = [...near].filter(p => EMP.kinds.includes(p.kind) && live(p));
  struck = { x, y, emp: true, t: performance.now() }; // the blue flash on its cell (renderRig)
  shake = Math.max(shake, 0.25); // main.js
  beep(120, 0.15);
  if (!out.length) return;
  for (const p of out) jammed.set(p, EMP.secs);
  flash('JAMMED', '#6af', false);
  applyUpgrades(); // distance.js: an engine's pull gone
}
function restart(p) { // a tap (holdPart), or 10 s
  if (!jammed.delete(p)) return;
  applyUpgrades();
  beep(880, 0.05);
}
// a grenade in the air (gang.js renderGang): from the rig up the road down onto your hood, a high arc, its fuse blue
function drawLobs() {
  const w = canvas.width, h = canvas.height, now = performance.now();
  for (const g of lobs) {
    const s = g.c.seen;
    if (!s || g.c.wreck) continue;
    const k = g.t / RIG.flight, x1 = s[0] + s[2] / 2, y1 = s[1], x2 = w * (0.4 + 0.2 * (g.at[0] + 0.5) / boardW()), y2 = h * 0.72;
    const x = x1 + (x2 - x1) * k, y = y1 + (y2 - y1) * k - Math.sin(Math.PI * k) * h * 0.18, r = w / 140 * (1 + 2 * k);
    g2d.fillStyle = '#2a2a24'; g2d.beginPath(); g2d.arc(x, y, r, 0, 2 * Math.PI); g2d.fill();
    g2d.fillStyle = now % 200 < 100 ? '#8cf' : '#36f'; g2d.beginPath(); g2d.arc(x, y - r * 0.6, r * 0.45, 0, 2 * Math.PI); g2d.fill();
  }
}
// the rival gang's harpoon truck (the owner, 2 Nov; its midline, in the gang's ambushes): it comes past and holds the
// road ahead of you in the lane beside you, or up the right shoulder with none, so you see it (the owner: from the
// radar alone a part gone would look like a ram or a bug); in the reticle, it winds up, the part it aims at blinking
// on the board; fires, and the part nearest its side (the front one first) is torn off the board on its cable and
// dragged across the road to it. Totaled before it gets clear, the part falls on the road in a crate; reeled in, it
// is gone. Anything on the board, the tank's cannon too (the owner, 2 Nov: "it should also grab the cannon to make it
// more dangerous"); a heavier part is slower to reel in, so a stolen cannon is a race to bring the truck down and get
// it back. Claude's numbers, for act5.py: health (two shells), scrap; m ahead it holds; s it holds, winds up, reels a
// light part; kg a second more to reel in (the cannon's 900: 6 s)
const HARPOON = { hp: 500, scrap: 100, w: 2.3, h: 2.2, ahead: 30, hold: 1, wind: 2, reel: 4, heavy: 450 };
const reelTime = p => HARPOON.reel + PARTS[p.kind].kg * p.cells.length / HARPOON.heavy;
let hooked = null; // the part a truck aims at
// the truck taking aim or reeling a part in: the reticle goes to it at once (gang.js updateGang), the most urgent
const harpooning = () => traffic.find(c => c.harpoon && !c.wreck && (c.stage === 'wind' || c.stage === 'reel'));
const aimedAt = () => traffic.some(c => c.harpoon && !c.wreck && c.stage === 'wind') ? hooked : null; // renderBoard blinks it
// the ambushes: one at a time, and only once the board holds two parts or more (act5.py: on the first board, the tank's
// cannon alone, it took the cannon in the first race on both seeds, and no shell could bring the truck down in time to
// get it back: no cannon for three or four races); false if not now
function sendHarpoon() {
  if (traffic.some(c => c.harpoon && !c.wreck && c.stage !== 'leave') || progress.fortress.parts.length < 2) return false;
  const c = traffic.find(c => takeable(c) && c.z - odo > 600);
  if (!c || besideX() == null) return false;
  Object.assign(c, { harpoon: true, dir: 1, look: { rear: HARPOON_SPRITE }, w: HARPOON.w, h: HARPOON.h, hp: null, wreck: false, swerve: null,
                     warned: false, beams: 0, d: NaN, hit: -Infinity, prize: null, x: besideX(), z: odo - 60, v: speed + 15, stage: 'pass' });
  flash('HARPOON TRUCK!', '#f55', false);
  return true;
}
// where it drives beside you (a jeep too, below): the lane beside the rig, else the right shoulder (the road's right lane
// yours), else none
const besideX = () => { const side = sideLane(); return side != null ? MY_LANES[side] : lane === 0 ? SHOULDER_X : null; };
function harpoonDrive(c, dt) { // road.js updateTraffic
  const gap = c.z - odo, at = besideX() ?? c.x;
  if (c.stage === 'leave') { c.v = speed + 20; c.z += c.v * dt; return; } // off up the road, back into the traffic (road.js)
  c.x += clamp(at - c.x, -3 * dt, 3 * dt);
  c.v = c.stage === 'pass' ? speed + 15 : c.stage === 'reel' ? speed + 8 : Math.max(0, speed + (HARPOON.ahead - gap) * 0.8);
  c.z += c.v * dt;
  if (run.phase !== 'run') return;
  if (c.stage === 'pass') { if (gap > HARPOON.ahead) Object.assign(c, { stage: 'hold', t: HARPOON.hold }); }
  else if (c.stage === 'hold') { if ((c.t -= dt) <= 0) aimHarpoon(c); }
  else if (c.stage === 'wind') { if (!progress.fortress.parts.includes(hooked)) aimHarpoon(c); else if ((c.t -= dt) <= 0) fireHarpoon(c); }
  else if ((c.t -= dt) <= 0) { // reeled in: the part is the gang's
    if (c.prize) flash(`${PARTS[c.prize.kind].name} ${c.prize.cells.length} GONE`, '#f55', false);
    Object.assign(c, { stage: 'leave', prize: null });
  }
}
function aimHarpoon(c) { // the part nearest its side, the front one first; with the board bare, it leaves
  const f = progress.fortress, col = c.x < carX ? 0 : boardW() - 1;
  const dist = p => Math.min(...p.cells.map(([x, y]) => Math.abs(p.x + x - col) * 10 + p.y + y));
  hooked = [...f.parts].sort((a, b) => dist(a) - dist(b))[0] ?? null;
  if (!hooked) return Object.assign(c, { stage: 'leave' });
  if (c.stage !== 'wind') flash('HARPOON!', '#f55', false);
  Object.assign(c, { stage: 'wind', t: HARPOON.wind });
}
function fireHarpoon(c) { // the part torn off the board, dragged across the road to the truck
  const f = progress.fortress, i = f.parts.indexOf(hooked);
  hooked = null;
  if (i < 0) return aimHarpoon(c);
  const [p] = f.parts.splice(i, 1);
  fallen.push({ p, t: performance.now() }); // its hole blinks on the board
  letGo(); // a part held to throw off: the board's numbers have moved
  applyUpgrades(); // distance.js: its weight, its pull
  save();
  shake = Math.max(shake, 0.4); // main.js
  crashSound();
  flash(`${PARTS[p.kind].name} ${p.cells.length} HARPOONED`, '#f55', false);
  Object.assign(c, { stage: 'reel', t: reelTime(p), prize: p, fired: performance.now() });
}
// the cable (gang.js renderGang), from the truck to your side of the hood: aimed, a thin red line blinking; fired, the
// cable taut, the part on it dragged across to the truck in its first second, then hanging behind it
function drawHarpoons() {
  const w = canvas.width, h = canvas.height, now = performance.now();
  for (const c of traffic) {
    if (!c.harpoon || c.wreck || !c.seen || c.stage !== 'wind' && c.stage !== 'reel') continue;
    const x1 = c.seen[0] + c.seen[2] / 2, y1 = c.seen[1] + c.seen[3] * 0.25, x2 = w * (c.x < carX ? 0.3 : 0.7), y2 = h * 0.72;
    if (c.stage === 'wind') {
      if (now % 300 > 150) continue;
      g2d.strokeStyle = '#ff3030'; g2d.lineWidth = Math.max(2, w / 450); g2d.setLineDash([w / 80, w / 120]); // thin didn't show on a phone
    } else { g2d.strokeStyle = '#1a1a1e'; g2d.lineWidth = Math.max(2, w / 300); g2d.setLineDash([]); }
    g2d.beginPath(); g2d.moveTo(x1, y1); g2d.lineTo(x2, y2); g2d.stroke();
    g2d.setLineDash([]);
    if (c.stage !== 'reel' || !c.prize) continue;
    const k = Math.min(1, (now - c.fired) / 1000), px = x2 + (x1 - x2) * k, py = y2 + (y1 - y2) * k, s = w / 30 * (1 - 0.6 * k);
    g2d.drawImage(crateSprite(c.prize.kind), px - s / 2, py - s * 0.4, s, s * 0.8); // road.js
  }
}

// ---- the army (layer 12; the factions, the owner, 2 Nov: "military shoots"). Its fodder, the jeep (the raiders' and
// your rams'): the police car's body in olive drab with a white star (the owner: reskins are fine for the fodder), a
// machine gun on its roof, peppering you as it passes, on the side it is on. It comes up from behind in the lane beside
// you (or the right shoulder, as the gang's cars), past you, drops back past you, and past you once more, firing all
// the while it is near: each shot lands where it comes from (cellAt), on the column on its side of the board, the front
// row once it is ahead. Then it races off up the road. Claude's numbers, for act5.py: health (a car's: a ram with the
// full bull bar totals it); m/s quicker or slower than you; m ahead and behind it turns; times past you; s between
// shots; % a shot before Armor plating (a police car's ram is 4)
const JEEP = { hp: 100, by: 6, ahead: 20, behind: 10, passes: 3, every: 0.4, hit: 0.4 };
function sendJeep() { // the ambushes; false with no car to take over, no way past you, or another just sent that way
  const x = besideX(), c = x != null && !traffic.some(o => o.jeep && !o.wreck && sameLane(o.x, x) && o.z < odo - 20) &&
    traffic.find(c => takeable(c) && c.z - odo > 600);
  if (!c) return false;
  Object.assign(c, { jeep: true, dir: 1, look: JEEP_LOOK, hp: null, wreck: false, swerve: null, warned: false, beams: 0, d: NaN,
                     hit: -Infinity, x, z: odo - 40, v: speed + JEEP.by, stage: 'pass', passes: 0, shot: 0, fired: false });
  return true;
}
function jeepDrive(c, dt) { // road.js updateTraffic: past you and back, firing while it is near; then off up the road
  const gap = c.z - odo;
  if (c.stage === 'leave') { c.v = speed + 20; c.z += c.v * dt; return; } // back into the traffic (road.js)
  c.x += clamp((besideX() ?? c.x) - c.x, -3 * dt, 3 * dt);
  if (c.stage === 'pass' && gap > JEEP.ahead || c.stage === 'back' && gap < -JEEP.behind)
    c.stage = ++c.passes >= JEEP.passes ? 'leave' : c.stage === 'pass' ? 'back' : 'pass';
  c.v = speed + (c.stage === 'back' ? -JEEP.by : JEEP.by);
  c.z += c.v * dt;
  if (run.phase === 'run' && gap > -JEEP.behind && gap < JEEP.ahead && (c.shot -= dt) <= 0) jeepFire(c);
}
function jeepFire(c) { // a shot: its tracer, the hit on the side of the board it is on
  c.shot = JEEP.every;
  tracers.push([c, 'you', performance.now()]); // gang.js: drawn while it is in sight
  beep(110, 0.03);
  strike(JEEP.hit, c.x, c.z);
  if (!c.fired) { c.fired = true; flash('UNDER FIRE', '#f55', false); }
  if (!progress.toured.includes('jeeps')) openTour('jeeps', true);
  if (wrecked()) finishRun('wrecked');
}
// its midline, the rocket car: the police SUV's body in olive, a rocket pod on the roof. It takes over a car up the road
// and holds the road ahead, two at most (the second further on, in your lane: the first takes your other), in the
// reticle, the cannon's and the guns'; rams barely scratch it. Every few seconds it locks on: a lane the fortress
// covers and a row of the board, its mark blinking on the cell over that lane (the owner: "a marker on the cell it
// will land on"), then the rocket goes up, its mark lit, and comes down there. Change lanes before it lands and the
// mark moves with you, off the board: it misses (the owner: "dodged by changing lanes"); a fortress three or four lanes
// wide changes lanes too slowly to dodge, or can't at all. Claude's numbers, for act5.py: an SUV's health (three
// shells), scrap and size; m ahead it holds; s to its first lock, between them, locked on, in the air; % a hit before
// Armor plating (a mine's 15)
const ROCKET = { hp: 600, scrap: 110, w: 2.1, h: 1.9, ahead: 70, first: 2, every: 5, lock: 1.5, flight: 1, hit: 15 };
let rockets = []; // locked on or in the air: { c, x (the road's lane), y (the board's row), t, air, from }
function sendRocket() { // the ambushes; false with two on the road, or no car to take over
  const k = traffic.filter(c => c.rocket && !c.wreck).length, c = k < 2 && traffic.find(c => takeable(c) && c.z - odo > 600);
  if (!c) return false;
  const at = lane > 1 ? k : k ? lane : 1 - lane;
  Object.assign(c, { rocket: true, dir: 1, look: ROCKET_LOOK, w: ROCKET.w, h: ROCKET.h, hp: null, wreck: false, swerve: null, warned: false,
                     beams: 0, d: NaN, hit: -Infinity, lane: at, x: MY_LANES[at], z: odo + 250 + 40 * k, v: speed, t: ROCKET.first + k * 2,
                     second: k > 0 });
  flash('ROCKET CAR!', '#f55', false);
  return true;
}
function rocketDrive(c, dt) { // road.js updateTraffic: the road ahead held, as the tank holds it; a rocket every few seconds
  const keep = ROCKET.ahead + (c.second ? 30 : 0);
  c.v = clamp(speed + (keep - (c.z - odo)) * 0.6, 0, 140);
  c.z += c.v * dt;
  c.x += clamp(MY_LANES[c.lane] - c.x, -2 * dt, 2 * dt);
  if ((c.t -= dt) > 0 || run.phase !== 'run' || c.z - odo > keep + 20 || rockets.some(r => r.c === c && !r.air)) return;
  c.t = ROCKET.every;
  rockets.push({ c, x: ROAD_LANES[lane + Math.floor(rand() * rigW)], y: Math.floor(rand() * boardH()), t: ROCKET.lock, air: false });
  flash('ROCKET!', '#f55', false);
  beep(1200, 0.08);
}
const rocketCol = r => columnAt(r.x); // the board's column over its lane now
function rocketTick(dt) { // distance.js updateRun: locked on, fired (unless the car was brought down first), landed
  for (const r of rockets) {
    if (!r.air && (r.c.wreck || !r.c.rocket)) { r.gone = true; continue; }
    if ((r.t -= dt) > 0) continue;
    if (r.air) { r.gone = true; landRocket(r); continue; }
    const s = r.c.seen;
    Object.assign(r, { air: true, t: ROCKET.flight, from: s && [s[0] + s[2] / 2, s[1]] });
    beep(220, 0.2);
  }
  rockets = rockets.filter(r => !r.gone);
}
function landRocket(r) { // on the cell over its lane, or beside the rig: true if it hit
  shake = Math.max(shake, 0.3); // main.js
  if (!runOver(ROCKET.hit, r.x, r.y)) { flash('MISSED IT', '#3f6', false); beep(90, 0.15); return false; }
  shake = Math.max(shake, 0.6);
  crashSound();
  flash('ROCKET HIT', '#f55', false);
  if (wrecked()) finishRun('wrecked');
  return true;
}
// a rocket in the air (gang.js renderGang): up from the car's roof in a high arc and down onto the cell over its lane,
// beside the rig once you are out from under it, a trail of smoke behind it
function drawRockets() {
  const w = canvas.width, h = canvas.height;
  for (const r of rockets) {
    if (!r.air || !r.from) continue;
    const col = (r.x - carX) / LANE_W + (boardW() - 1) / 2, [x1, y1] = r.from, x2 = w * (0.4 + 0.2 * (col + 0.5) / boardW()), y2 = h * 0.72;
    const at = k => [x1 + (x2 - x1) * k, y1 + (y2 - y1) * k - Math.sin(Math.PI * k) * h * 0.3], k = 1 - r.t / ROCKET.flight, size = w / 160 * (1 + 2 * k);
    for (let i = 6; i > 0; i--) { // the smoke
      const [x, y] = at(Math.max(0, k - i * 0.035));
      g2d.fillStyle = `rgba(170, 170, 170, ${(0.6 - i * 0.08).toFixed(2)})`; g2d.beginPath(); g2d.arc(x, y, size * (0.8 + i * 0.15), 0, 2 * Math.PI); g2d.fill();
    }
    const [x, y] = at(k);
    g2d.fillStyle = '#ffb347'; g2d.beginPath(); g2d.arc(x, y, size * 1.1, 0, 2 * Math.PI); g2d.fill(); // its flame, its nose
    g2d.fillStyle = '#2b3011'; g2d.beginPath(); g2d.arc(x, y, size * 0.7, 0, 2 * Math.PI); g2d.fill();
  }
}
// the rockets' marks on the board (renderRig): blinking while locked on, lit in the air; none once its lane is off
// the board
function markRockets() {
  [...$('fort-grid').querySelectorAll('.fort-aim')].forEach((el, i) => {
    const r = rockets[i], cx = r ? rocketCol(r) : -1, on = cx >= 0 && cx < boardW();
    el.className = on ? `fort-aim ${r.air ? 'air' : 'lock'}` : 'fort-aim';
    if (on) Object.assign(el.style, { left: `${cx * 100 / boardW()}%`, top: `${r.y * 100 / boardH()}%` });
  });
}

// ---- ambushes (layer 9; the feel and the factions, 31 Oct-2 Nov): on the war rig the heat retires, and the road
// fights back by how built-out the fortress is. Each race's ambushes are drawn before it on dice of their own, as act
// 3's spots are (the owner: "a bit of randomization, like in act 3"; the traffic stays the same), in clusters and gaps
// along the race, five draws and the middle one kept. Each is one faction's (the police, the gang, the army), and they
// overlap. Their budget comes from the fortress's strength, its size and what is on it as worn as it is: bigger, more
// of them, the budget growing slower than the fortress so that building pays (the owner: a 3x4 with two cannons sees
// far more than a 2x3 with one). Claude's numbers, for act5.py
const AMBUSH = { first: [300, 600], near: [200, 400], far: [600, 1000], cluster: 0.55, lead: 450, draws: 5, // m; s
                 base: 8, scale: 4, power: 0.85 }; // the budget: base + scale x strength ^ power
const COST = { cop: 1, suv: 3, heli: 6, gang: 1, harpoon: 3, rig: 6, jeep: 1, rocket: 3, tank: 10 }; // of the budget, a member
// (the army's a 20% share while it was tanks alone; with its rocket cars and jeeps (layer 12) its ambushes spend their
// whole share, and at 20% they came half as often: half the tanks, and the tanks bring the cannons. act5.py)
const FACTIONS = { // their members by tier (the factions: fodder, midline, notable), a share of the ambushes each
  police: { share: 0.35, tiers: [['heli'], ['suv'], ['cop']] }, gang: { share: 0.35, tiers: [['rig'], ['harpoon'], ['gang']] },
  army: { share: 0.3, tiers: [['tank'], ['rocket'], ['jeep']] },
};
const SEND = { cop: () => sendCop(false), suv: () => sendCop(true), heli: () => sendHeli(), gang: () => sendGangCar(), rig: () => sendRig(),
               harpoon: () => sendHarpoon(), jeep: () => sendJeep(), rocket: () => sendRocket(), tank: () => sendTank() }; // police.js,
               // here, boss.js: each false if not now (none to take over, no room, too many)
const WORTH = { cannon: 3, gun: 2, engine: 1, armor: 1, spikes: 1 }; // a block's share of the strength, as worn as it is
const strength = () => boardW() * boardH() + progress.fortress.parts.reduce((k, p) => k + WORTH[p.kind] * p.cells.length * hpOf(p) / fullHp(p), 0);
const budget = () => AMBUSH.base + AMBUSH.scale * strength() ** AMBUSH.power;
let ambushes = [], ambushDice = 1; // this race's: { at: m into it, faction, members: [kind], sent }
const ambushRoll = () => ((ambushDice = (ambushDice * 48271) % 2147483647) - 1) / 2147483646;
const within = ([lo, hi]) => lo + (hi - lo) * ambushRoll();
const costOf = list => list.reduce((k, a) => k + a.members.reduce((m, kind) => m + COST[kind], 0), 0);
function drawAmbushes() { // rigRun, as a race starts
  if (!rigged()) return [];
  ambushDice = 1 + (progress.runs * 104729) % 2147483646;
  const length = Math.max(30, progress.pace) * runTime(), money = budget(); // oil.js: a race's meters, as the spots' are
  const draws = Array.from({ length: AMBUSH.draws }, () => drawOnce(length, money)).sort((a, b) => costOf(a) - costOf(b));
  return draws[AMBUSH.draws >> 1];
}
function drawOnce(length, money) {
  const list = [];
  for (let at = within(AMBUSH.first), left = money * within([0.8, 1.2]); at < length - 200 && left >= 1;
       at += ambushRoll() < AMBUSH.cluster ? within(AMBUSH.near) : within(AMBUSH.far)) {
    const faction = pickFaction(left), share = money * within([0.3, 0.7]); // a third to two thirds of the race's, the army's
    const members = buyMembers(faction, Math.min(left, faction === 'army' ? Math.max(share, COST.tank) : share)); // a tank at least
    if (!members.length) continue;
    list.push({ at, faction, members, sent: 0 });
    left -= members.reduce((m, kind) => m + COST[kind], 0);
  }
  return list;
}
function pickFaction(left) { // the army only once a tank is affordable: it brings its tank first, then its rocket cars and jeeps
  const open = Object.keys(FACTIONS).filter(f => f !== 'army' || left >= COST.tank);
  let r = ambushRoll() * open.reduce((k, f) => k + FACTIONS[f].share, 0);
  return open.find(f => (r -= FACTIONS[f].share) < 0) ?? open.at(-1);
}
function buyMembers(faction, money) { // notables first when affordable (more than one, from a big budget), the midline, then fodder
  const [notables, mids, fodder] = FACTIONS[faction].tiers, m = [];
  for (const k of notables) while (money >= COST[k] && (m.length === 0 || ambushRoll() < 0.4)) { m.push(k); money -= COST[k]; }
  for (const k of mids) while (money >= COST[k] && ambushRoll() < 0.6) { m.push(k); money -= COST[k]; }
  for (const k of fodder) while (money >= COST[k] && m.length < 7) { m.push(k); money -= COST[k]; }
  return m;
}
function ambushTick() { // distance.js updateRun: one that is near sends its members as they can come, one a frame
  for (const a of ambushes) {
    if (a.sent >= a.members.length || odo < a.at - AMBUSH.lead) continue;
    if (!a.told) { a.told = true; flash(`${a.faction.toUpperCase()} AMBUSH!`, '#f55', false); }
    if (SEND[a.members[a.sent]]()) a.sent++;
  }
}

// ---- the loot (layer 6; the owner, 29-30 Oct): the notable enemies and, rarely, the rival gang's cars drop parts as they
// are totaled, each enemy by its drop table; a crate skids along the road from where it fell, and you steer over it to
// pick it up into the hold (with the hold full it stays on the road); then the board's drag puts it on. Each part does
// what it came from does, its size its strength (the owner: "each one functional, depending on the source"), and every
// block weighs. Claude's first draft of the tables and every number, to explore (design notes: Drop tables)
const PARTS = { // a block's kg, its health (the shield, below) and the sizes (blocks) it comes in
  cannon: { name: 'CANNON', kg: 900, hp: 100, sizes: [1, 2] }, gun: { name: 'GUN', kg: 250, hp: 8, sizes: [1, 2] },
  armor: { name: 'ARMOR', kg: 500, hp: 20, sizes: [1, 2, 3] }, spikes: { name: 'SPIKES', kg: 300, hp: 15, sizes: [1, 2, 3] },
  engine: { name: 'ENGINE', kg: 700, hp: 10, sizes: [1, 2] },
};
// the nine shapes (the owner: one to three blocks, each turn its own drop, never turned): one; two stacked, two side by
// side; three in a line along and across, and the bent three in its four turns
const SHAPES = { 1: [ONE], 2: [[[0, 0], [0, 1]], [[0, 0], [1, 0]]], 3: [[[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]], [[1, 0], [0, 1], [1, 1]]] };
// an enemy's chance of a part, and which (the owner's examples: a rival car rarely; a tank its turret mostly). By tier
// (the factions, 2 Nov): fodder rarely, the midline sometimes, the notables often, none always (the owner: "drop chance
// shouldn't be 100%", and ten SUVs shouldn't be ten crates)
const DROPS = {
  gang: [0.12, { armor: 0.4, spikes: 0.4, engine: 0.2 }], cop: [0.1, { armor: 0.6, spikes: 0.4 }],
  suv: [0.45, { armor: 0.5, engine: 0.3, gun: 0.2 }],
  harpoon: [0.45, { armor: 0.4, spikes: 0.3, gun: 0.3 }], // besides the part it took, if it had one (gang.js total)
  rig: [0.8, { armor: 0.4, spikes: 0.3, engine: 0.3 }], heli: [0.8, { gun: 0.6, engine: 0.4 }], // its gun or its turbine
  jeep: [0.1, { gun: 0.6, armor: 0.4 }], rocket: [0.45, { armor: 0.4, gun: 0.3, engine: 0.3 }], // the jeep's machine gun mostly
  tank: [0.85, { cannon: 0.7, armor: 0.2, engine: 0.1 }],
};
const ENGINE_POWER = { gang: 0.06, suv: 0.1, rocket: 0.1, rig: 0.15, tank: 0.25, heli: 0.2 }; // more pull a block, by the engine it came from
// m/s² a crate skids to a stop at; m either way it is picked up within; m ahead of you a crate lands at least, so you
// see it coming and choose (the owner, 2 Nov: drops beside you went straight into the hold unseen, and those behind you
// were never seen at all)
const LOOT = { slow: 8, reach: 3, ahead: 25 };
const pick = (table, roll = rand) => { let r = roll(); const ks = Object.keys(table); return ks.find(k => (r -= table[k]) < 0) ?? ks.at(-1); };
const sourceOf = c => c.tank ? 'tank' : c.rig ? 'rig' : c.harpoon ? 'harpoon' : c.rocket ? 'rocket' : c.jeep ? 'jeep' : c.suv ? 'suv' : c.heli ? 'heli' : c.police ? 'cop' :
  c.racer && !c.fleet ? 'gang' : null;
// a size it comes in, then a shape of it no wider than the board (one wider never fits), in salvage condition (the
// feel, 31 Oct): worn, SALVAGE of its health at random, so a fresher one is worth a swap even on a full board
const SALVAGE = [0.4, 1];
function makePart(kind, from, roll = rand) { // roll: the dice (the traffic's, or the dealer's own)
  const sizes = PARTS[kind].sizes, shapes = SHAPES[sizes[Math.floor(roll() * sizes.length)]].filter(c => extent(c, 0) <= boardW());
  const part = { kind, from, cells: shapes[Math.floor(roll() * shapes.length)] };
  return Object.assign(part, { hp: Math.round(fullHp(part) * (SALVAGE[0] + (SALVAGE[1] - SALVAGE[0]) * roll())) });
}
const condition = p => `${Math.round(100 * hpOf(p) / fullHp(p))}%`;

// the dealer (layer 13; agreed with the owner: before each race two or three random parts in random condition, one of
// them yours for a price, into the hold, Backpack Battles' shop kept small so it doesn't stand in for the hunt; the map:
// points pay the shady people). On the Fortress page once rebuilt: three parts, each one of an enemy's (its drop table,
// as if it went down), salvage-worn as the loot is; one bought, the rest go until the next race. Drawn on dice of their
// own (the traffic rolls as it did), the same three until a race is run. Its price by what the part is worth to the
// fortress, as the ambushes weigh it (WORTH, its blocks, its condition): points a unit of that, Claude's first guess,
// for act5.py (a fresh cannon of two blocks 1,800; a half-worn block of armor 150)
const DEAL = { offers: 3, price: 300 };
const dealPrice = p => Math.max(10, 10 * Math.round(DEAL.price * WORTH[p.kind] * p.cells.length * hpOf(p) / fullHp(p) / 10));
function dealer() { // this race's offers, drawn the first time they are asked for
  const f = progress.fortress;
  if (f.deal?.at !== progress.runs) {
    let dice = 1 + (progress.runs * 7919) % 2147483646;
    const roll = () => ((dice = (dice * 48271) % 2147483647) - 1) / 2147483646, from = Object.keys(DROPS);
    f.deal = { at: progress.runs, sold: false, offers: Array.from({ length: DEAL.offers }, () => {
      const src = from[Math.floor(roll() * from.length)];
      return makePart(pick(DROPS[src][1], roll), src, roll);
    }) };
  }
  return f.deal;
}
function dealCard() { // distance.js renderGarage: a card, an offer a button (a card each pushed the page off a phone)
  if (garageTab !== 'fortress' || !rigged()) return '';
  const d = dealer(), full = progress.fortress.hold.length >= holdSize();
  return `<div class="card deal"><b>Dealer</b><small>${d.sold ? 'Sold. More after your next race.' : full ? 'Your hold is full.' :
    'One of these, into the hold:'}</small>` + d.offers.map((p, i) => `<button data-deal="${i}"${full || progress.points < dealPrice(p) ?
    ' disabled' : ''}>${PARTS[p.kind].name} ${p.cells.length} · ${condition(p)} · ${price(null, dealPrice(p), 'pts')}</button>`).join('') + '</div>';
}
function buyDeal(i) { // distance.js, a tap on an offer's button: into the hold
  const d = dealer(), p = d.offers[i];
  if (!p || d.sold || progress.points < dealPrice(p) || progress.fortress.hold.length >= holdSize()) return false;
  progress.points -= dealPrice(p);
  progress.fortress.hold.push(p);
  Object.assign(d, { sold: true, offers: [] });
  applyUpgrades(); // distance.js: its weight
  save();
  return true;
}
function dropLoot(c) { // gang.js total, boss.js tankDown: its drop, if any, on the road
  const from = rigged() && sourceOf(c);
  if (!from || rand() >= DROPS[from][0]) return;
  const part = makePart(pick(DROPS[from][1]), from);
  run.loot.push({ part, z: Math.max(c.z, odo + LOOT.ahead), x: c.x, v: c.v }); // thrown clear, up the road
  if (!progress.toured.includes('loot')) openTour('loot', true);
}
function stow(part) { // into the hold, if it has room
  const f = progress.fortress, name = `${PARTS[part.kind].name} ${part.cells.length} · ${condition(part)}`;
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
const blocks = kind => rigged() ? progress.fortress.parts.reduce((n, p) => n + (p.kind === kind && live(p) ? p.cells.length : 0), 0) : 0; // working
const DECK = 250; // kg a cell of deck
const rigWeight = () => !rigged() ? 0 : boardW() * boardH() * DECK +
  [...progress.fortress.parts, ...progress.fortress.hold].reduce((kg, p) => kg + PARTS[p.kind].kg * p.cells.length, 0);
const rigDrag = () => rigged() ? boardW() + 0.1 * (boardH() - 1) : 1; // its width is frontal area: a lane's more each; its
                                                                       // length a little
const rigPower = () => rigged() ? progress.fortress.parts.reduce((k, p) => k + (p.kind === 'engine' && live(p) ? ENGINE_POWER[p.from] * p.cells.length : 0), 0) : 0;
const armorCut = () => 0.25 * lvl('armour'); // Armor plating (gang.js); the war rig's armor parts are its shield, below

// ---- the shield (layer 7; the owner, 29 Oct: "parts fall off"): a hit on the war rig lands on the board's cell by where
// it comes from, ahead up as on the sonar (Claude's): what is ahead of you on the front row and what is behind on the
// back row, in the column it meets; what comes from beside you on that side's column, a row at random. A part there
// takes the whole hit, an empty cell lets it through to the rig, both less Armor plating's share. A part's health is
// its blocks' (the owner: "growing with its size"), and it is kept from race to race: repairs mend the rig only (the
// owner); worn, a part shows cracked. With none left the whole part falls off, gone for good, blinking as it goes and
// leaving a hole its shape. A block's health by what it is, Claude's numbers from act5.py: the tank's cannon, a turret,
// by far the toughest (on the first board, a single cell, it takes every hit of the first race: 30-40), the rest
// expendable, armor the most of them
const LANE_W = 3.5; // m between the lanes' centers
const FALL = 1200;  // ms a part blinks as it falls off
const fullHp = p => PARTS[p.kind].hp * p.cells.length;
const hpOf = p => p.hp ?? fullHp(p); // never hit, it is whole
const wear = p => { const left = hpOf(p) / fullHp(p); return left > 2 / 3 ? 0 : left > 1 / 3 ? 1 : 2; }; // the cracks it shows
let fallen = [], struck = null; // the parts falling off, { p, t }; the cell hit last, { x, y, part, t }
// the cell a hit from a car (or a gun) at x, z meets (z its rear, as the traffic's): it came in through the face the
// two overlap least on, as a collision does: across, from beside you; along, from ahead or behind, the one its middle is
// on. A shooter far up the road is far more apart along than across: from ahead
function cellAt(x, z) {
  const w = boardW(), h = boardH(), half = CAR_W / 2 + 1.75 * (rigW - 1); // road.js, car.js
  const across = Math.min(carX + half, x + CAR_W / 2) - Math.max(carX - half, x - CAR_W / 2); // m of overlap (a gap below 0)
  const along = Math.min(odo + MY_FRONT, z + CAR_LEN) - Math.max(odo - MY_REAR, z);
  if (across < along) return [x < carX ? 0 : w - 1, Math.floor(rand() * h)];
  return [clamp(Math.round((x - carX) / LANE_W + (w - 1) / 2), 0, w - 1), z + CAR_LEN / 2 > odo + (MY_FRONT - MY_REAR) / 2 ? 0 : h - 1];
}
function strike(pct, x, z) { // damage.js hurt, boss.js, police.js: pct the hit's damage before Armor plating, from x, z
  const d = pct * (1 - armorCut());
  if (!rigged()) return addDamage(d); // damage.js
  hitCell(d, ...cellAt(x, z));
}
// a spike strip (police.js stripTick) or a mine (mineTick) on the road's lane at x: the front cell of the column over it;
// a rocket (landRocket) the row it was aimed at; with none, a miss
const columnAt = x => Math.round((x - carX) / LANE_W + (boardW() - 1) / 2); // the board's column over the road at x
function runOver(pct, x, row = 0) {
  const cx = columnAt(x);
  if (cx < 0 || cx >= boardW()) return false;
  hitCell(pct * (1 - armorCut()), cx, row);
  return true;
}
function hitCell(d, cx, cy) { // d: the hit's damage after Armor plating
  const f = progress.fortress, i = partAt(f, cx, cy);
  struck = { x: cx, y: cy, part: i >= 0, t: performance.now() };
  if (i < 0) return addDamage(d); // through to the rig
  const p = f.parts[i];
  p.hp = Math.max(0, +(hpOf(p) - d).toFixed(2));
  if (p.hp <= 0) fallOff(i);
  if (!progress.toured.includes('shield')) openTour('shield', true);
}
function fallOff(i, how = 'LOST') { // and what it did goes with it: its weight, its pull, its voice, its strength
  const [p] = progress.fortress.parts.splice(i, 1);
  fallen.push({ p, t: performance.now() });
  letGo(); // a part held to throw off: the board's numbers have moved
  applyUpgrades(); // distance.js
  save();
  flash(`${PARTS[p.kind].name} ${p.cells.length} ${how}`, '#f55', false);
}
// wear with use (the feel, 31 Oct; the owner: "we need something that destroys the parts all the time"): a part loses
// health as it works, a size's worth no more than a block's (the bigger, the longer it lasts): the cannon a shell, a gun
// a shot, spikes a ram, an engine a second of full throttle; armor only by hits, its job. Fighting both uses up the
// board and fills it. Claude's numbers, for act5.py: a cannon block 100 shells, a gun block 160 shots, spikes 15 rams,
// an engine block 200 s flat out. Half the first guesses, and a quarter for the cannon (the first guesses wore the
// tank's cannon out in the second race, half of them by the third, and only a tank drops another): the ambushes, more
// enemies and more loot, the tanks among them, are for the faster churn the owner wants
const WEAR = { cannon: 1, gun: 0.05, spikes: 1, engine: 0.05 };
function wearOut(kind, by) { // fireCannon, gang.js fireGuns and ram, rigTick
  const f = progress.fortress;
  if (!rigged()) return;
  for (let i = f.parts.length - 1; i >= 0; i--) {
    const p = f.parts[i];
    if (p.kind !== kind || !live(p)) continue; // knocked out, it isn't working
    p.hp = Math.max(0, hpOf(p) - by);
    if (p.hp <= 0) fallOff(i, 'WORN OUT');
  }
}

// an engine heard (the owner, 30 Oct: "a new engine sound added on top of the existing one"): a voice for each kind of
// engine on the board, louder the more blocks of it (engine.js setVoices); the heavy ones' file loaded the first time
// one is mounted, so the page weighs no more until then
const ENGINE_SOUND = { gang: 'boxer', suv: 'v8', rocket: 'v8', rig: 'truck', tank: 'tank', heli: 'turbine' }; // a rival car's
let heard = '', rigSounds = false; // boxer, an SUV's V8 (the rocket car's too), a rig's truck diesel, a tank's V12 diesel, a
                                   // helicopter's gas turbine
function engineVoices() { // renderRig, every frame: set again only when it changes
  const want = {};
  for (const p of rigged() ? progress.fortress.parts : []) {
    if (p.kind === 'engine' && live(p)) want[ENGINE_SOUND[p.from]] = Math.min(1, (want[ENGINE_SOUND[p.from]] ?? 0.2) + 0.2 * p.cells.length);
  }
  if (!rigSounds && Object.keys(want).some(n => !SOUNDS[n])) {
    rigSounds = true;
    document.head.append(Object.assign(document.createElement('script'), { src: 'assets/rig-sounds.js', onload: () => { heard = ''; } }));
  }
  const key = JSON.stringify(want) + !!ctx + rigSoundsIn(); // before the first click there is no sound to set
  if (key !== heard) { heard = key; setVoices(want); }
}
function quietRig() { heard = ''; setVoices({}); } // distance.js stop: leaving Distance

// a fortress's rams (car.js bump and headOn, damage.js hurt): a car crushed hurts the rig by the weight it carries
// against a car's; head-on, it rams through for HEADON% (the owner, 30 Oct: "about 20%"), before Armor plating
const HEADON = 20;
const plowHit = i => i.headOn ? HEADON : clamp(i.kmh * 0.25, 2, 25) * CAR_KG / engine.mass;

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
  fallen = fallen.filter(x => now - x.t < FALL);
  renderBoard();
  const ago = struck ? now - struck.t : Infinity, hit = $('fort-hit'); // the cell hit: amber on a part, red through to the rig
  hit.className = ago < 400 ? (struck.emp ? 'emp' : struck.part ? 'part' : 'rig') : ''; // a grenade's blast: blue
  if (ago < 400) Object.assign(hit.style, { left: `${struck.x * 100 / boardW()}%`, top: `${struck.y * 100 / boardH()}%`,
                                            opacity: (1 - ago / 400).toFixed(2) });
  markRockets();
  $('fort-drag').classList.toggle('armed', armed());
  $('fort-drag').classList.toggle('swap', !!dragging?.swaps?.length);
  if (throwing) {
    const held = (now - throwing.from) / THROW;
    if (held >= 1) throwOff(throwing.i);
    else $('fort-grid').querySelector(`[data-part="${throwing.i}"]`)?.style.setProperty('--held', held.toFixed(2));
  }
  $('cannon-pedal').classList.toggle('pressed', pedalDown || now - firedAt < 150);
  $('cannon-pedal').parentNode.classList.toggle('mounted', cannonOn());
  $('cannon-pedal').parentNode.classList.toggle('jammed', cannonOn() && !blocks('cannon')); // every cannon knocked out
  $('cannon-pedal').parentNode.classList.toggle('empty', progress.shells < 1);
  $('cannon-pedal').parentNode.style.setProperty('--reload', (1 - reloading / reloadTime()).toFixed(2));
  text('shell-count', bottomless() ? '∞' : String(progress.shells)); // debug mode: bottomless (distance.js save)
  text('cannon-label', autoCannon() ? 'AUTO' : 'FIRE'); // the Auto cannon fires for you, as AUTO on the guns' trigger
  const first = id => target?.seen && run.phase === 'run' && !progress.toured.includes(id); // the first one in sight
  if (target?.rig && first('rivals')) openTour('rivals', true);
  else if (target?.suv && first('pursuit')) openTour('pursuit', true);
  else if (target?.heli && first('heli')) openTour('heli', true);
  else if (target?.harpoon && first('harpoon')) openTour('harpoon', true);
  else if (target?.rocket && first('rockets')) openTour('rockets', true);
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
      touch: 'On the road, drag a part from the hold onto the board: it floats above your finger. Hold it still until ' +
        'it turns solid, then let go. Amber: what it covers is thrown off. Red: off the board. Parts never turn.',
      desk: 'On the road, drag a part from the hold onto the board with the mouse. Hold it still until it turns solid, ' +
        'then let go. Amber: what it covers is thrown off. Red: off the board. Parts never turn.' },
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
        'are for them. It holds the road ahead, and its War Boys throw grenades back at you.' },
    { title: 'JAMMED', at: '#board',
      both: "A grenade's blast knocks out the cannon, guns and engines it lands among, blue on the board: they do " +
        'nothing until you tap them, or for 10 s. Armor and spikes shrug it off.' },
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
  // on the road, the first hit on a part (strike); listed once seen
  { id: 'shield', name: 'The shield', open: () => rigged() && progress.toured.includes('shield'), pages: [
    { title: 'THE SHIELD', at: '#board',
      both: 'A hit lands on the board where it comes from: shells and head-ons on the front row, a ram on its side. A ' +
        'part there takes it; an empty cell lets it through to the rig.' },
    { title: 'WORN OUT', at: '#board',
      both: "The bigger a part, the more it takes, the tank's cannon most of all. Worn, it cracks, and repairs mend only " +
        'the rig: worn out, it falls off, gone for good.' },
  ] },
  // on the road, the first time a police helicopter is in the reticle (renderRig); listed once seen
  { id: 'heli', name: 'Police helicopters', open: () => rigged() && progress.toured.includes('heli'), pages: [
    { title: 'A HELICOPTER', at: '#ar',
      both: "The police's helicopter, in the reticle: the cannon's and the guns'. It hovers ahead and drops spike " +
        'strips in your way, again and again, until you bring it down.' },
    { title: 'ITS SEARCHLIGHT', at: '#board',
      both: 'Its light on a lane: a beat later a spike strip lies across it. Get off the lane in time, or the front of ' +
        "that column takes it and the rig slows, its tires torn." },
  ] },
  // on the road, the first time a harpoon truck is in the reticle (renderRig); listed once seen
  { id: 'harpoon', name: 'Harpoon trucks', open: () => rigged() && progress.toured.includes('harpoon'), pages: [
    { title: 'A HARPOON TRUCK', at: '#ar',
      both: "The rival gang's harpoon truck, in the reticle. It holds the road beside you, takes aim and harpoons a " +
        'part off your fortress, the one nearest its side.' },
    { title: 'ITS AIM', at: '#board',
      both: 'The part it aims at blinks on the board. Bring the truck down before it reels the part in, and the part ' +
        'falls on the road in a crate.' },
  ] },
  // on the road, the first time a rocket car is in the reticle (renderRig); listed once seen
  { id: 'rockets', name: 'Rocket cars', open: () => rigged() && progress.toured.includes('rockets'), pages: [
    { title: 'A ROCKET CAR', at: '#ar',
      both: "The army's rocket car, in the reticle. It holds the road ahead and fires a rocket every few seconds." },
    { title: 'ITS MARK', at: '#board',
      both: 'Where a rocket will land blinks red on the board. Change lanes before it comes down and the mark slides off ' +
        'the board with you: it misses.' },
  ] },
  // on the road, the first shot of the army's jeeps (jeepFire); listed once seen
  { id: 'jeeps', name: 'Jeeps', open: () => rigged() && progress.toured.includes('jeeps'), pages: [
    { title: 'JEEPS', at: '#board',
      both: "The army's jeeps come past you and back, their machine guns peppering the side of the board they are on. " +
        'Your raiders go after them, and a ram does for one.' },
  ] },
  // on the road, the first time a police SUV is in the reticle (renderRig); listed once seen
  { id: 'pursuit', name: 'Police SUVs', open: () => rigged() && progress.toured.includes('pursuit'), pages: [
    { title: 'A POLICE SUV', at: '#ar',
      both: "The police's pursuit SUV, armored: in the reticle, and rams barely scratch it. It comes at you head-on, " +
        'flat out: shoot it, or get out of its way. Missed, it turns and comes again.' },
  ] },
);
