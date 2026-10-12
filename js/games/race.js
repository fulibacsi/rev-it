// The race hidden in Distance. A field of numbered racers drives the same road through the same traffic, lower
// numbers faster. Until you first get past #100 it looks like just one quick car pulling away from you; getting past
// it reveals the race. From then on every run is a race from your grid slot, and your result is your position when
// the clock runs out. Results pay race points, spent on the garage's Racing tab.
const FIELD = 100;      // racers
const RACER_GAP = 120;  // m between racers on the grid
const pace = n => (140 + (FIELD - n) * 1.9) / 3.6; // m/s racer n cruises at: #100 140 km/h ... #1 328 km/h
const ROLLING = [[1, 50], [2, 90], [3, 130], [4, 170], [5, 210], [6, 250]]; // rolling start levels: [gear, km/h]
const ordinal = n => n + (['st', 'nd', 'rd'][n - 1] ?? 'th');

Object.assign(UPGRADES, { // the Racing tab, paid in race points
  grid: { name: 'Grid', tab: 'racing', base: 1, growth: 1.035, max: () => FIELD + 1 - progress.finish,
          info: l => l ? `start P${FIELD + 1 - l}` : 'start at the back', locked: 'finish higher to unlock' },
  reckless: { name: 'Reckless driving', tab: 'racing', max: 1, base: 100,
              info: () => 'the oncoming lanes are yours too. From now on, collisions damage the car' },
  ecuRev: { name: 'ECU: rev limit', tab: 'racing', max: 4, base: 60, growth: 1.8, needs: ['reckless'],
            info: l => `+${300 * l} rpm past the factory redline` },
  ecuPower: { name: 'ECU: power', tab: 'racing', max: 4, base: 80, growth: 1.8, needs: ['reckless'],
              info: l => `+${8 * l}% torque on top` },
  rolling: { name: 'Rolling start', tab: 'racing', max: ROLLING.length, base: 5, growth: 2.3,
             gate: l => ROLLING[l][0] <= topGear() || 'needs Gearbox',
             info: l => l ? `${ROLLING[l - 1][1]} km/h in ${ordinal(ROLLING[l - 1][0])}` : 'standing start' },
});

const startSlot = () => FIELD + 1 - lvl('grid'); // the position you start in; 101 is behind #100

function racer(n, z) {
  return { z, dir: 1, lane: n % 2, x: MY_LANES[n % 2], v: 0, want: pace(n), racer: n, look: racerSprite(n, progress.racing),
           d: NaN, hit: -Infinity };
}
// the racers for a run, placed around your start: before the reveal just #100, 400 m up the road
function raceField() {
  if (!progress.racing) return [racer(FIELD, 400)];
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
function raceFinish(dnf) {
  if (!progress.racing) return null;
  if (dnf) return { start: run.slot ?? FIELD + 1, p: null, dnf, points: 0 };
  const p = position(), points = Math.max(0, FIELD + 1 - p);
  progress.points += points;
  progress.finish = Math.min(progress.finish, p);
  return { start: run.slot ?? FIELD + 1, p, points }; // before the reveal you started behind them all
}

// the racers either side of you, for the head-up display
function nearestRacers() {
  let front = null, back = null;
  for (const c of racers()) {
    if (ahead(c)) { if (!front || c.z < front.z) front = c; } else if (!back || c.z > back.z) back = c;
  }
  return { front, back };
}
