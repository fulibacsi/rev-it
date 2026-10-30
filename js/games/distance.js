// Distance: an incremental game. Each run gives you a few seconds to get as far as you can from a standing start;
// the meters driven are the money for upgrades in the garage between runs. Rules, saved progress, and its own
// screens: the garage and the run read-out on the heads-up display.

// upgrade costs follow the usual incremental-game curve (Cookie Clicker, Hill Climb Racing): level n costs
// base · growth^n. info(level) describes what the car has at that level. needs: its parents in the owner's graph
// (docs/upgrade-graph.md, the source of truth): an id (bought), or [id, levels] ([id, 'max']: maxed); a function of the
// level when each level has its own (the engines). It shows once one is met and is bought with all of them (shows,
// whyNot). on: the aids it works on top of: one switched off switches it off too (aid).
// tab: the garage page it is on, see PAGES; max can depend on
// progress (then locked says why there is no more yet); gate(level) can hold the next level back with a reason;
// built: how many levels count toward the car being built (headStart in race.js), when not all of them.
const UPGRADES = {
  power:  { name: 'Power', max: 10, base: 80, growth: 1.55, needs: ['workshopTab'], info: l => `+${12 * l}% torque` },
  rev:    { name: 'Rev limit', max: 4, base: 150, growth: 2, needs: ['workshopTab'], info: l => `${limiter(engine, l)} rpm` },
  gears:  { name: 'Transmission', max: 3, base: 250, growth: 2.5, needs: ['workshopTab'], info: l => `${3 + l} gears` },
  tyres:  { name: 'Tires', max: 4, base: 400, growth: 1.8, needs: ['workshopTab'],
            info: l => `${tyreGrip(l).toFixed(1)} g grip: launches and braking` },
  time:   { name: 'Time', max: 6, base: 200, growth: 1.9, needs: ['workshopTab'], info: l => `${runTime(l)} s a run` },
  steering: { name: 'Steering', max: 3, base: 300, growth: 2, needs: ['workshopTab'],
              info: l => l ? `lane changes ${40 * l}% quicker` : 'stock rack' },
  flash:  { name: 'Headlight flash', max: 10, base: 300, growth: 1.25, built: 1, needs: ['workshopTab'], // the racers only after the reveal
            info: l => `${l} flash${l === 1 ? '' : 'es'} a run. F or the stalk left of the wheel: the car ahead in your lane moves over` +
              (progress.racing ? " (racers won't)" : '') },
  // Reckless driving a parent (the owner, 23 Oct): on sale before the reveal, it took the meters the car needed, and
  // the white car fell 3 to 10 runs later (tests/balance/act1.py, cheapest and value); in sight from 5 flashes, a teaser
  flashRecharge: { name: 'Flash recharge', max: 5, base: 2500, growth: 1.5, built: 0, needs: [['flash', 5], 'reckless'],
                   info: l => l ? `a flash back every ${rechargeTime(l)} s` : 'a flash used is gone for the run' },
  autoflash: { name: 'Auto flash', tab: 'autopilot', max: 1, base: 2000, needs: ['autopilotTab', ['flash', 5]], on: ['flash'],
               info: () => 'flashes slower cars ahead for you' + (progress.racing ? ', and changes lanes round racers instead' : '') },
  clutch: { name: 'Auto clutch', tab: 'autopilot', max: 1, base: 700, needs: ['autopilotTab'], info: () => 'works the clutch: no stalls' },
  gas:    { name: 'Auto gas', tab: 'autopilot', max: 1, base: 800, needs: ['autopilotTab'], info: () => 'launch and traction control' },
  shift:  { name: 'Auto shift', tab: 'autopilot', max: 1, base: 2500, needs: ['clutch'], on: ['clutch'],
            info: () => 'changes gear at the limiter' },
  steer:  { name: 'Lane assist', tab: 'autopilot', max: 1, base: 1500, needs: ['autopilotTab'],
            info: () => 'swerves round a car you are about to hit' },
  cruise: { name: 'Autocruise', tab: 'autopilot', max: 1, base: 6000, needs: ['steer', 'shift', 'gas'], on: ['steer', 'gas', 'shift'],
            info: () => 'drives the whole run: passes, keeps right, brakes when boxed in' },
  stereo: { name: 'Car stereo', max: 1, base: 500, built: 0, needs: ['workshopTab'], // stereo.js; no use for speed, so not part of building the car
            info: () => 'synthwave on five tapes: tap the lights in the cluster (or M) for the next, or off' },
  engine: { name: 'Engine swap', max: ENGINES.length - 1, base: 4000, growth: 2.5, info: l => ENGINES[l].name,
            needs: l => l ? [['power', 'max'], ['rev', 'max'], ['gears', 'max']] : ['power', 'rev', 'gears'] }, // the V8, the I6
  // the tabs, bought (the owner, 23 Oct): opens: the page; story: the moment it waits for, out of sight till then
  workshopTab: { name: 'Workshop', opens: 'workshop', max: 1, base: 100, built: 0 },
  autopilotTab: { name: 'Autopilot', opens: 'autopilot', max: 1, base: 500, built: 0, needs: ['workshopTab'],
                  gate: () => progress.driven >= TO_AUTOPILOT || `${Math.floor(progress.driven / 100) / 10} of ${TO_AUTOPILOT / 1000} km driven` },
  blackTab: { name: 'Black market', opens: 'black', max: 1, base: 1, wallet: 'points', needs: ['workshopTab'], story: () => progress.racing },
  fleetTab: { name: 'Crew', opens: 'fleet', max: 1, base: 1, wallet: 'points', needs: ['blackTab'], story: () => fleetOpen() },
  warrigTab: { name: 'War Rig', opens: 'warrig', max: 1, base: 1, wallet: 'scrap', needs: ['fleetTab'], story: () => gangOpen() },
  // act 5 (the owner, 28-29 Oct): the tank beaten opens it, out of sight till then (boss.js)
  fortressTab: { name: 'Fortress', opens: 'fortress', max: 1, base: 1, wallet: 'scrap', needs: ['warrigTab'], story: () => progress.tanks > 0 },
};
const TO_AUTOPILOT = 2000; // m driven in all before the Autopilot tab is for sale (the owner's graph)
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
// damage: % (damage.js), broken: gears it broke; nitro: seconds in the tank; fuel: the Crew's money (miles until 26
// Oct), crude: liters in the tank, oil: how far the oil is on (0, 1 the first crude, 2 the first fuel), roles: the
// crew's harvesters and brewers, pace: your m/s of late (oil.js); gang: the gang's moment has come, scrap: the
// War Rig's, from totals: cars totaled (gang.js); wanted: police heat, 0 to 1 (police.js); tanks: tanks beaten (boss.js);
// autoRepair: the repair card's AUTO switch (damage.js);
// tape: the one in the stereo (stereo.js); time: seconds played, driven: meters in all, races: runs raced (the
// menu's STATS)
const FRESH = () => ({ bank: 0, best: 0, runs: 0, levels: {}, off: {}, engine: 0, racing: false, points: 0, finish: 101,
                       damage: 0, broken: [], nitro: 0, fuel: 0, crude: 0, oil: 0, roles: { harvester: 0, brewer: 0, raider: 0 }, pace: 70,
                       gang: false, scrap: 0, totals: 0, wanted: 0, tanks: 0, autoRepair: false, tape: 0,
                       time: 0, driven: 0, races: 0, seen: [], toured: [], dry: 0 }); // seen: upgrades seen unlocked (the tabs' !);
                                                       // toured: tutorials popped up (tutorial.js); dry: races in a row
                                                       // without a Black market buy (race.js raceWall)
