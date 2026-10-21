// Distance: an incremental game. Each run gives you a few seconds to get as far as you can from a standing start;
// the metres driven are the money for upgrades in the garage between runs. Rules, saved progress, and its own
// screens: the garage and the run read-out on the head-up display.

// upgrade costs follow the usual incremental-game curve (Cookie Clicker, Hill Climb Racing): level n costs
// base · growth^n. info(level) describes what the car has at that level; needs: upgrades it builds on.
// tab: the garage page it is on, see PAGES; max can depend on
// progress (then locked says why there is no more yet); gate(level) can hold the next level back with a reason;
// built: how many levels count towards the car being built (headStart in race.js), when not all of them; afterReveal:
// on sale (and shown) only once the race is revealed, so it doesn't hold up the first act.
const UPGRADES = {
  power:  { name: 'Power', max: 10, base: 80, growth: 1.55, info: l => `+${12 * l}% torque` },
  rev:    { name: 'Rev limit', max: 4, base: 150, growth: 2, info: l => `${limiter(engine, l)} rpm` },
  gears:  { name: 'Gearbox', max: 3, base: 250, growth: 2.5, info: l => `${3 + l} gears` },
  tyres:  { name: 'Tyres', max: 4, base: 400, growth: 1.8, info: l => `${tyreGrip(l).toFixed(1)} g grip: launches and braking` },
  time:   { name: 'Time', max: 6, base: 200, growth: 1.9, info: l => `${runTime(l)} s a run` },
  steering: { name: 'Steering', max: 3, base: 300, growth: 2, info: l => l ? `lane changes ${40 * l}% quicker` : 'stock rack' },
  flash:  { name: 'Headlight flash', max: 10, base: 300, growth: 1.25, built: 1,
            info: l => `${l} flash${l === 1 ? '' : 'es'} a run. F or the stalk left of the wheel: the car ahead in your lane moves over (racers won't)` },
  // after the reveal: on sale before it, it took the metres the car needed, and the white car fell 3 to 10 runs later
  // (tests/balance/act1.py, cheapest and value)
  flashRecharge: { name: 'Flash recharge', max: 5, base: 2500, growth: 1.5, built: 0, afterReveal: true, needs: ['flash'],
                   gate: () => lvl('flash') >= UPGRADES.flash.max || `needs ${UPGRADES.flash.max} flashes`,
                   info: l => l ? `a flash back every ${rechargeTime(l)} s` : 'a flash used is gone for the run' },
  autoflash: { name: 'Auto flash', tab: 'autopilot', max: 1, base: 2000, needs: ['flash'], gate: () => lvl('flash') >= 5 || 'needs 5 flashes',
               info: () => 'flashes slower cars ahead for you, and changes lanes round racers instead' },
  clutch: { name: 'Auto clutch', tab: 'autopilot', max: 1, base: 700, info: () => 'works the clutch: no stalls' },
  gas:    { name: 'Auto gas', tab: 'autopilot', max: 1, base: 800, info: () => 'launch and traction control' },
  shift:  { name: 'Auto shift', tab: 'autopilot', max: 1, base: 2500, needs: ['clutch'], info: () => 'changes gear at the limiter' },
  steer:  { name: 'Lane assist', tab: 'autopilot', max: 1, base: 1500, info: () => 'swerves round a car you are about to hit' },
  cruise: { name: 'Autocruise', tab: 'autopilot', max: 1, base: 6000, needs: ['steer', 'gas', 'shift'],
            info: () => 'drives the whole run: passes, keeps right, brakes when boxed in' },
  stereo: { name: 'Car stereo', max: 1, base: 500, built: 0, // stereo.js; no use for speed, so not part of building the car
            info: () => 'synthwave on five tapes: tap the lights in the cluster (or M) for the next, or off' },
  engine: { name: 'Engine swap', max: ENGINES.length - 1, base: 4000, growth: 2.5, info: l => ENGINES[l].name },
};
const COUNTDOWN = 3, FINISH = 2; // seconds of countdown before a run, and of braking after it

const lvl = id => progress.levels[id] ?? 0;
const limiter = (e, l = lvl('rev')) => e.stock.redline - 600 * (UPGRADES.rev.max - l); // fully upgraded: stock
const tyreGrip = (l = lvl('tyres')) => 0.8 + 0.1 * l;
const runTime = (l = lvl('time')) => 20 + 5 * l;
const rechargeTime = (l = lvl('flashRecharge')) => 12 - 2 * l; // s for a used flash to come back
const topGear = () => 3 + lvl('gears') + lvl('gear7');

