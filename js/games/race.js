// The race hidden in Distance. A field of numbered racers drives the same road through the same traffic, lower
// numbers faster. Until you first get past #100 it looks like just one quick car pulling away from you; getting past
// it reveals the race. From then on every run is a race from your grid slot, and your result is your position when
// the clock runs out. Race points, spent on the garage's Racing tab, come from two places: every position is worth
// points once, the first time you finish there (1 for 100th, 2 for 99th ... 100 for 1st: 5,050 in all), and every
// race pays a tenth of that for where you finish (P61: 4, P20: 9, P1: 10), so you always earn a little. It goes by
// where you finish, not how many you passed: starting at the back on purpose, or swapping places, pays nothing extra.
const FIELD = 100;      // racers
const RACER_GAP = 120;  // m between racers on the grid
// m/s racer n cruises at: #100 140 km/h, 2 km/h more a place to #20 at 300 km/h, then 8 more a place to #1 at
// 452 km/h: the top 20 take the reckless kit, #1 is past 6th gear's reach (7th and nitro)
const pace = n => (n >= 20 ? 140 + (FIELD - n) * 2 : 300 + (20 - n) * 8) / 3.6;
const ROLLING = [[1, 50], [2, 90], [3, 130], [4, 170], [5, 210], [6, 250]]; // rolling start levels: [gear, km/h]
const ordinal = n => n + (['st', 'nd', 'rd'][n - 1] ?? 'th');
const nitroTank = (l = lvl('nitro')) => 2 * l; // seconds of nitro the tank holds
const NITRO_REFILL = 100; // metres per second of nitro, refilled before each run

Object.assign(UPGRADES, { // the Racing tab, paid in race points
  // prices: everything here costs about the 5,050 points the positions pay once, plus places gained along the way
  grid: { name: 'Grid', tab: 'racing', base: 1, growth: 1.035, max: () => FIELD + 1 - progress.finish,
          info: l => l ? `start P${FIELD + 1 - l}` : 'start at the back', locked: 'finish higher to unlock' },
  reckless: { name: 'Reckless driving', tab: 'racing', max: 1, base: 100,
              info: () => 'the oncoming lanes are yours too. From now on, collisions damage the car' },
  cooling: { name: 'Cooling', tab: 'racing', max: 3, base: 60, growth: 2, needs: ['reckless'],
             info: l => l ? `the engine heats up ${15 * l}% slower` : 'factory radiator' },
  ecuRev: { name: 'ECU: rev limit', tab: 'racing', max: 4, base: 50, growth: 1.6, needs: ['reckless'],
            info: l => `+${300 * l} rpm past the factory redline` },
  ecuPower: { name: 'ECU: power', tab: 'racing', max: 4, base: 60, growth: 1.6, needs: ['reckless'],
              info: l => `+${8 * l}% torque on top` },
  nitro: { name: 'Nitro', tab: 'racing', max: 5, base: 100, growth: 1.5, needs: ['ecuPower'],
           info: l => `${nitroTank(l)} s tank: +${Math.round((NITRO - 1) * 100)}% torque, heat in the red. Hold N or NOS; ` +
             `refills cost ${NITRO_REFILL} m a second` },
  gear7: { name: '7th gear', tab: 'racing', max: 1, base: 600, needs: ['nitro'], gate: () => lvl('gears') < 3 ? 'needs 6 gears' : true,
           info: () => 'a tall overdrive: hundreds more km/h, if nitro gets you there' },
  daredevil: { name: 'Daredevil', tab: 'racing', max: 1, base: 200, gate: () => everythingElse() || 'max everything else first',
               info: () => 'every second in the oncoming lanes puts 0.5 s back in the nitro tank' },
  rolling: { name: 'Rolling start', tab: 'racing', max: ROLLING.length, base: 5, growth: 2.3,
             gate: l => ROLLING[l][0] <= topGear() || 'needs Gearbox',
             info: l => l ? `${ROLLING[l - 1][1]} km/h in ${ordinal(ROLLING[l - 1][0])}` : 'standing start' },
});

