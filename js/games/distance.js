// Distance: an incremental game. Each run gives you a few seconds to get as far as you can from a standing start;
// the metres driven are the money for upgrades in the garage between runs. Rules, saved progress, and its own
// screens: the garage and the run read-out on the head-up display.

// upgrade costs follow the usual incremental-game curve (Cookie Clicker, Hill Climb Racing): level n costs
// base · growth^n. info(level) describes what the car has at that level; needs: upgrades it builds on.
const UPGRADES = {
  power:  { name: 'Power', max: 10, base: 80, growth: 1.55, info: l => `+${12 * l}% torque` },
  rev:    { name: 'Rev limit', max: 4, base: 150, growth: 2, info: l => `${limiter(engine, l)} rpm` },
  gears:  { name: 'Gearbox', max: 3, base: 250, growth: 2.5, info: l => `${3 + l} gears` },
  tyres:  { name: 'Tyres', max: 4, base: 400, growth: 1.8, info: l => `${tyreGrip(l).toFixed(1)} g grip` },
  time:   { name: 'Time', max: 6, base: 200, growth: 1.9, info: l => `${runTime(l)} s a run` },
  clutch: { name: 'Auto clutch', max: 1, base: 700, info: () => 'works the clutch: no stalls' },
  gas:    { name: 'Auto gas', max: 1, base: 800, info: () => 'launch and traction control' },
  shift:  { name: 'Auto shift', max: 1, base: 2500, needs: ['clutch'], info: () => 'changes gear at the limiter' },
  steer:  { name: 'Lane assist', max: 1, base: 1500, info: () => 'swerves round a car you are about to hit' },
  cruise: { name: 'Autocruise', max: 1, base: 6000, needs: ['steer', 'gas', 'shift'],
            info: () => 'drives the whole run: passes, keeps right, brakes when boxed in' },
  engine: { name: 'Engine swap', max: ENGINES.length - 1, base: 4000, growth: 2.5, info: l => ENGINES[l].name },
};
const COUNTDOWN = 3, FINISH = 2; // seconds of countdown before a run, and of braking after it

const lvl = id => progress.levels[id] ?? 0;
const limiter = (e, l = lvl('rev')) => e.stock.redline - 600 * (UPGRADES.rev.max - l); // fully upgraded: stock
const tyreGrip = (l = lvl('tyres')) => 0.8 + 0.1 * l;
const runTime = (l = lvl('time')) => 20 + 5 * l;
const topGear = () => 3 + lvl('gears');

function applyUpgrades() { // the garage's work on the engines and the car
  for (const e of ENGINES) {
    e.drive = e.stock.drive * (1 + 0.12 * lvl('power'));
    e.redline = limiter(e);
  }
  CAR.grip = tyreGrip();
}

// ---- saved progress (localStorage; the game still works without it, it just won't remember) ----
const SAVE_KEY = 'car-rev-incremental';
const FRESH = () => ({ bank: 0, best: 0, runs: 0, levels: {}, off: {}, engine: 0 }); // off: aids switched off
const progress = Object.assign(FRESH(), load());
function load() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) ?? {}; } catch { return {}; } }
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); } catch { /* not saved */ } }
function resetProgress() { Object.assign(progress, FRESH()); save(); }

const cost = id => { const u = UPGRADES[id]; return Math.round(u.base * (u.growth ?? 1) ** lvl(id) / 10) * 10; };
function whyNot(id) { // reason an upgrade can't be bought now, or '' if it can
  const u = UPGRADES[id];
  if (lvl(id) >= u.max) return 'max';
  const missing = u.needs?.find(n => !lvl(n));
  if (missing) return `needs ${UPGRADES[missing].name}`;
  return progress.bank < cost(id) ? 'short' : '';
}
function buy(id) {
  if (whyNot(id)) return false;
  progress.bank -= cost(id);
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
  Object.assign(run, { phase: 'starting', count: COUNTDOWN, left: runTime(), best: progress.best, gain: 0, newBest: false });
  resetScene();
  brakePedal = 1;
}

function finishRun() {
  run.gain = Math.floor(odo);
  run.newBest = run.gain > progress.best;
  progress.bank += run.gain;
  progress.best = Math.max(progress.best, run.gain);
  progress.runs++;
  save();
  Object.assign(run, { phase: 'finish', count: FINISH });
  gasPedal = 0; clutchPedal = 1; brakePedal = 1;
}

function updateRun(dt) {
  if (run.phase === 'starting' || run.phase === 'countdown') speed = odo = 0; // held at the line, however hard it pulls
  if (run.phase === 'starting' && state === 'running') run.phase = 'countdown';
  else if (run.phase === 'countdown' && (run.count -= dt) <= 0) { run.phase = 'run'; brakePedal = 0; }
  else if (run.phase === 'run' && (run.left -= dt) <= 0) { run.left = 0; finishRun(); }
  else if (run.phase === 'finish' && (run.count -= dt) <= 0) run.phase = 'garage';
}