function applyUpgrades() { // the garage's work on the engines and the car, and the damage the car has taken
  for (const e of ENGINES) {
    e.drive = e.stock.drive * (1 + 0.12 * lvl('power') + 0.08 * lvl('ecuPower')) * (wrecked() ? 0.3 : 1); // ECU tune on top
    e.redline = Math.max(e.idle + 1500, limiter(e) + 300 * lvl('ecuRev') - revLoss()); // damage: still drivable
  }
  CAR.grip = tyreGrip();
  openLanes = lvl('reckless') ? ROAD_LANES.length : MY_LANES.length;
  chicken = lvl('chicken') > 0; // a flash moves oncoming cars too
  steering = 1 + 0.4 * lvl('steering');
  bullBar = lvl('bullbar');
  spikes = lvl('spikes') > 0;
  brokenGears = damageOn() ? progress.broken : [];
}

// ---- saved progress (localStorage; the game still works without it, it just won't remember) ----
const SAVE_KEY = 'car-rev-incremental';
// off: aids switched off; racing: the race has been revealed; points: race points; finish: best finishing position;
// damage: % (damage.js), broken: gears it broke; nitro: seconds in the tank; miles: the Fleet's money; parts: Mad
// Max's, from totals: cars totalled (gang.js); wanted: police heat, 0 to 1 (police.js); tanks: tanks beaten (boss.js);
// tape: the one in the stereo (stereo.js); time: seconds played, driven: metres in all, races: runs raced (the
// menu's STATS)
const FRESH = () => ({ bank: 0, best: 0, runs: 0, levels: {}, off: {}, engine: 0, racing: false, points: 0, finish: 101,
                       damage: 0, broken: [], nitro: 0, miles: 0, parts: 0, totals: 0, wanted: 0, tanks: 0, tape: 0,
                       time: 0, driven: 0, races: 0, seen: [], toured: [] }); // seen: upgrades seen unlocked (the tabs' !);
                                                                             // toured: tutorials popped up (tutorial.js)
// debug mode (main.js) plays a save of its own, with wallets that never run out, so testing never touches the game
const FUNDS = 1e9;
let debugSave = false;
const saveKey = () => debugSave ? SAVE_KEY + '-debug' : SAVE_KEY;
const progress = Object.assign(FRESH(), load());
function load() { try { return JSON.parse(localStorage.getItem(saveKey())) ?? {}; } catch { return {}; } }
function save() {
  if (debugSave) progress.bank = progress.points = progress.miles = progress.parts = FUNDS; // spent or earned, back to full
  try { localStorage.setItem(saveKey(), JSON.stringify(progress)); } catch { /* not saved */ }
}
const forgetRun = () => Object.assign(run, { gain: 0, race: null, revealed: false, won: false, dues: 0, parts: 0, totals: 0,
                                             firstTotal: false, boss: false, tank: null, beatTank: false, newBest: false, best: 0 });
function resetProgress() { // a new game: the menu's "new game"
  Object.assign(progress, FRESH());
  save();
  forgetRun();
}
function useDebugSave(on) { // switch saves; the first debug save starts as a copy of the game
  debugSave = on;
  let kept = null;
  try { kept = localStorage.getItem(saveKey()); } catch { /* none */ }
  if (kept !== null || !on) Object.assign(progress, FRESH(), load());
  if (on) save(); // the wallets filled; switched off, the game's own save is left as it is
  forgetRun();
}
const money = n => debugSave ? '∞' : fmt(n); // a debug wallet shows as bottomless

// the garage's pages: the car itself and the robot driver, paid in metres; the illegal and forbidden, paid in race
// points, open once the race is revealed (race.js fills it); the Fleet, paid in miles, open once you have won a race
// (fleet.js); War Rig, paid in parts, open once you have totalled a car (gang.js). Each page's currency: the key in
// progress, and its unit
const PAGES = [['workshop', 'Workshop'], ['autopilot', 'Autopilot'], ['black', 'Black market'], ['fleet', 'Fleet'],
               ['warrig', 'War Rig']];
