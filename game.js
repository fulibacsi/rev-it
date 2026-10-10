// Game: an incremental run game. Each run gives you a few seconds to get as far as you can from a standing start;
// the metres driven are the money for upgrades in the garage between runs. Rendering lives in main.js; this file
// is the rules and the saved progress.

// upgrade costs follow the usual incremental-game curve (Cookie Clicker, Hill Climb Racing): level n costs
// base · growth^n. info(level) describes what the car has at that level.
const UPGRADES = {
  power:  { name: 'Power', max: 10, base: 80, growth: 1.55, info: l => `+${12 * l}% torque` },
  rev:    { name: 'Rev limit', max: 4, base: 150, growth: 2, info: l => `${limiter(engine, l)} rpm` },
  gears:  { name: 'Gearbox', max: 3, base: 250, growth: 2.5, info: l => `${3 + l} gears` },
  tyres:  { name: 'Tyres', max: 4, base: 400, growth: 1.8, info: l => `${tyreGrip(l).toFixed(1)} g grip` },
  time:   { name: 'Time', max: 6, base: 200, growth: 1.9, info: l => `${runTime(l)} s a run` },
  clutch: { name: 'Auto clutch', max: 1, base: 700, info: () => 'works the clutch: no stalls' },
  gas:    { name: 'Auto gas', max: 1, base: 800, info: () => 'launch and traction control' },
  shift:  { name: 'Auto shift', max: 1, base: 2500, needs: 'clutch', info: () => 'changes gear at the limiter' },
  engine: { name: 'Engine swap', max: ENGINES.length - 1, base: 4000, growth: 2.5, info: l => ENGINES[l].name },
};
const COUNTDOWN = 3, FINISH = 2; // seconds of countdown before a run, and of braking after it

const lvl = id => progress.levels[id] ?? 0;
const limiter = (e, l = lvl('rev')) => e.stock.redline - 600 * (UPGRADES.rev.max - l); // fully upgraded: stock
const tyreGrip = (l = lvl('tyres')) => 0.8 + 0.1 * l;
const runTime = (l = lvl('time')) => 20 + 5 * l;
const topGear = () => 3 + lvl('gears');

ENGINES.forEach(e => { e.stock = { drive: e.drive, redline: e.redline }; });
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
  if (u.needs && !lvl(u.needs)) return `needs ${UPGRADES[u.needs].name}`;
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

// a driver aid works while bought, switched on and a run is under way; auto shift needs the auto clutch working
function aid(id) {
  if (!lvl(id) || progress.off[id] || (run.phase !== 'countdown' && run.phase !== 'run')) return false;
  return !UPGRADES[id].needs || aid(UPGRADES[id].needs);
}

// ---- a run ----
// phase: 'garage' -> 'starting' (engine cranks) -> 'countdown' (car held on the brake) -> 'run' -> 'finish'
// (braking, the score is in) -> 'garage'. best: the best distance before this run, marked on the road.
const run = { phase: 'garage', count: 0, left: 0, best: progress.best, gain: 0, newBest: false };

function startRun() { // back to the start line, engine running, in neutral, held on the brake
  Object.assign(run, { phase: 'starting', count: COUNTDOWN, left: runTime(), best: progress.best, gain: 0, newBest: false });
  speed = odo = 0; gear = 0; locked = spinning = false;
  gasPedal = clutchPedal = 0; brakePedal = 1;
  resetTraffic();
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