// things beside the road: a board every 100 m and a banner at the best distance so far
function roadMarks() {
  const marks = [];
  for (let m = Math.max(100, Math.ceil(odo / 100) * 100); m < odo + 1500; m += 100) marks.push({ z: m, kind: 'board', value: m });
  if (run.best) marks.push({ z: run.best, kind: 'best', value: run.best });
  return marks;
}

// ---- garage ----
function renderGarage(bought) {
  $('bank').textContent = `${fmt(progress.bank)} m to spend`;
  const done = Object.keys(UPGRADES).every(id => whyNot(id) === 'max');
  $('report').innerHTML = !progress.runs
    ? `You get ${runTime()} seconds. Drive as far as you can: every metre is money for upgrades.`
    : `Last run <b>+${fmt(run.gain)} m</b>${run.newBest ? ' · <b>new best!</b>' : ''} · best ${fmt(progress.best)} m · ` +
      `${progress.runs} run${progress.runs > 1 ? 's' : ''} · ${runTime()} s a run` + (done ? ' · fully built: beat your best!' : '');
  $('engine-row').innerHTML = ENGINES.map((e, i) => i <= lvl('engine')
    ? `<button data-engine="${i}"${i === progress.engine ? ' class="on"' : ''}>${e.name}</button>`
    : i === lvl('engine') + 1
      ? `<button data-buy="engine"${whyNot('engine') ? ' disabled' : ''}>${e.name} · ${fmt(cost('engine'))} m</button>`
      : `<button disabled>${e.name} · locked</button>`).join('');
  $('cards').innerHTML = Object.entries(UPGRADES).filter(([id]) => id !== 'engine').map(([id, u]) => {
    const l = lvl(id), why = whyNot(id);
    const pips = u.max > 1 ? `<i>${'■'.repeat(l)}${'□'.repeat(u.max - l)}</i>` : '';
    const info = u.max > 1 ? u.info(l) + (l < u.max ? ` → ${u.info(l + 1)}` : '') : u.info();
    const button = why === 'max' ? (u.max > 1 ? '<button disabled>MAX</button>'
        : u.needs?.some(n => progress.off[n]) ? `<button disabled>needs ${UPGRADES[u.needs.find(n => progress.off[n])].name} on</button>`
        : `<button data-toggle="${id}"${progress.off[id] ? '' : ' class="on"'}>${progress.off[id] ? 'OFF' : 'ON'}</button>`)
      : why.startsWith('needs') ? `<button disabled>${why}</button>`
      : `<button data-buy="${id}"${why ? ' disabled' : ''}>${fmt(cost(id))} m</button>`;
    return `<div class="card${id === bought ? ' bought' : ''}"><b>${u.name}</b>${pips}<small>${info}</small>${button}</div>`;
  }).join('');
}

$('garage').onclick = e => {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  loading ??= start(); // any click is a user gesture: audio can start
  const { buy: id, engine: i, toggle } = b.dataset;
  if (id && buy(id)) { beep(1760, 0.08); refreshCar(); }
  if (i) { progress.engine = +i; save(); refreshCar(); }
  if (toggle) { progress.off[toggle] = !progress.off[toggle]; save(); }
  if (b.id === 'reset' && confirm('Start over? This clears every metre and upgrade.')) { resetProgress(); refreshCar(); }
  if (b.id === 'drive') return drive();
  renderGarage(id);
};

function drive() {
  startRun();
  passedBest = false;
  startEngine(); // the key turns itself
}

// ---- head-up display: the run ----
let shownPhase, shownCount, passedBest = false;
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
  if (run.phase === 'run' && run.best && odo >= run.best && !passedBest) {
    passedBest = true;
    flash('NEW BEST!', '#5f5', true);
  }
  const [dist, info] = {
    starting: ['', 'starting the engine…'],
    countdown: ['GET READY', [!aid('clutch') && 'clutch down', !aid('shift') && '1st gear', !aid('gas') && 'gas']
      .filter(Boolean).join(' · ') || 'sit back: the car does it all'],
    run: [`${fmt(odo)} m`, `${run.left.toFixed(1)} s` + (run.best ? ` · best ${fmt(run.best)} m` : '')],
    finish: [`${fmt(run.gain)} m`, run.newBest ? 'new best!' : 'time'],
  }[run.phase] ?? ['', ''];
  $('run-dist').textContent = dist;
  $('run-info').textContent = info;
  document.body.classList.toggle('low', run.phase === 'run' && run.left < 5);
}

const DISTANCE = {
  id: 'distance', name: 'Distance', hud: 'run',
  blurb: 'A few seconds to get as far as you can. Every metre buys upgrades: power, gears, time, driver aids.',
  gears: topGear,
  engine: () => progress.engine, // the garage's engines, not the menu's
  tune: applyUpgrades,
  start() { Object.assign(run, { phase: 'garage', best: progress.best }); shownPhase = null; },
  stop() { run.phase = 'garage'; document.body.classList.remove('garage', 'low'); }, // a run left half way earns nothing
  update: updateRun,
  render: renderRun,
  marks: roadMarks,
  key(k) { if (k === 'Enter' && run.phase === 'garage') { drive(); return true; } }, // Enter in the garage: DRIVE
};