const WALLETS = { workshop: 'bank', autopilot: 'bank', black: 'points', fleet: 'miles', warrig: 'parts' };
const UNITS = { bank: 'm', points: 'pts', miles: 'mi', parts: 'parts' };
const pageOpen = id => id === 'black' ? progress.racing : id === 'fleet' ? fleetOpen() : id === 'warrig' ? gangOpen() : true;
const fleetOpen = () => progress.finish === 1;
const pageOf = u => u.tab ?? 'workshop';
const wallet = u => WALLETS[pageOf(u)];     // which of progress's currencies it costs
const inMetres = u => wallet(u) === 'bank';
const price = (id, n) => `${fmt(n)} ${UNITS[wallet(UPGRADES[id])]}`;
const maxOf = u => typeof u.max === 'function' ? u.max() : u.max;
function cost(id) {
  const u = UPGRADES[id], step = inMetres(u) ? 10 : 1; // metres in round tens, the rest one by one
  return Math.max(step, Math.round(u.base * (u.growth ?? 1) ** lvl(id) / step) * step);
}
function whyNot(id) { // reason an upgrade can't be bought now, or '' if it can
  const u = UPGRADES[id], l = lvl(id);
  if (u.afterReveal && !progress.racing) return 'after the reveal'; // never shown: the card is left out
  if (l >= maxOf(u)) return u.locked && l < FIELD ? u.locked : 'max';
  const missing = u.needs?.find(n => !lvl(n));
  if (missing) return `needs ${UPGRADES[missing].name}`;
  const gate = u.gate?.(l);
  if (typeof gate === 'string') return gate;
  return progress[wallet(u)] < cost(id) ? 'short' : '';
}
// a card is locked while none of it is bought and something else comes first: it shows only its name and what that is.
// A tab gets a yellow ! while it has an upgrade unlocked that you haven't looked at yet (the owner, 14 Oct)
const isLocked = id => !lvl(id) && !['', 'short', 'max'].includes(whyNot(id));
const unseen = id => !isLocked(id) && !progress.seen.includes(id);
function buy(id) {
  if (whyNot(id)) return false;
  progress[wallet(UPGRADES[id])] -= cost(id);
  progress.levels[id] = lvl(id) + 1;
  if (id === 'engine') progress.engine = lvl(id); // drive the new engine straight away
  save();
  return true;
}

// a driver aid works while bought, switched on and a run is under way, and only with the aids it builds on working
function aid(id) {
  if (!lvl(id) || progress.off[id] || (run.phase !== 'countdown' && run.phase !== 'run')) return false;
  return (UPGRADES[id].needs ?? []).every(aid);
}

// ---- a run ----
// phase: 'garage' -> 'starting' (engine cranks) -> 'countdown' (car held on the brake) -> 'run' -> 'finish'
// (braking, the score is in) -> 'garage'. best: the best distance before this run, marked on the road.
const run = { phase: 'garage', count: 0, left: 0, best: progress.best, gain: 0, newBest: false };

function startRun() { // back to the start line, engine running, in neutral, held on the brake
  Object.assign(run, { phase: 'starting', count: COUNTDOWN, left: runTime(), best: progress.best, gain: 0, newBest: false,
                       slot: progress.racing ? startSlot() : null, race: null, revealed: false, won: false, parts: 0, totals: 0,
                       firstTotal: false, boss: bossRace(), tank: null, beatTank: false, limp: wrecked(),
                       flashes: lvl('flash'), recharge: 0 });
  resetScene();
  brakePedal = 1;
  coolDown();
  copClock = copEvery(); // police.js: the first police car after a while
  run.refill = run.limp ? 0 : refillNitro(); // limping: keep the metres for the repair
}

function finishRun(dnf) { // dnf: why the run ended early (a crash), if it did
  run.gain = Math.floor(odo);
  run.newBest = run.gain > progress.best;
  progress.bank += run.gain;
  progress.best = Math.max(progress.best, run.gain);
  progress.runs++;
  progress.driven += run.gain;
  const was = progress.finish;
  run.race = raceFinish(bossLost(dnf)); // boss.js: a boss race lost is a DNF
  if (run.race) progress.races++;
  run.dues = fleetDues(); // fleet.js
  progress.bank += run.dues;
  run.won = was > 1 && progress.finish === 1; // the first win opens the Fleet
  save();
  Object.assign(run, { phase: 'finish', count: FINISH });
  nitro = false;
  gasPedal = 0; clutchPedal = 1; brakePedal = 1;
}

function updateRun(dt) {
  progress.time += dt; // played, garage included (the menu pauses it)
  if (run.phase === 'starting' || run.phase === 'countdown') { speed = odo = 0; holdRacers(); } // held at the line
  if (run.phase === 'starting' && state === 'running') run.phase = 'countdown';
  else if (run.phase === 'countdown' && (run.count -= dt) <= 0) { run.phase = 'run'; brakePedal = 0; raceGo(); }
  else if (run.phase === 'run' && (run.left -= dt) <= 0) { run.left = 0; finishRun(); }
  else if (run.phase === 'finish' && (run.count -= dt) <= 0) run.phase = 'garage';
  run.still = run.phase === 'run' && speed < 1 ? (run.still ?? 0) + dt : 0; // s standing still in the run (stuck?)
  if (run.phase === 'run' && raceTick()) run.revealed = true;
  if (run.phase === 'run') { rechargeFlash(dt); updateGang(dt); updatePolice(dt); updateBoss(); }
  if (run.phase === 'run' && damageOn()) damageTick(dt);
  if (run.phase === 'run' && run.limp && odo >= LIMP) finishRun('limped'); // as far as a wreck gets
}

