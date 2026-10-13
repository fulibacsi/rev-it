// Distance: an incremental game. Each run gives you a few seconds to get as far as you can from a standing start;
// the metres driven are the money for upgrades in the garage between runs. Rules, saved progress, and its own
// screens: the garage and the run read-out on the head-up display.

// upgrade costs follow the usual incremental-game curve (Cookie Clicker, Hill Climb Racing): level n costs
// base · growth^n. info(level) describes what the car has at that level; needs: upgrades it builds on.
// tab: the garage page it is on, see PAGES; max can depend on
// progress (then locked says why there is no more yet); gate(level) can hold the next level back with a reason;
// built: how many levels count towards the car being built (headStart in race.js), when not all of them.
const UPGRADES = {
  power:  { name: 'Power', max: 10, base: 80, growth: 1.55, info: l => `+${12 * l}% torque` },
  rev:    { name: 'Rev limit', max: 4, base: 150, growth: 2, info: l => `${limiter(engine, l)} rpm` },
  gears:  { name: 'Gearbox', max: 3, base: 250, growth: 2.5, info: l => `${3 + l} gears` },
  tyres:  { name: 'Tyres', max: 4, base: 400, growth: 1.8, info: l => `${tyreGrip(l).toFixed(1)} g grip` },
  time:   { name: 'Time', max: 6, base: 200, growth: 1.9, info: l => `${runTime(l)} s a run` },
  steering: { name: 'Steering', max: 3, base: 300, growth: 2, info: l => l ? `lane changes ${40 * l}% quicker` : 'stock rack' },
  flash:  { name: 'Headlight flash', max: 10, base: 300, growth: 1.25, built: 1,
            info: l => `${l} flash${l === 1 ? '' : 'es'} a run. F or the stalk left of the wheel: the car ahead in your lane moves over (racers won't)` },
  flashRecharge: { name: 'Flash recharge', max: 5, base: 2500, growth: 1.5, built: 0, needs: ['flash'],
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
  brokenGears = damageOn() ? progress.broken : [];
}

// ---- saved progress (localStorage; the game still works without it, it just won't remember) ----
const SAVE_KEY = 'car-rev-incremental';
// off: aids switched off; racing: the race has been revealed; points: race points; finish: best finishing position;
// damage: % (damage.js), broken: gears it broke; nitro: seconds in the tank; miles: the Fleet's money
const FRESH = () => ({ bank: 0, best: 0, runs: 0, levels: {}, off: {}, engine: 0, racing: false, points: 0, finish: 101,
                       damage: 0, broken: [], nitro: 0, miles: 0 });
// debug mode (main.js) plays a save of its own, with wallets that never run out, so testing never touches the game
const FUNDS = 1e9;
let debugSave = false;
const saveKey = () => debugSave ? SAVE_KEY + '-debug' : SAVE_KEY;
const progress = Object.assign(FRESH(), load());
function load() { try { return JSON.parse(localStorage.getItem(saveKey())) ?? {}; } catch { return {}; } }
function save() {
  if (debugSave) progress.bank = progress.points = progress.miles = FUNDS; // spent or earned, back to full
  try { localStorage.setItem(saveKey(), JSON.stringify(progress)); } catch { /* not saved */ }
}
const forgetRun = () => Object.assign(run, { gain: 0, race: null, revealed: false, won: false, newBest: false, best: 0 });
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
// points, open once the race is revealed (race.js fills it); the Fleet, paid in miles, open once you have won a race.
// Each page's currency: the key in progress, and its unit
const PAGES = [['workshop', 'Workshop'], ['autopilot', 'Autopilot'], ['black', 'Black market'], ['fleet', 'Fleet']];
const WALLETS = { workshop: 'bank', autopilot: 'bank', black: 'points', fleet: 'miles' };
const UNITS = { bank: 'm', points: 'pts', miles: 'mi' };
const pageOpen = id => id === 'black' ? progress.racing : id === 'fleet' ? fleetOpen() : true;
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
  if (l >= maxOf(u)) return u.locked && l < FIELD ? u.locked : 'max';
  const missing = u.needs?.find(n => !lvl(n));
  if (missing) return `needs ${UPGRADES[missing].name}`;
  const gate = u.gate?.(l);
  if (typeof gate === 'string') return gate;
  return progress[wallet(u)] < cost(id) ? 'short' : '';
}
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
                       slot: progress.racing ? startSlot() : null, race: null, revealed: false, won: false, limp: wrecked(),
                       flashes: lvl('flash'), recharge: 0 });
  resetScene();
  brakePedal = 1;
  coolDown();
  run.refill = run.limp ? 0 : refillNitro(); // limping: keep the metres for the repair
}