// debug mode (main.js) plays a save of its own, so testing never touches the game, with wallets that never run out
// unless its money switch is off (the owner, 27 Oct: to feel the prices): then they fill and empty as in play
const FUNDS = 1e9;
let debugSave = false;
const bottomless = () => debugSave && settings.debugMoney !== false; // main.js loads later
const saveKey = () => debugSave ? SAVE_KEY + '-debug' : SAVE_KEY;
const progress = Object.assign(FRESH(), load());
function load() { // a save from before fuel (26 Oct) has miles: they are liters now, one for one
  let s = {};
  try { s = JSON.parse(localStorage.getItem(saveKey())) ?? {}; } catch { /* none */ }
  if ('miles' in s) { s.fuel ??= s.miles; delete s.miles; }
  return s;
}
function save() {
  if (bottomless()) progress.bank = progress.points = progress.fuel = progress.scrap = FUNDS; // spent or earned, back to full
  try { localStorage.setItem(saveKey(), JSON.stringify(progress)); } catch { /* not saved */ }
}
const forgetRun = () => Object.assign(run, { gain: null, race: null, revealed: false, won: false, dues: 0, team: 0, scrap: 0, totals: 0, repaired: 0,
                                             firstTotal: false, boss: false, tank: null, beatTank: false, newBest: false, best: 0 });