// flash recharge: a used flash comes back after a while, up to the run's full count
function rechargeFlash(dt) {
  if (!lvl('flashRecharge') || run.flashes >= lvl('flash')) { run.recharge = 0; return; }
  if ((run.recharge += dt) >= rechargeTime()) { run.recharge = 0; run.flashes++; }
}

// a collision (once you drive recklessly): damage; a head-on, or the damage that wrecks the car, ends the run. A
// head-on with a mad driver (Fuel madness) doesn't: it hurts as much, and the mad car is totalled
function onCollision(i) {
  if (run.phase !== 'run') return;
  if (arOn()) ram(i); // gang.js: the car you hit takes it too
  if (i.mad) total(i.car, false, 'HEAD-ON!'); // gang.js
  if (!damageOn()) return;
  hurt(i.kmh, i.headOn);
  if (i.mad) { if (wrecked() && !run.limp) finishRun('wrecked'); return; }
  if (i.headOn) finishRun('head-on'); else if (wrecked() && !run.limp) finishRun('wrecked');
}

// things beside the road: a board every 100 m and a banner at the best distance so far
function roadMarks() {
  const marks = [];
  for (let m = Math.max(100, Math.ceil(odo / 100) * 100); m < odo + 1500; m += 100) marks.push({ z: m, kind: 'board', value: m });
  if (run.best) marks.push({ z: run.best, kind: 'best', value: run.best });
  return marks;
}

// the Fleet's Exchange: metres for miles, one way
const MILE = 1609; // m
let exchange = 0;  // miles on its slider
const canExchange = () => Math.floor(progress.bank / MILE);
function convert(mi) {
  mi = Math.min(mi, canExchange());
  if (mi <= 0) return false;
  progress.bank -= mi * MILE;
  progress.miles += mi;
  exchange = 0;
  save();
  return true;
}
const exchangeLabel = () => `${fmt(exchange)} mi for ${fmt(exchange * MILE)} m`;
function exchangeCard() {
  const can = canExchange();
  exchange = Math.min(exchange, can);
  return `<div class="card exchange"><b>Exchange</b><small>metres for miles, one way: ${fmt(MILE)} m a mile · ` +
    `${money(progress.miles)} mi to spend</small><input type="range" id="exchange" min="0" max="${can}" value="${exchange}">` +
    `<span><button data-exchange${exchange ? '' : ' disabled'}>${exchangeLabel()}</button> ` +
    `<button data-exchange-all${can ? '' : ' disabled'}>all available · ${money(can)} mi</button></span></div>`;
}

// ---- the act cards (the owner, 21 Oct: nobody read the words on top of the garage) ----
// A title card as each act starts, in the ending's look: what the act is about and what to do. The last act has two
// more, without a number, at its turns: the first total, and the tank. Each pops up once, before any tutorial that
// opens with it: they ride first in the tutorials' list (tutorial.js). The pause menu and the garage's title show the
// current one again, with where you stand and the last run in full; the garage keeps a line of the run's numbers
TUTORIALS.unshift(
  { id: 'act1', act: 'I', name: 'DRIVE', open: () => true,
    text: () => `You get ${runTime()} seconds a run. Drive as far as you can: every metre is money for upgrades in the ` +
      'garage. New to a stick shift? HOW TO DRIVE takes you through it.' },
  { id: 'act2', act: 'II', name: 'RACE', open: () => progress.racing,
    text: () => 'That quick car was racer #100. You are in a race of a hundred: every run is a race now, and your place ' +
      'when the time runs out pays race points, more for a place reached the first time. The Black market takes them.',
    now: () => progress.finish <= FIELD ? `Your best place: P${progress.finish}.` : '' },
  { id: 'act3', act: 'III', name: 'RECRUIT', open: () => fleetOpen(),
    text: () => 'P1! The racers you beat are open to offers. Pay them off in miles, on the Fleet page, and they race ' +
      'for you, in your colours.',
    now: () => `${fleetSize() || 'None'} of the field race${fleetSize() === 1 ? 's' : ''} for you.` },
  { id: 'act4', act: 'IV', name: 'WAR', open: () => arOn(),
    text: () => `${GANG} of the field race for you: your fleet is a gang now. Its first job for you: total a car.`,
    now: () => 'Ram the car in the reticle until its health bar is empty.' },
  { id: 'nolaw', name: 'NO LAW OUT HERE', open: () => gangOpen(),
    text: () => 'Totalled! No law out here any more. The gang is yours, and your car becomes a war rig: the War Rig page ' +
      'is open, paid in parts.',
    now: () => progress.wanted >= 1 ? `Police heat 100%: the army has a tank ready for when you are ${lvl('guns') ? 'repaired' : 'armed'}.`
      : `Every car totalled raises the police heat, now ${heatPct()}. At 100% the army sends a tank` +
        (lvl('guns') ? '.' : ', once you have guns.') },
  { id: 'tanksent', name: 'THE ARMY SENDS A TANK', open: () => bossRace() || progress.tanks > 0,
    text: () => 'Police heat 100%: the army has sent a tank. It is waiting up the road: outgun it, with the gang.',
    now: () => bossRace() ? '' : `The tank is scrap and the road is yours (${progress.tanks} beaten). Push the heat ` +
      `to 100% again, now ${heatPct()}, and the next one is tougher.` },
);
const heatPct = () => `${Math.round(progress.wanted * 100)}%`;
const CARDS = TUTORIALS.filter(t => t.text);
const currentCard = () => CARDS.findLast(c => c.open());
const actTitle = () => { const a = CARDS.findLast(c => c.act && c.open()); return `ACT ${a.act} · ${a.name}`; };
const dnf = r => ({ 'head-on': 'head-on with oncoming traffic', wrecked: 'the car is wrecked', limped: `limped ${LIMP} m in the wreck`,
                     tank: 'the tank held the road' })[r.dnf]; // why a race wasn't finished