const everythingElse = () => Object.keys(UPGRADES).every(id => id === 'daredevil' || id === 'grid' || lvl(id) >= maxOf(UPGRADES[id]));
const startSlot = () => FIELD + 1 - lvl('grid'); // the position you start in; 101 is behind #100

function racer(n, z) {
  return { z, dir: 1, lane: n % 2, x: MY_LANES[n % 2], v: 0, want: pace(n), racer: n, look: racerSprite(n, progress.racing),
           d: NaN, hit: -Infinity };
}
// before the reveal #100 is one quick car up the road. Its head start shrinks as the car gets built, so it can only be
// caught once the car is nearly done (around run 20 for a perfect player, just before the bell): [share of the car
// upgrades bought, metres ahead], straight lines in between
const HEAD_START = [[0, 1300], [0.6, 1300], [0.8, 1050], [1, 400]];
function headStart() {
  let have = 0, all = 0;
  for (const [id, u] of Object.entries(UPGRADES)) if (!u.tab) { have += lvl(id); all += maxOf(u); }
  const c = have / all, i = HEAD_START.findIndex(([at]) => at >= c), [c1, h1] = HEAD_START[i], [c0, h0] = HEAD_START[Math.max(0, i - 1)];
  return c1 === c0 ? h1 : h0 + (h1 - h0) * (c - c0) / (c1 - c0);
}
// the racers for a run, placed around your start: before the reveal just #100, some way up the road
function raceField() {
  if (!progress.racing) return [racer(FIELD, headStart())];
  const s = startSlot(), cars = [];
  for (let n = 1; n <= FIELD; n++) cars.push(racer(n, n < s ? (s - n) * RACER_GAP : -(n - s + 1) * RACER_GAP));
  return cars;
}
const racers = () => traffic.filter(c => c.racer);
const ahead = c => c.z + CAR_LEN / 2 > odo - (MY_REAR - MY_FRONT) / 2; // its middle is past yours
const position = () => { // racers not on the road (before the reveal: all but #100) are the faster ones, ahead
  const field = racers();
  return 1 + FIELD - field.length + field.filter(ahead).length;
};

// on the grid until GO: the racers wait in their slots
function holdRacers() { for (const c of racers()) { c.v = 0; c.z = c.grid ??= c.z; } }

function raceGo() { // the racers roll off at their pace; a rolling start puts you in gear at speed
  for (const c of racers()) c.v = c.want;
  const l = lvl('rolling');
  if (!l || !progress.racing) return;
  const [g, kmh] = ROLLING[l - 1];
  gear = g; speed = kmh / 3.6; rpm = wheelRpm(); locked = true; clutchPedal = 0;
  const [x, y] = slotOf(g); Object.assign(lever, { x, y, path: null });
}

// during a run: getting past #100 for the first time reveals the race
function raceTick() {
  if (progress.racing || ahead(racers()[0])) return false;
  progress.racing = true;
  for (const c of racers()) c.look = racerSprite(c.racer, true);
  return true;
}

// at the bell: your position is your result; it pays race points and unlocks grid slots. A run ended by a crash
// (dnf: why) did not finish: no points.
const firstTime = (from, to) => { let pts = 0; for (let k = to; k < from; k++) pts += FIELD + 1 - k; return pts; }; // positions to..from-1
function raceFinish(dnf) {
  if (!progress.racing) return null;
  const start = run.slot ?? FIELD + 1; // before the reveal you started behind them all
  if (dnf) return { start, p: null, dnf, points: 0 };
  const p = position(), finish = Math.ceil(Math.max(0, FIELD + 1 - p) / 10), fresh = firstTime(progress.finish, p);
  progress.points += finish + fresh;
  progress.finish = Math.min(progress.finish, p);
  return { start, p, points: finish + fresh, finish, fresh };
}

// the racers either side of you, for the head-up display
function nearestRacers() {
  let front = null, back = null;
  for (const c of racers()) {
    if (ahead(c)) { if (!front || c.z < front.z) front = c; } else if (!back || c.z > back.z) back = c;
  }
  return { front, back };
}