// RESET PROGRESS: a new game, by a player who has driven before, so its first run has no Driving tutorial (the owner,
// 23 Oct)
function resetProgress() {
  Object.assign(progress, FRESH(), { toured: ['driving'] });
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
const money = n => bottomless() ? '∞' : fmt(n); // a debug wallet shows as bottomless
function debugMoney(on) { // the switch: on, the wallets fill; off, they empty (start at an act for its own)
  settings.debugMoney = on;
  saveSettings();
  Object.assign(progress, on ? {} : { bank: 0, points: 0, fuel: 0, scrap: 0 });
  save();
}

// debug mode's acts (the owner, 26 Oct: to test an act without playing the ones before it): the debug save set to an
// act's start. From a fresh game, the story so far, and the pages before the act bought out as the graph allows (the
// debug wallets pay); everything open by then counts as seen; then the act's own moment, so its card pops up as it
// does in play. Anything of the act's or later is gone. With the money switch off, the wallets the act starts with in
// the simulations (tests/balance: act 2's meters left at P1, act 4's reserve). act: 0 for the first (a new game)
const ACTS = [
  { pages: [] },
  { pages: ['workshop', 'autopilot'], story: { runs: 20, driven: 60000, best: 3000 },
    moment: () => { progress.racing = true; } }, // past #100: the race
  { pages: ['workshop', 'autopilot', 'black'], story: { runs: 40, races: 20, driven: 150000, best: 5000, racing: true, finish: 2 },
    wallets: { bank: 44000, points: 10 }, moment: () => { progress.finish = 1; } }, // the first win (P1 pays 10)
  { pages: ['workshop', 'autopilot', 'black', 'fleet'], cap: () => ({ fleet: GANG - 1 }), // gang.js loads later
    story: { runs: 55, races: 35, driven: 250000, best: 5000, racing: true, finish: 1, oil: 2 }, // the oil on (oil.js)
    wallets: { bank: 3000, scrap: 22 }, // and the first total's scrap (gang.js SCRAP.car: it loads later)
    moment: () => { progress.levels.fleet = GANG; Object.assign(progress, { gang: true, totals: 1 }); } }, // the first total
  { pages: ['workshop', 'autopilot', 'black', 'fleet', 'warrig'], cap: () => ({ fleet: 80 }), // act4.py at the tank: 74-82
    story: { runs: 70, races: 50, driven: 400000, best: 5000, racing: true, finish: 1, oil: 2, gang: true, totals: 60,
             roles: { harvester: 17, brewer: 9, raider: 6 } }, // act4.py's split by then
    wallets: { bank: 8000, points: 2800, fuel: 7, scrap: 300 }, // act4.py at the tank (seed 1), the tank's 300 scrap
    moment: () => { progress.tanks = 1; progress.toured.push('tanksent'); } }, // the tank beaten: its own card seen in its race
];
function debugAct(act) {
  if (!debugSave) return;
  const { pages, story, cap = () => ({}), wallets = {}, moment } = ACTS[act], most = cap();
  const mine = id => pages.includes(UPGRADES[id].opens ?? pageOf(UPGRADES[id]));
  Object.assign(progress, FRESH(), story, { bank: FUNDS, points: FUNDS, fuel: FUNDS, scrap: FUNDS }); // as save() keeps them
  for (let more = true; more;) { // over and over: a buy can open another (Flash recharge waits for Reckless driving)
    more = false;
    for (const id of Object.keys(UPGRADES)) if (mine(id) && lvl(id) < (most[id] ?? Infinity) && buy(id)) more = true;
  }
  Object.assign(progress, { engine: lvl('engine'), nitro: nitroTank(), toured: moment ? opened().map(t => t.id) : [],
                            seen: Object.keys(UPGRADES).filter(shows) });
  markTours(); // tutorial.js: what is open before the moment
  moment?.();
  if (!bottomless()) Object.assign(progress, { bank: 0, points: 0, fuel: 0, scrap: 0 }, wallets);
  save();
  forgetRun();
}

// the garage's pages: the car itself and the robot driver, paid in meters; the illegal and forbidden, paid in race
// points (race.js fills it); the Crew, paid in fuel (fleet.js, oil.js); War Rig, paid in scrap (gang.js); the Fortress,
// act 5's, its cards each in its own currency (the owner: every resource builds it). Each is a tab you buy (the owner's
// graph, 23 Oct): the Black market's once the race is revealed, the Crew's once you have won a race, the War Rig's once
// you have totaled a car, the Fortress's once the tank is beaten. Each page's currency: the key in progress, and its unit
const PAGES = [['workshop', 'Workshop'], ['autopilot', 'Autopilot'], ['black', 'Black market'], ['fleet', 'Crew'],
               ['warrig', 'War Rig'], ['fortress', 'Fortress']];
const WALLETS = { workshop: 'bank', autopilot: 'bank', black: 'points', fleet: 'fuel', warrig: 'scrap', fortress: 'scrap' };
const UNITS = { bank: 'm', points: 'pts', fuel: 'L', scrap: 'scrap' };
const TAB = Object.fromEntries(Object.entries(UPGRADES).filter(([, u]) => u.opens).map(([id, u]) => [u.opens, id])); // page: its tab
const fleetOpen = () => progress.finish === 1;
const pageOf = u => u.tab ?? 'workshop';
const wallet = u => u.wallet ?? WALLETS[pageOf(u)]; // which of progress's currencies it costs
const inMetres = u => wallet(u) === 'bank';
const price = (id, n, unit = UNITS[wallet(UPGRADES[id])]) => `${fmt(n)} ${n === 1 && unit === 'pts' ? 'pt' : unit}`;
const maxOf = u => typeof u.max === 'function' ? u.max() : u.max;
// its level; a tab counts as bought once anything on its page is, so a save from before the tabs keeps its pages
const owned = id => lvl(id) || (UPGRADES[id].opens && Object.entries(UPGRADES).some(([k, u]) => !u.opens && pageOf(u) === UPGRADES[id].opens && lvl(k)) ? 1 : 0);
const pageOpen = page => owned(TAB[page]) > 0;
// its parents for the next level, each [id, levels]; met once that many are bought
const needsOf = (id, l = lvl(id)) => {
  const n = UPGRADES[id].needs;
  return (typeof n === 'function' ? n(l) : n ?? []).map(p => Array.isArray(p) ? p : [p, 1]);
};
const has = ([id, n]) => owned(id) >= (n === 'max' ? maxOf(UPGRADES[id]) : n);
// in sight (the owner's graph): bought, or one of its parents met; a tab's story keeps it out of sight till then
function shows(id) {
  const u = UPGRADES[id], needs = needsOf(id);
  if (owned(id)) return true;
  if (u.story && !u.story()) return false;
  return !needs.length || needs.some(has);
}
const inSight = id => shows(id) && (!!UPGRADES[id].opens || pageOpen(pageOf(UPGRADES[id]))); // a card: on a page you have
// what it needs, in full: done checked, a parent out of sight as ??? (a card's own tab goes without saying)
function rule(id) {
  const u = UPGRADES[id];
  return 'needs ' + needsOf(id).filter(([p]) => u.opens || p !== TAB[pageOf(u)]).map(([p, n]) => {
    if (!inSight(p)) return '???';
    const top = n === 'max' ? maxOf(UPGRADES[p]) : n, got = Math.min(owned(p), top);
    return `${got >= top ? '✓ ' : ''}${UPGRADES[p].name}${top > 1 ? ` ${got}/${top}` : ''}`;
  }).join(' · ');
}
function cost(id) {
  const u = UPGRADES[id], step = inMetres(u) ? 10 : 1; // meters in round tens, the rest one by one
  return Math.max(step, Math.round(u.base * (u.growth ?? 1) ** lvl(id) / step) * step);
}
function whyNot(id) { // reason an upgrade can't be bought now, or '' if it can
  const u = UPGRADES[id], l = lvl(id);
  if (l >= maxOf(u)) return u.locked && l < FIELD ? u.locked : 'max';
  if (u.story && !u.story()) return 'out of sight';
  if (!needsOf(id).every(has)) return rule(id);
  const gate = u.gate?.(l);
  if (typeof gate === 'string') return gate;
  return progress[wallet(u)] < cost(id) ? 'short' : '';
}
// a card is locked while none of it is bought and something else comes first: it shows its name and its rule.
// A tab gets a yellow ! while it has an upgrade unlocked that you haven't looked at yet (the owner, 14 Oct)
const isLocked = id => !lvl(id) && !['', 'short', 'max'].includes(whyNot(id));
const unseen = id => !isLocked(id) && !progress.seen.includes(id);
function buy(id) {
  if (whyNot(id)) return false;
  progress[wallet(UPGRADES[id])] -= cost(id);
  progress.levels[id] = lvl(id) + 1;
  if (pageOf(UPGRADES[id]) === 'black') progress.dry = 0; // not stuck in the race (race.js)
  if (id === 'engine') progress.engine = lvl(id); // drive the new engine straight away
  save();
  return true;
}

// a driver aid works while bought, switched on and a run is under way, and only with the aids it builds on working
function aid(id) {
  if (!lvl(id) || progress.off[id] || (run.phase !== 'countdown' && run.phase !== 'run')) return false;
  return (UPGRADES[id].on ?? []).every(aid);
}

// ---- a run ----
// phase: 'garage' -> 'starting' (engine cranks) -> 'countdown' (car held on the brake) -> 'run' -> 'finish'
// (braking, the score is in) -> 'garage'. best: the best distance before this run, marked on the road.
const run = { phase: 'garage', count: 0, left: 0, best: progress.best, gain: null, newBest: false }; // gain null: no run yet

function startRun() { // back to the start line, engine running, in neutral, held on the brake
  Object.assign(run, { phase: 'starting', count: COUNTDOWN, left: runTime(), best: progress.best, gain: 0, newBest: false,
                       slot: progress.racing ? startSlot() : null, race: null, revealed: false, won: false, scrap: 0, totals: 0,
                       firstTotal: false, boss: bossRace(), tank: null, beatTank: false, limp: wrecked(),
                       flashes: lvl('flash'), recharge: 0 });
  resetScene();
  brakePedal = 1;
  coolDown();
  copClock = copEvery(); // police.js: the first police car after a while
  run.refill = run.limp ? 0 : refillNitro(); // limping: keep the meters for the repair
  crewRun(); // oil.js: this run's spots
  if (run.boss) sendTank(); // boss.js: up the road, waiting
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
  if (run.race) { progress.races++; progress.dry++; }
  run.dues = fleetDues(); // fleet.js
  progress.bank += run.dues;
  run.repaired = autoRepairOn() ? autoRepair() : 0; // damage.js: the repair card's AUTO, once the run's meters are in
  run.team = run.race ? teamPoints() : 0; // fleet.js: your racers' places pay points
  crewEnd(); // oil.js: what is still at work counts
  progress.points += run.team;
  progress.pace += 0.3 * (run.gain / Math.max(1, runTime() - run.left) - progress.pace); // your m/s of late (oil.js)
  run.won = was > 1 && progress.finish === 1; // the first win opens the Crew
  save();
  const { gain, newBest, race, dues, team, refill, totals, scrap, boss, beatTank, limp, crude, fuel } = run;
  report('run', { run: { gain, newBest, race, dues, team, refill, totals, scrap, boss, beatTank, limp, crude, fuel } }); // reporting.js
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
  if (run.phase === 'run') { rechargeFlash(dt); updateGang(dt); updatePolice(dt); updateBoss(); crewTick(dt); }
  if (run.phase === 'run' && damageOn()) damageTick(dt);
  if (run.phase === 'run' && run.limp && odo >= LIMP) finishRun('limped'); // as far as a wreck gets
}

// flash recharge: a used flash comes back after a while, up to the run's full count
function rechargeFlash(dt) {
  if (!lvl('flashRecharge') || run.flashes >= lvl('flash')) { run.recharge = 0; return; }
  if ((run.recharge += dt) >= rechargeTime()) { run.recharge = 0; run.flashes++; }
}

// a collision (once you drive recklessly): damage; a head-on, or the damage that wrecks the car, ends the run. A
// head-on with a mad driver (Fuel madness) doesn't: it hurts as much, and the mad car is totaled
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
  marks.push(...crewMarks(), ...omenMarks()); // oil.js: act 3's spots, your crew's cars at them, and its foreshadowing
  return marks;
}