// the last run, in a line of numbers at the top of the garage (none before the first, nor after a reload)
function runLine() {
  const r = run.race;
  if (!run.gain && !r) return '';
  return [`<b>+${fmt(run.gain)} m</b>${run.newBest ? ' new best!' : ''}`,
    r && (r.dnf ? `<b>DNF</b> ${dnf(r)}` : `<b>P${r.p}</b> +${r.points} pts`),
    run.dues && `fleet dues +${fmt(run.dues)} m`, run.refill && `nitro refill −${fmt(run.refill)} m`,
    run.totals && `totalled ${run.totals}, +${fmt(run.parts)} parts`, run.beatTank && `the tank scrapped, +${TANK.parts} parts`,
    arOn() && `police heat ${heatPct()}`]
    .filter(Boolean).join(' · ');
}
// ... and in full, on the act card: the run, then where you stand
function runRows() {
  const r = run.race, rows = [];
  if (run.gain || r) rows.push(['Last run', `+${fmt(run.gain)} m${run.newBest ? ', a new best' : ''}`]);
  if (r) rows.push(['Race', r.dnf ? `DNF: ${dnf(r)}` : `${r.start > FIELD ? 'from the back' : 'from P' + r.start} to P${r.p}`],
    ['Points', `+${r.points}` + (r.fresh ? ` (${r.fresh} for new places)` : '')]);
  if (run.dues) rows.push(['Fleet dues', `+${fmt(run.dues)} m`]);
  if (run.refill) rows.push(['Nitro refill', `−${fmt(run.refill)} m`]);
  if (run.totals) rows.push(['Totalled', `${run.totals}, +${fmt(run.parts)} parts`]);
  if (run.beatTank) rows.push(['The tank', `scrapped, +${TANK.parts} parts`]);
  if (progress.runs) rows.push(['Best run', `${fmt(progress.best)} m`]);
  if (arOn()) rows.push(['Police heat', heatPct()]);
  return rows;
}
let card = null; // the act card up (main.js shows it)
function openCard(id) {
  card = CARDS.find(c => c.id === id);
  if (menuOpen) showScreen('act'); else openMenu('act');
}
function renderCard() {
  $('act-no').textContent = card.act ? `ACT ${card.act}` : '';
  $('act-name').textContent = card.name;
  $('act-text').textContent = card.text();
  $('act-now').textContent = card.now?.() ?? '';
  $('act-run').innerHTML = runRows().map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  $('act-drive').hidden = card.id !== 'act1';
  $('act-go').textContent = screenFrom.length ? '◀ BACK' : 'CONTINUE ▶';
}
// back where it came from (the pause menu), or, popped up or opened from the garage, on to the garage, and the next
// card or tutorial the same run brought
function closeCard() {
  if (screenFrom.length) return showScreen(screenFrom.pop(), true);
  closeMenu();
  popTour();
}