function finishRun(dnf) { // dnf: why the run ended early (a crash), if it did
  run.gain = Math.floor(odo);
  run.newBest = run.gain > progress.best;
  progress.bank += run.gain;
  progress.best = Math.max(progress.best, run.gain);
  progress.runs++;
  const was = progress.finish;
  run.race = raceFinish(dnf);
  run.won = was > 1 && progress.finish === 1; // the first win opens the Fleet
  save();
  Object.assign(run, { phase: 'finish', count: FINISH });
  nitro = false;
  gasPedal = 0; clutchPedal = 1; brakePedal = 1;
}

function updateRun(dt) {
  if (run.phase === 'starting' || run.phase === 'countdown') { speed = odo = 0; holdRacers(); } // held at the line
  if (run.phase === 'starting' && state === 'running') run.phase = 'countdown';
  else if (run.phase === 'countdown' && (run.count -= dt) <= 0) { run.phase = 'run'; brakePedal = 0; raceGo(); }
  else if (run.phase === 'run' && (run.left -= dt) <= 0) { run.left = 0; finishRun(); }
  else if (run.phase === 'finish' && (run.count -= dt) <= 0) run.phase = 'garage';
  if (run.phase === 'run' && raceTick()) run.revealed = true;
  if (run.phase === 'run') rechargeFlash(dt);
  if (run.phase === 'run' && damageOn()) damageTick(dt);
  if (run.phase === 'run' && run.limp && odo >= LIMP) finishRun('limped'); // as far as a wreck gets
}

// flash recharge: a used flash comes back after a while, up to the run's full count
function rechargeFlash(dt) {
  if (!lvl('flashRecharge') || run.flashes >= lvl('flash')) { run.recharge = 0; return; }
  if ((run.recharge += dt) >= rechargeTime()) { run.recharge = 0; run.flashes++; }
}