// the Crew's Fuel converter (the Mile converter until 26 Oct): meters for fuel, one way, at the pump price: a mile's
// meters a liter at first (the owner: thousands, not hundreds), climbing with the crew to three times at the gang (a
// first guess). It buys the first cars, and the oil takes over
const PUMP = 7500; // m a liter at first: act 2's 40-47k m buy 4 or 5 cars (the owner, 27 Oct: it was a mile, and bought 19)
const pumpPrice = () => Math.round(PUMP * (1 + 2 * Math.min(fleetSize(), GANG) / GANG));
let exchange = 0;  // liters on its slider
const canExchange = () => Math.floor(progress.bank / pumpPrice());
function convert(l) {
  l = Math.min(l, canExchange());
  if (l <= 0) return false;
  progress.bank -= l * pumpPrice();
  progress.fuel += l;
  exchange = 0;
  save();
  return true;
}
const exchangeLabel = () => `${fmt(exchange)} L for ${fmt(exchange * pumpPrice())} m`;
function exchangeCard() {
  const can = canExchange();
  exchange = Math.min(exchange, can);
  return `<div class="card exchange"><b>Fuel converter</b><small>meters for fuel, one way, at the pump: ${fmt(pumpPrice())} m a ` +
    `liter · ${money(progress.fuel)} L to spend</small><input type="range" id="exchange" min="0" max="${can}" value="${exchange}">` +
    `<span><button data-exchange${exchange ? '' : ' disabled'}>${exchangeLabel()}</button> ` +
    `<button data-exchange-all${can ? '' : ' disabled'}>all available · ${money(can)} L</button></span></div>`;
}