// ---- garage ----
let garageTab = 'workshop';
function renderGarage(bought) {
  if (!pageOpen(garageTab)) garageTab = 'workshop';
  $('bank').textContent = `${money(progress.bank)} m` + (progress.racing ? ` · ${money(progress.points)} pts` : '') +
    (fleetOpen() ? ` · ${money(progress.miles)} mi` : '') + (gangOpen() ? ` · ${money(progress.parts)} parts` : '') + ' to spend';
  const sold = u => !u.afterReveal || progress.racing; // on sale yet
  $('act-title').textContent = `${actTitle()} ▸`;
  $('report').innerHTML = runLine();
  const onPage = page => Object.keys(UPGRADES).filter(id => id !== 'engine' && pageOf(UPGRADES[id]) === page && sold(UPGRADES[id]));
  const fresh = onPage(garageTab).filter(unseen); // on the page you're looking at: seen now
  if (fresh.length) { progress.seen.push(...fresh); save(); }
  $('tabs').innerHTML = PAGES.filter(([id]) => pageOpen(id)).map(([id, name]) => `<button data-tab="${id}" class="` +
    `${id === garageTab ? 'on' : ''}${onPage(id).some(unseen) ? ' new' : ''}">${name}</button>`).join('');
  $('engine-row').hidden = garageTab !== 'workshop';
  $('engine-row').innerHTML = ENGINES.map((e, i) => i <= lvl('engine')
    ? `<button data-engine="${i}"${i === progress.engine ? ' class="on"' : ''}>${e.name}</button>`
    : i === lvl('engine') + 1
      ? `<button data-buy="engine"${whyNot('engine') ? ' disabled' : ''}>${e.name} · ${fmt(cost('engine'))} m</button>`
      : `<button disabled>${e.name} · locked</button>`).join('');
  const onTab = ([id, u]) => id !== 'engine' && pageOf(u) === garageTab && sold(u);
  const d = progress.damage;
  $('drive').textContent = wrecked() ? `LIMP ${LIMP} m ▶` : 'DRIVE ▶'; // a wreck can always limp: no dead end
  const repairCard = garageTab === 'workshop' && d > 0 ? `<div class="card repair"><b>Repair</b><small>${Math.round(d)}% damage · ` +
    `rev limit −${fmt(revLoss())} rpm${progress.broken.length ? ` · broken: ${progress.broken.map(ordinal).join(', ')}` : ''}</small>` +
    `<button data-repair${progress.bank >= REPAIR ? '' : ' disabled'}>${progress.bank >= repairCost() ? 'Repair all' : 'Repair what I can'}` +
    ` · ${fmt(Math.min(repairCost(), Math.floor(progress.bank / REPAIR) * REPAIR))} m</button></div>` : '';
  $('cards').innerHTML = repairCard + (garageTab === 'fleet' ? exchangeCard() : '') + Object.entries(UPGRADES).filter(onTab).map(([id, u]) => {
    if (isLocked(id)) return `<div class="card locked"><b>${u.name}</b><small>${whyNot(id)}</small></div>`;
    const l = lvl(id), why = whyNot(id), max = maxOf(u), steps = typeof u.max === 'function' ? 0 : max;
    const pips = steps > 1 ? `<i>${'■'.repeat(l)}${'□'.repeat(steps - l)}</i>` : '';
    const info = max > 1 || steps === 0 ? u.info(l) + (why !== 'max' && !why.startsWith('finish') ? ` → ${u.info(l + 1)}` : '') : u.info();
    const toggle = u.needs?.some(n => progress.off[n]) ? `<button disabled>needs ${UPGRADES[u.needs.find(n => progress.off[n])].name} on</button>`
      : `<button data-toggle="${id}"${progress.off[id] ? '' : ' class="on"'}>${progress.off[id] ? 'OFF' : 'ON'}</button>`;
    const button = why === u.locked ? `<button disabled>${why}</button>` : why === 'max' ? (u.max !== 1 && !u.toggle ? '<button disabled>MAX</button>' : toggle)
      : why.startsWith('needs') ? `<button disabled>${why}</button>`
      : `<button data-buy="${id}"${why ? ' disabled' : ''}>${price(id, cost(id))}</button>` +
        (steps === 0 && !why ? `<button data-max="${id}">all I can</button>` : '') + // the grid: many slots at once
        (u.toggle && l ? toggle : ''); // a switch with more levels to buy (Fuel madness)
    const tip = l && tourFor(id) ? `<button class="tip" data-tour="${tourFor(id)}" title="how it works">?</button>` : ''; // once bought
    return `<div class="card${id === bought ? ' bought' : ''}"><b>${u.name}</b>${tip}${pips}<small>${info}</small>${button}</div>`;
  }).join('');
}

$('garage').onclick = e => {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  loading ??= start(); // any click is a user gesture: audio can start
  const { buy: id, engine: i, toggle, tab, max } = b.dataset;
  if (b.dataset.tour) return openTour(b.dataset.tour, true); // a card's ?: its tutorial (tutorial.js)
  if (b.id === 'act-title') return openCard(currentCard().id); // the act: what to do
  if (id) markTours(); // what is open before it (tutorial.js)
  if (id && buy(id)) { beep(1760, 0.08); refreshCar(); popTour(); }
  if (max) { while (buy(max)); beep(1760, 0.08); }
  if (tab) garageTab = tab;
  if ('repair' in b.dataset && repair()) { beep(1320, 0.1); refreshCar(); }
  if (('exchange' in b.dataset || 'exchangeAll' in b.dataset) && convert('exchange' in b.dataset ? exchange : Infinity)) beep(1760, 0.08);
  if (i) { progress.engine = +i; save(); refreshCar(); }
  if (toggle) { progress.off[toggle] = !progress.off[toggle]; save(); }
  if (b.id === 'drive') return drive();
  renderGarage(id ?? max);
};