// a collision (once you drive recklessly): damage; a head-on, or the damage that wrecks the car, ends the run
function onCollision(i) {
  if (run.phase !== 'run' || !damageOn()) return;
  hurt(i.kmh, i.headOn);
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

// ---- garage ----
let garageTab = 'workshop';
function renderGarage(bought) {
  if (!pageOpen(garageTab)) garageTab = 'workshop';
  $('bank').textContent = `${money(progress.bank)} m` + (progress.racing ? ` · ${money(progress.points)} pts` : '') +
    (fleetOpen() ? ` · ${money(progress.miles)} mi` : '') + ' to spend';
  const done = Object.keys(UPGRADES).every(id => !inMetres(UPGRADES[id]) || whyNot(id) === 'max'), r = run.race;
  $('report').innerHTML = !progress.runs
    ? `You get ${runTime()} seconds. Drive as far as you can: every metre is money for upgrades.`
    : (r?.dnf ? `<b>DNF</b>: ${{ 'head-on': 'head-on with oncoming traffic', wrecked: 'the car is wrecked',
        limped: `limped ${LIMP} m in the wreck` }[r.dnf]} · no points · ` : '') +
      (r && !r.dnf ? `Started ${r.start > FIELD ? 'at the back' : 'P' + r.start}, finished <b>P${r.p}</b> · <b>+${r.points} pts</b>` +
        (r.fresh ? ` (${r.fresh} for new positions, ${r.finish} for the finish)` : '') + ` · best P${progress.finish} · ` : '') +
      `Last run <b>+${fmt(run.gain)} m</b>${run.newBest ? ' · <b>new best!</b>' : ''} · best ${fmt(progress.best)} m · ` +
      `${progress.runs} run${progress.runs > 1 ? 's' : ''} · ${runTime()} s a run` + (done ? ' · fully built' : '') +
      (run.refill ? ` · nitro refill −${fmt(run.refill)} m` : '') +
      (run.revealed ? '<br><b>That quick car was racer #100. You are in a race: the Black market is open.</b>' : '') +
      (run.won ? '<br><b>P1! The racers you beat are open to offers: the Fleet is open, paid in miles.</b>' : '');
  $('tabs').innerHTML = PAGES.filter(([id]) => pageOpen(id))
    .map(([id, name]) => `<button data-tab="${id}"${id === garageTab ? ' class="on"' : ''}>${name}</button>`).join('');
  $('engine-row').hidden = garageTab !== 'workshop';
  $('engine-row').innerHTML = ENGINES.map((e, i) => i <= lvl('engine')
    ? `<button data-engine="${i}"${i === progress.engine ? ' class="on"' : ''}>${e.name}</button>`
    : i === lvl('engine') + 1
      ? `<button data-buy="engine"${whyNot('engine') ? ' disabled' : ''}>${e.name} · ${fmt(cost('engine'))} m</button>`
      : `<button disabled>${e.name} · locked</button>`).join('');
  const onTab = ([id, u]) => id !== 'engine' && pageOf(u) === garageTab;
  const d = progress.damage;
  $('drive').textContent = wrecked() ? `LIMP ${LIMP} m ▶` : 'DRIVE ▶'; // a wreck can always limp: no dead end
  const repairCard = garageTab === 'workshop' && d > 0 ? `<div class="card repair"><b>Repair</b><small>${Math.round(d)}% damage · ` +
    `rev limit −${fmt(revLoss())} rpm${progress.broken.length ? ` · broken: ${progress.broken.map(ordinal).join(', ')}` : ''}</small>` +
    `<button data-repair${progress.bank >= REPAIR ? '' : ' disabled'}>${progress.bank >= repairCost() ? 'Repair all' : 'Repair what I can'}` +
    ` · ${fmt(Math.min(repairCost(), Math.floor(progress.bank / REPAIR) * REPAIR))} m</button></div>` : '';
  $('cards').innerHTML = repairCard + (garageTab === 'fleet' ? exchangeCard() : '') + Object.entries(UPGRADES).filter(onTab).map(([id, u]) => {
    const l = lvl(id), why = whyNot(id), max = maxOf(u), steps = typeof u.max === 'function' ? 0 : max;
    const pips = steps > 1 ? `<i>${'■'.repeat(l)}${'□'.repeat(steps - l)}</i>` : '';
    const info = max > 1 || steps === 0 ? u.info(l) + (why !== 'max' && !why.startsWith('finish') ? ` → ${u.info(l + 1)}` : '') : u.info();
    const button = why === u.locked ? `<button disabled>${why}</button>` : why === 'max' ? (u.max !== 1 ? '<button disabled>MAX</button>'
        : u.needs?.some(n => progress.off[n]) ? `<button disabled>needs ${UPGRADES[u.needs.find(n => progress.off[n])].name} on</button>`
        : `<button data-toggle="${id}"${progress.off[id] ? '' : ' class="on"'}>${progress.off[id] ? 'OFF' : 'ON'}</button>`)
      : why.startsWith('needs') ? `<button disabled>${why}</button>`
      : `<button data-buy="${id}"${why ? ' disabled' : ''}>${price(id, cost(id))}</button>` +
        (steps === 0 && !why ? `<button data-max="${id}">all I can</button>` : ''); // the grid: many slots at once
    return `<div class="card${id === bought ? ' bought' : ''}"><b>${u.name}</b>${pips}<small>${info}</small>${button}</div>`;
  }).join('');
}

$('garage').onclick = e => {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  loading ??= start(); // any click is a user gesture: audio can start
  const { buy: id, engine: i, toggle, tab, max } = b.dataset;
  if (id && buy(id)) { beep(1760, 0.08); refreshCar(); }
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
  startRun();
  passedBest = shownReveal = false;
  startEngine(); // the key turns itself
}

// ---- head-up display: the run ----
let shownPhase, shownCount, passedBest = false, shownReveal = false;
function renderRun() {
  if (run.phase !== shownPhase) { // a new phase starts
    if (run.phase === 'run') { flash('GO!', '#5f5', true); beep(1320, 0.5); }
    if (run.phase === 'finish') { flash('TIME!', '#ec4', true); beep(880, 0.8); }
    if (run.phase === 'garage') renderGarage();
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
    run: run.limp ? ['LIMP MODE', `${Math.floor(odo)} of ${LIMP} m`] // the time left is in the mirror
      : progress.racing ? [`P${position()}`, `${fmt(odo)} m` + gaps()]
      : [`${fmt(odo)} m`, run.best ? `best ${fmt(run.best)} m` : ''],
    finish: run.race?.dnf ? ['DNF', run.race.dnf]
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
  start() { Object.assign(run, { phase: 'garage', best: progress.best }); shownPhase = null; },
  stop() { run.phase = 'garage'; document.body.classList.remove('garage', 'low', 'has-flash', 'timing'); clearDamageView(); }, // earns nothing
  update: updateRun,
  render() { renderRun(); renderDamage(); },
  crash: i => onCollision(i),
  marks: roadMarks,
  useFlash() { // a charge from this run's flashes
    if (run.phase !== 'run' || progress.off.flash || !run.flashes) return false;
    run.flashes--;
    return true;
  },
  speedo: () => lvl('gear7') ? 540 : 360,
  field: () => raceField(), // race.js loads after this file
  key(k) { if (k === 'Enter' && run.phase === 'garage') { drive(); return true; } }, // Enter in the garage: DRIVE
};