// ---- the act cards (the owner, 21 Oct: nobody read the words on top of the garage) ----
// A title card as each act starts, in the ending's look: what the act is about and what to do. The first has no
// number, nor does anything else before the reveal: no word of acts to come (the owner, 21 Oct); ACT II is the first.
// The last act has one more, without a number, at its turn: the tank. Each pops up once, before any tutorial that
// opens with it: they ride first in the tutorials' list (tutorial.js). The pause menu and the garage's title show the
// current one again, with where you stand and the last run in full; the garage keeps a line of the run's numbers
TUTORIALS.unshift(
  { id: 'act1', name: 'DRIVE', open: () => true,
    text: () => `You get ${runTime()} seconds a run. Drive as far as you can: every meter is money for the garage, its ` +
      'Workshop first. New to a stick shift? HOW TO DRIVE takes you through it.' },
  { id: 'act2', act: 'II', name: 'RACE', open: () => progress.racing,
    text: () => 'That quick car was racer #100. You are in a race of a hundred: every run is a race now, and your place ' +
      'when the time runs out pays race points, more for a place reached the first time. The Black market takes them: ' +
      'buy its tab in the garage.',
    now: () => (progress.finish <= FIELD ? `Your best place: P${progress.finish}.` : '') +
      (hint() ? ` Stuck? ${hint()}.` : '') },
  { id: 'act3', act: 'III', name: 'RECRUIT', open: () => fleetOpen(),
    text: () => 'P1! The racers you beat are open to offers. Buy the Crew tab and pay them off in fuel, from the ' +
      'converter: they race for you, in your colors, and their places at the finish pay you points.',
    now: () => progress.gang ? 'Your crew is a gang now: ram the car in the reticle until its health bar is empty.'
      : !fleetSize() ? 'None of the field races for you yet.' : progress.oil ? `Your crew: ${racersOf()} racing, ` +
      `${role('harvester')} harvesting, ${role('brewer')} brewing.` : `${fleetSize()} of the field race${fleetSize() === 1 ? 's' : ''} for you.` },
  // the gang's first car totaled, on the road (gang.js gangMoment): act IV (the owner, 27 Oct; it popped up in the
  // garage as the 51st was bought, and the next card, NO LAW OUT HERE, at the first total: one card now)
  { id: 'act4', act: 'IV', name: 'WAR', open: () => gangOpen(),
    text: () => 'Totaled! No law out here any more. Your car becomes a war rig, the oil still flowing, and your racers ' +
      'just race: the War Rig tab is for sale, paid in scrap.',
    now: () => progress.wanted >= 1 ? `Police heat 100%: the army has a tank ready for when you are ${lvl('guns') ? 'repaired' : 'armed'}.`
      : `Every car totaled raises the police heat, now ${heatPct()}. At 100% the army sends a tank` +
        (lvl('guns') ? '.' : ', once you have guns.') },
  { id: 'tanksent', name: 'THE ARMY SENDS A TANK', open: () => bossRace() || progress.tanks > 0,
    text: () => 'Police heat 100%: the army has sent a tank. It is waiting up the road: outgun it' +
      (lvl('pack') ? ', and send your raiders at it.' : '.'),
    now: () => bossRace() ? '' : `The tank is scrap and the road is yours (${progress.tanks} beaten). Push the heat ` +
      `to 100% again, now ${heatPct()}, and the next one is tougher.` },
  // the tank beaten opens act 5 (the owner, 29 Oct: its ending goes; WARLORD comes at act 5's end). Built a piece at a
  // time on the playtest build, so it says so (the owner: for the playtesters on it)
  { id: 'act5', act: 'V', name: 'BUILD', open: () => progress.tanks > 0,
    text: () => 'The tank is scrap, and its parts are yours. A war rig is not enough out here any more: build a fortress ' +
      'on wheels from what the army leaves behind. The Fortress tab is for sale, paid in scrap. ' + UNDER_CONSTRUCTION,
    now: () => bossRace() ? 'The army has sent another tank: it waits up the road.'
      : `Police heat ${heatPct()}: at 100% the army sends another tank, tougher.` },
);
const UNDER_CONSTRUCTION = 'Under construction: act V is being built a piece at a time, more with each update.';
const heatPct = () => `${Math.round(progress.wanted * 100)}%`;
const CARDS = TUTORIALS.filter(t => t.text);
const currentCard = () => CARDS.findLast(c => c.open());
// stuck in the race (race.js raceWall): a word on the wall in the way, in the garage's line of numbers and on the act's
// card. Kept short, and only when stuck: the owner (22 Oct) would rather not help the player too much
const HINTS = { black: 'Buy the Black market: tap its tab', grid: 'Bribe the starter: start further up',
                reckless: 'Reckless driving: the oncoming lanes',
                gear7: '7th gear: the top 10 are beyond 6th' };