$('garage').oninput = e => { // the Exchange's slider: only its button changes, so the drag carries on
  if (e.target.id !== 'exchange') return;
  exchange = +e.target.value;
  const b = $('garage').querySelector('[data-exchange]');
  b.textContent = exchangeLabel();
  b.disabled = !exchange;
};

function drive() {
  markTours(); // what is open before the run: a system it brings pops its tutorial up after (tutorial.js)
  startRun();
  passedBest = shownReveal = false;
  startEngine(); // the key turns itself
}

// the tapes the stereo plays (stereo.js): the War Rig radio's while it is bought and switched on (gang.js), or synthwave
const onRadio = () => TAPES.filter(t => !!t.war === (lvl('warradio') > 0 && !progress.off.warradio));

// ---- head-up display: the run ----
let shownPhase, shownCount, passedBest = false, shownReveal = false;
function renderRun() {
  if (run.phase !== shownPhase) { // a new phase starts
    if (run.phase === 'run') { flash('GO!', '#5f5', true); beep(1320, 0.5); }
    if (run.phase === 'finish') { flash(run.beatTank ? 'TANK DOWN!' : 'TIME!', '#ec4', true); beep(880, 0.8); }
    if (run.phase === 'garage') renderGarage();
    if (run.phase === 'garage' && run.beatTank) openMenu('win'); // the tank burning, then the ending (main.js)
    else if (run.phase === 'garage') popTour(); // a system new this run: its tutorial (tutorial.js)
    document.body.classList.toggle('garage', run.phase === 'garage');
    shownPhase = run.phase;
  }
  if (run.phase === 'countdown' && Math.ceil(run.count) !== shownCount) { // 3, 2, 1
    shownCount = Math.ceil(run.count);
    flash(shownCount, '#fff', true);
    beep(660, 0.15);
  }
  if (run.revealed && !shownReveal) { shownReveal = true; flash("IT'S A RACE!", '#ec4', true); beep(1760, 0.6); }
  if (run.phase === 'run' && run.best && odo >= run.best && !passedBest) {
    passedBest = true;
    flash('NEW BEST!', '#5f5', true);
  }
  const [dist, info] = {
    starting: ['', 'starting the engine…'],
    countdown: ['GET READY', [!aid('clutch') && 'clutch down', !aid('shift') && '1st gear', !aid('gas') && 'gas']
      .filter(Boolean).join(' · ') || 'sit back: the car does it all'],
    run: stuck() ? nextStep()
      : run.limp ? ['LIMP MODE', `${Math.floor(odo)} of ${LIMP} m`] // the time left is in the mirror
      : progress.racing ? [`P${position()}`, `${fmt(odo)} m` + gaps()]
      : [`${fmt(odo)} m`, run.best ? `best ${fmt(run.best)} m` : ''],
    finish: run.beatTank ? ['TANK DOWN', 'the road is yours'] // boss.js: the tank destroyed
      : run.race?.dnf ? ['DNF', run.race.dnf]
      : run.race ? [`P${run.race.p}`, `+${run.race.points} pts · ${fmt(run.gain)} m`]
      : [`${fmt(run.gain)} m`, run.newBest ? 'new best!' : 'time'],
  }[run.phase] ?? ['', ''];
  $('run-dist').textContent = dist;
  $('run-info').textContent = info;
  document.body.classList.toggle('timing', run.phase !== 'garage');
  $('timer-fill').style.width = `${97 * run.left / runTime()}%`;
  $('timer-left').textContent = run.left.toFixed(1);
  document.body.classList.toggle('low', run.phase === 'run' && run.left < 5);
  document.body.classList.toggle('has-flash', lvl('flash') > 0 && !progress.off.flash);
  $('hud-flashes').textContent = run.phase === 'garage' ? lvl('flash') : run.flashes;
  $('hud-beam').classList.toggle('empty', run.phase !== 'garage' && !run.flashes);
  $('hud-beam').style.setProperty('--charge', run.phase === 'run' ? run.recharge / rechargeTime() : 0); // the refill
}

// stalled, or standing still for 1.5 s in a run: the windscreen says what to do next, in the words of the layout you
// drive with, until the car moves (the playtests of 18 Oct: one player couldn't get off the start line for three runs,
// another skipped the first run's how-to). Nothing to say when the aids do it all
const stuck = () => (state === 'off' || run.still > 1.5) && !!nextStep();
function nextStep() {
  const touch = touchLayout(), clutchDown = aid('clutch') || clutch <= 0.3;
  if (state === 'off') return ['START THE ENGINE', touch ? 'hold the key at START' : 'Enter, or the key to START'];
  if (gear !== 1 && !aid('shift')) return !clutchDown ? ['CLUTCH DOWN', touch ? 'the left pedal, all the way' : 'hold Shift']
    : ['INTO 1ST', touch ? 'drag the knob into 1' : gear ? '↓ down to 1st' : '↑ for 1st'];
  if (!aid('gas') || !aid('clutch')) return ['GAS, CLUTCH UP', [!aid('gas') && (touch ? 'gas pedal' : 'hold Space'),
    !aid('clutch') && (touch ? 'ease the clutch pedal up' : 'let Shift go')].filter(Boolean).join(', then ')];
  return null;
}

function gaps() { // the racers just ahead and just behind you
  const { front, back } = nearestRacers(), m = c => Math.round(Math.abs(c.z - odo));
  return (front ? ` · #${front.racer} ${m(front)} m ahead` : '') + (back ? ` · #${back.racer} ${m(back)} m behind` : '');
}

const DISTANCE = {
  id: 'distance', name: 'Distance', hud: 'run',
  blurb: 'A few seconds to get as far as you can. Every metre buys upgrades: power, gears, time, driver aids.',
  gears: topGear,
  engine: () => progress.engine, // the garage's engines, not the menu's
  tune: applyUpgrades,
  madness: () => run.phase === 'run' && !progress.off.baddrivers ? madShare(lvl('baddrivers')) : 0, // gang.js
  start() { // a new game: its first act's card pops up, alone
    Object.assign(run, { phase: 'garage', best: progress.best }); shownPhase = null;
    if (!progress.runs) markTours('act1');
  },
  pause: () => save(), // the menu opened: the time played so far is kept
  endRun() { if (run.phase === 'run') finishRun(); }, // the pause menu's END RUN: as if the time ran out
  stats() { // STATS and SHARE: an act's numbers only once it is open (never a word of the race before the reveal)
    const time = Math.floor(progress.time / 60), s = [['Time played', time < 60 ? `${time} min` : `${Math.floor(time / 60)} h ${time % 60} min`],
      ['Runs', fmt(progress.runs)], ['Best run', `${fmt(progress.best)} m`], ['Distance driven', `${fmt(progress.driven)} m`]];
    if (progress.racing) s.push(['Races', fmt(progress.races)], ['Best place', `P${progress.finish}`]);
    if (fleetOpen()) s.push(['Fleet', `${fleetSize()} cars`]);
    if (gangOpen()) s.push(['Cars totalled', fmt(progress.totals)]);
    if (progress.tanks) s.push(['Tanks beaten', fmt(progress.tanks)]);
    return s;
  },
  stop() { run.phase = 'garage'; document.body.classList.remove('garage', 'low', 'has-flash', 'timing', 'has-fleet', 'ar-on', 'has-guns', 'has-heat'); clearDamageView(); }, // earns nothing
  update: updateRun,
  render() { renderRun(); renderDamage(); renderSonar(); renderGang(); renderPolice(); },
  crash: i => onCollision(i),
  marks: roadMarks,
  useFlash() { // a charge from this run's flashes
    if (run.phase !== 'run' || progress.off.flash || !run.flashes) return false;
    run.flashes--;
    return true;
  },
  speedo: () => lvl('gear7') ? 540 : 360,
  stereo: () => lvl('stereo') > 0,
  tape: () => progress.off.stereo ? null : TAPES.indexOf(onRadio()[progress.tape] ?? onRadio()[0]),
  nextTape(round) { // through the tapes, then off; a tap when off plays the first. The garage's ON/OFF is the same
    if (!lvl('stereo')) return;    // switch. round: a tape ended, so the next plays, round to the first
    const n = onRadio().length, at = progress.tape < n ? progress.tape : 0; // the one playing (the radios differ in length)
    if (progress.off.stereo) progress.off.stereo = false;
    else if (at < n - 1) progress.tape = at + 1;
    else if (round) progress.tape = 0;
    else Object.assign(progress, { tape: 0, off: { ...progress.off, stereo: true } }); // rewound for next time
    save();
    if (run.phase === 'garage') renderGarage();
  },
  field: () => raceField(), // race.js loads after this file
  key(k) { if (k === 'Enter' && run.phase === 'garage') { drive(); return true; } }, // Enter in the garage: DRIVE
};