const hint = () => HINTS[raceWall()];
const actTitle = () => { const a = CARDS.findLast(c => c.act && c.open()); return a && `ACT ${a.act} · ${a.name}`; }; // none yet: the first
const dnf = r => ({ 'head-on': 'head-on with oncoming traffic', wrecked: 'the car is wrecked', limped: `limped ${LIMP} m in the wreck`,
                     tank: 'the tank held the road' })[r.dnf]; // why a race wasn't finished
// the last run, in a line of numbers at the top of the garage (none before the first, nor after a reload)
function runLine() {
  const r = run.race;
  if (run.gain == null) return '';
  return [`<b>+${fmt(run.gain)} m</b>${run.newBest ? ' new best!' : ''}`,
    r && (r.dnf ? `<b>DNF</b> ${dnf(r)}` : `<b>P${r.p}</b> +${r.points} pts`),
    run.team && `team places +${fmt(run.team)} pts`, run.dues && `racing +${fmt(run.dues)} m`,
    run.crude >= 0.05 && `crude +${fmtL(run.crude)} L`, run.fuel >= 0.05 && `fuel +${fmtL(run.fuel)} L`,
    run.refill && `nitro refill −${fmt(run.refill)} m`, run.repaired && `repairs −${fmt(run.repaired)} m`,
    run.totals && `totaled ${run.totals}, +${fmt(run.scrap)} scrap`, run.beatTank && `the tank scrapped, +${TANK.scrap} scrap`,
    arOn() && `police heat ${heatPct()}`, hint() && `<i>stuck? ${hint()}</i>`]
    .filter(Boolean).join(' · ');
}
// ... and in full, on the act card: the run (in the garage: mid-run, the pause menu's, there is none), then where you
// stand
function runRows() {
  const r = run.race, rows = [];
  if (run.phase === 'garage' && run.gain != null) {
    rows.push(['Last run', `+${fmt(run.gain)} m${run.newBest ? ', a new best' : ''}`]);
    if (r) rows.push(['Race', r.dnf ? `DNF: ${dnf(r)}` : `${r.start > FIELD ? 'from the back' : 'from P' + r.start} to P${r.p}`],
      ['Points', `+${r.points}` + (r.fresh ? ` (${r.fresh} for new places)` : '')]);
    if (run.team) rows.push(['Team places', `+${fmt(run.team)} pts`]);
    if (run.crude >= 0.05 || run.fuel >= 0.05) rows.push(['Oil', `crude +${fmtL(run.crude)} L, fuel +${fmtL(run.fuel)} L`]);
    if (run.dues) rows.push(['Racing', `+${fmt(run.dues)} m`]);
    if (run.refill) rows.push(['Nitro refill', `−${fmt(run.refill)} m`]);
    if (run.repaired) rows.push(['Repairs', `−${fmt(run.repaired)} m`]);
    if (run.totals) rows.push(['Totaled', `${run.totals}, +${fmt(run.scrap)} scrap`]);
    if (run.beatTank) rows.push(['The tank', `scrapped, +${TANK.scrap} scrap`]);
  }
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
// card or tutorial the same run brought; a new game's, on to the Driving tutorial and its first run
function closeCard() {
  if (screenFrom.length) return showScreen(screenFrom.pop(), true);
  closeMenu();
  popTour();
}

// ---- garage ----
let garageTab = 'workshop';
function renderGarage(bought) {
  if (!pageOpen(garageTab)) garageTab = PAGES.map(([id]) => id).find(pageOpen) ?? 'workshop';
  $('bank').textContent = `${money(progress.bank)} m` + (progress.racing ? ` · ${money(progress.points)} pts` : '') +
    (fleetOpen() ? ` · ${money(progress.fuel)} L` : '') + (gangOpen() ? ` · ${money(progress.scrap)} scrap` : '') + ' to spend';
  $('act-title').textContent = `${actTitle() ?? 'GARAGE'} ▸`;
  $('report').innerHTML = runLine();
  const onPage = page => Object.keys(UPGRADES).filter(id => !UPGRADES[id].opens && pageOf(UPGRADES[id]) === page && shows(id));
  const fresh = onPage(garageTab).filter(unseen); // on the page you're looking at: seen now
  if (fresh.length) { progress.seen.push(...fresh); save(); }
  // the tabs you have, then any in sight for sale: a tap buys it (the owner, 23 Oct)
  const forSale = (page, name, id = TAB[page], why = whyNot(id)) => `<button data-buy="${id}" data-tab="${page}" class="sale"` +
    `${why ? ' disabled' : ''}>${name}<small>${why && why !== 'short' ? why : price(id, cost(id))}</small></button>`;
  $('tabs').innerHTML = PAGES.map(([id, name]) => pageOpen(id) ? `<button data-tab="${id}" class="` +
    `${id === garageTab ? 'on' : ''}${onPage(id).some(unseen) ? ' new' : ''}">${name}</button>` : inSight(TAB[id]) ? forSale(id, name) : '').join('');
  $('engine-row').hidden = garageTab !== 'workshop' || !pageOpen('workshop'); // the engines you have; the next one is a card
  $('engine-row').innerHTML = ENGINES.slice(0, lvl('engine') + 1).map((e, i) =>
    `<button data-engine="${i}"${i === progress.engine ? ' class="on"' : ''}>${e.name}</button>`).join('');
  const onTab = ([id, u]) => !u.opens && pageOf(u) === garageTab && shows(id);
  const d = progress.damage;
  $('drive').textContent = wrecked() ? `LIMP ${LIMP} m ▶` : 'DRIVE ▶'; // a wreck can always limp: no dead end
  // from act IV it stays with its AUTO switch (damage.js), damaged or not, so the switch can be turned off again
  const auto = gangOpen() ? `<button data-autorepair${progress.autoRepair ? ' class="on"' : ''}>AUTO ${progress.autoRepair ? 'ON' : 'OFF'}</button>` : '';
  const state = d > 0 ? `${Math.round(d)}% damage · rev limit −${fmt(revLoss())} rpm` +
    `${progress.broken.length ? ` · broken: ${progress.broken.map(ordinal).join(', ')}` : ''}` : 'no damage';
  const fix = d > 0 ? `<button data-repair${progress.bank >= REPAIR ? '' : ' disabled'}>${progress.bank >= repairCost() ? 'Repair all' : 'Repair what I can'}` +
    ` · ${fmt(Math.min(repairCost(), Math.floor(progress.bank / REPAIR) * REPAIR))} m</button>` : '';
  const repairCard = garageTab === 'workshop' && (d > 0 || auto) ? `<div class="card repair"><b>Repair</b><small>${state}</small>${fix}${auto}</div>` : '';
  const first = pageOpen(garageTab) ? '' : `<p class="buy-tab">Buy the ${PAGES.find(([id]) => id === garageTab)[1]}: tap its tab.</p>`;
  // the Fortress page, act 5's, while it is being built: a sign saying so (the owner, 29 Oct: for the playtesters)
  const building = garageTab === 'fortress' && pageOpen('fortress') ? `<div class="card building"><b>UNDER CONSTRUCTION</b>` +
    `<small>Act V is being built a piece at a time, more with each update. Until then the tanks keep coming, each one ` +
    `tougher.</small></div>` : '';
  $('cards').innerHTML = first + repairCard + building + (garageTab === 'fleet' && pageOpen('fleet') ? exchangeCard() + roleCard() : '') +
    Object.entries(UPGRADES).filter(onTab).map(([id, u]) => {
    if (isLocked(id)) return `<div class="card locked"><b>${u.name}</b><small>${whyNot(id)}</small></div>`;
    const l = lvl(id), why = whyNot(id), max = maxOf(u), steps = typeof u.max === 'function' ? 0 : max;
    const pips = steps > 1 ? `<i>${'■'.repeat(l)}${'□'.repeat(steps - l)}</i>` : '';
    const info = max > 1 || steps === 0 ? u.info(l) + (why !== 'max' && !why.startsWith('finish') ? ` → ${u.info(l + 1)}` : '') : u.info();
    const toggle = u.on?.some(n => progress.off[n]) ? `<button disabled>needs ${UPGRADES[u.on.find(n => progress.off[n])].name} on</button>`
      : `<button data-toggle="${id}"${progress.off[id] ? '' : ' class="on"'}>${progress.off[id] ? 'OFF' : 'ON'}</button>`;
    const button = why === u.locked ? `<button disabled>${why}</button>` : why === 'max' ? (u.max !== 1 && !u.toggle ? '<button disabled>MAX</button>' : toggle)
      : why.startsWith('needs') ? `<button disabled>${why}</button>`
      : `<button data-buy="${id}"${why ? ' disabled' : ''}>${price(id, cost(id))}</button>` +
        (steps === 0 && !why ? `<button data-max="${id}">all I can</button>` : '') + // the grid: many slots at once
        (u.toggle && l ? toggle : ''); // a switch with more levels to buy (Fuel madness)
    const tip = l && tourFor(id) ? `<button class="tip" data-tour="${tourFor(id)}" title="how it works">?</button>` : ''; // once bought
    return `<div class="card${id === bought ? ' bought' : ''}"><b>${u.name}</b>${tip}${pips}<small>${info}</small>${button}</div>`;
  }).join('');
  syncRoles(); // oil.js: the role card's buttons, as far as the crew goes
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
  if ('autorepair' in b.dataset) { progress.autoRepair = !progress.autoRepair; save(); }
  if (('exchange' in b.dataset || 'exchangeAll' in b.dataset) && convert('exchange' in b.dataset ? exchange : Infinity)) beep(1760, 0.08);
  if (i) { progress.engine = +i; save(); refreshCar(); }
  if (toggle) { progress.off[toggle] = !progress.off[toggle]; save(); }
  if (b.dataset.role) { makeRole(b.dataset.role, +b.dataset.by); plan = null; save(); } // oil.js: the role card
  if (b.id === 'drive') return drive();
  renderGarage(id ?? max);
};

$('garage').oninput = e => { // the Exchange's slider: only its button changes, so the drag carries on
  if (e.target.dataset.role) return slideRole(e.target); // oil.js: the role card's
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
  if (run.boss) openCard('tanksent'); // boss.js: a boss fight, said so over the road before the lights (the owner, 27 Oct)
}

// the tapes the stereo plays (stereo.js): the War Rig radio's while it is bought and switched on (gang.js), or synthwave
const onRadio = () => TAPES.filter(t => !!t.war === (lvl('warradio') > 0 && !progress.off.warradio));

// ---- heads-up display: the run ----
let shownPhase, shownCount, passedBest = false, shownReveal = false;
function renderRun() {
  if (run.phase !== shownPhase) { // a new phase starts
    if (run.phase === 'run') { flash('GO!', '#5f5', true); beep(1320, 0.5); }
    if (run.phase === 'finish') { flash(run.beatTank ? 'TANK DOWN!' : 'TIME!', '#ec4', true); beep(880, 0.8); }
    if (run.phase === 'garage') renderGarage();
    // act V's card once the tank is beaten, after its race or in a save from before act 5 (the tank's own card, popped up
    // as you drove off, ended that run's pop-ups); else a system new this run: its tutorial (tutorial.js); a new game: its
    // first act's card, over the road
    if (run.phase === 'garage' && progress.tanks && !progress.toured.includes('act5')) { progress.toured.push('act5'); save(); openCard('act5'); }
    else if (run.phase === 'garage' || run.phase === 'starting' && !progress.runs) popTour();
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

// stalled, or standing still for 1.5 s in a run: the windshield says what to do next, in the words of the layout you
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
  blurb: 'A few seconds to get as far as you can. Every meter buys upgrades: power, gears, time, driver aids.',
  gears: topGear,
  engine: () => progress.engine, // the garage's engines, not the menu's
  tune: applyUpgrades,
  madness: () => run.phase === 'run' && !progress.off.baddrivers ? madShare(lvl('baddrivers')) : 0, // gang.js
  rust: () => omenRust(), // oil.js (it loads later)
  start() { // a new game goes straight onto the road, its first act's card up first, then the Driving tutorial (unless
    // seen): no garage before the first run, with nothing in it yet (the owner, 23 Oct)
    Object.assign(run, { phase: 'garage', best: progress.best }); shownPhase = null;
    if (!progress.runs) { drive(); markTours('act1', 'driving'); }
    report('start'); // reporting.js
  },
  pause: () => save(), // the menu opened: the time played so far is kept
  endRun() { if (run.phase === 'run') finishRun(); }, // the pause menu's END RUN: as if the time ran out
  stats() { // STATS and SHARE: an act's numbers only once it is open (never a word of the race before the reveal)
    const time = Math.floor(progress.time / 60), s = [['Time played', time < 60 ? `${time} min` : `${Math.floor(time / 60)} h ${time % 60} min`],
      ['Runs', fmt(progress.runs)], ['Best run', `${fmt(progress.best)} m`], ['Distance driven', `${fmt(progress.driven)} m`]];
    if (progress.racing) s.push(['Races', fmt(progress.races)], ['Best place', `P${progress.finish}`]);
    if (fleetOpen()) s.push(['Crew', `${fleetSize()} cars`]);
    if (gangOpen()) s.push(['Cars totaled', fmt(progress.totals)]);
    if (progress.tanks) s.push(['Tanks beaten', fmt(progress.tanks)]);
    return s;
  },
  stop() { run.phase = 'garage'; document.body.classList.remove('garage', 'low', 'has-flash', 'timing', 'has-fleet', 'ar-on', 'has-guns', 'has-heat', 'has-crew', 'has-tank', 'tag-on'); clearDamageView(); }, // earns nothing
  update: updateRun,
  render() { renderRun(); renderDamage(); renderSonar(); renderCrew(); renderGang(); renderPolice(); },
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
  key(k, repeat) { // Enter in the garage: DRIVE; act 3's crew (oil.js): , and . pick a spot, S sends a car (not on a key's
    if (k === 'Enter' && run.phase === 'garage') { drive(); return true; } // repeat: a press a car)
    if (!tracking() || run.phase !== 'run') return false;
    if (k === ',' || k === '.') { pickSpot(k === ',' ? -1 : 1); return true; }
    if (k === 's' || k === 'S') { if (!repeat) send(); return true; }
  },
};
