// The crew's oil, Distance's third act (decided 26 Oct: docs/design-notes.md, Act 3 redesign). Your crew has roles:
// racers race in their slots as the fleet always has; harvesters and brewers ride with you and are sent, a press of
// SEND a car, to the spots by the road: oil spots, which pump crude into the tank on the right A-pillar, and
// refineries, which brew it into fuel, the Crew page's money. A spot pays once it is fully crewed, until you drive past
// it (or an oil spot runs dry); then its crew rejoins you. The tracker beside the sonar shows the spots ahead, < and >
// pick one, and a tag on the windscreen says what it is. Each run's spots are drawn before it, on dice of their own;
// the first come scripted, with their tutorials: an oil puddle, then a refinery (oilScript).

// the roles' upgrades and the crew's, on the Crew page (fleet.js has the rest), paid in fuel. Prices: the design notes'
// first guesses, for tests/balance/act3.py to set
Object.assign(UPGRADES, {
  harvesting: { name: 'Harvesting', tab: 'fleet', max: 5, base: 5, growth: 3, needs: ['fleetTab'], story: () => progress.oil >= 1,
                info: l => l ? `harvesters pump ${20 * l}% more` : 'harvesters pump as they come' },
  brewing: { name: 'Brewing', tab: 'fleet', max: 5, base: 5, growth: 3, needs: ['fleetTab'], story: () => progress.oil >= 2,
             info: l => `${fmtL(brewRatio(l))} litres of crude make a litre of fuel` },
  crudeTank: { name: 'Crude tank', tab: 'fleet', max: 3, base: 10, growth: 2.5, needs: ['harvesting'],
               info: l => `the tank on the pillar holds ${tankSize(l)} litres` },
  sonarRange: { name: 'Sonar range', tab: 'fleet', max: 2, base: 10, growth: 3, needs: ['harvesting'],
                info: l => `the tracker reaches ${fmtKm(reach(l))}` },
  scouting: { name: 'Scouting', tab: 'fleet', max: 3, base: 15, growth: 2.5, needs: ['sonarRange'],
              info: l => l ? `before a run, what is on its ${SCOUT[l - 1] ? fmtKm(SCOUT[l - 1]) : 'whole road'}` : 'each run a surprise' },
  overfill: { name: 'Overfill', tab: 'fleet', max: 4, base: 20, growth: 2.5, needs: ['harvesting', 'brewing'],
              info: l => l ? `a spot takes ${25 * l}% more cars than it needs, each pumping its share` : 'a full spot takes no more' },
  wells: { name: 'Deep wells', tab: 'fleet', max: 4, base: 15, growth: 2.5, needs: ['harvesting'],
           info: l => l ? `oil spots hold ${25 * l}% more` : 'oil spots as they come' },
  doubleUp: { name: 'Double up', tab: 'fleet', max: 1, base: 60, needs: ['overfill'],
              info: () => 'a press of SEND sends two cars' },
});
const fmtL = n => (Math.round(n * 10) / 10).toString();
const fmtKm = m => m < 1000 ? `${m} m` : `${m / 1000} km`;
const TANK_L = [20, 35, 60, 100];        // litres of crude the tank holds a level
const tankSize = (l = lvl('crudeTank')) => TANK_L[l];
const REACH = [1000, 2000, 3000];      // m the tracker reaches a level of Sonar range: 1 km is 16 s at act 3's 60 m/s
const reach = (l = lvl('sonarRange')) => REACH[l];
const SCOUT = [2000, 4000];            // m of the run Scouting lists a level (the last level: all of it)
const brewRatio = (l = lvl('brewing')) => 2 - 0.2 * l; // litres of crude a litre of fuel
const ARRIVE = 1.6;                     // s a car takes to get to its spot; Crew tuning shortens it
const arrive = () => ARRIVE * (1 - 0.1 * lvl('fleetPace'));
const cap = s => Math.floor(s.count * (1 + 0.25 * lvl('overfill'))); // cars a spot takes
const harvest = () => 1 + 0.2 * lvl('harvesting');
const twice = () => lvl('doubleUp') > 0 && !progress.off.doubleUp; // a switch, as every one-level card is

// ---- the roles: racers race in their slots; harvesters and brewers ride with you. They are the crew's first paid off
// (the slowest, #100 down), so the racers on the grid are its quickest. From the gang on (act 4) the whole crew races
const crewOn = () => progress.racing && fleetSize() > 0 && !arOn();
const role = r => crewOn() ? Math.min(progress.roles[r] ?? 0, fleetSize()) : 0;
const riders = () => role('harvester') + role('brewer');
const racersOf = () => fleetSize() - riders(); // your crew on the grid
const isRider = n => inFleet(n) && n > FIELD - riders(); // race.js raceField: not on the grid
function makeRole(r, n) { // the script turns racers into harvesters or brewers; the role card moves them about
  const by = Math.max(-(progress.roles[r] ?? 0), Math.min(n, racersOf()));
  progress.roles[r] = (progress.roles[r] ?? 0) + by;
  return by;
}

// ---- a run's spots, drawn ahead of it (at the finish of the run before: crewPlan) on dice of their own, so the
// traffic's stay as they were. Oil spots in clusters and gaps, the first a rich one, refineries further apart (nudged
// clear of the oil), all of them bigger as the crew grows (from 0/3 to about 0/8 at the gang: the owner, 26 Oct,
// "moderately"). The spacing and rates: tests/balance/act3.py, 51 crew in 11-13 races (27 Oct). The check that the
// income stays steady for sensible play: five drawings, and the one whose yield for a model player (your pace of late,
// 1 s to react, 4 presses a second) is in the middle (Claude's call, for "within 25% of the target")
let dice = 1;
const roll = () => ((dice = (dice * 48271) % 2147483647) - 1) / 2147483646;
const between = (a, b) => a + (b - a) * roll();
const biggest = () => 3 + Math.round(5 * Math.min(1, fleetSize() / GANG));
const ROAD_END = 7000; // m: no run gets further
const OIL_RATE = 0.07, BREW_RATE = 0.2; // L/s a car pumps, and a car brews of crude, at a spot
function drawSpots() {
  const spots = [], big = biggest(), deep = 1 + 0.25 * lvl('wells');
  for (let z = between(300, 500), first = true; z < ROAD_END; z += roll() < 0.55 ? between(150, 350) : between(500, 900), first = false) {
    const count = first ? big : Math.max(2, big - Math.floor(roll() * 3)), rate = OIL_RATE * (first ? 1.3 : 0.7 + 0.6 * roll());
    spots.push({ kind: 'oil', z, count, rate, reserve: count * rate * between(10, 20) * deep });
  }
  if (progress.oil >= 2) for (let z = between(600, 900); z < ROAD_END; z += between(1000, 1600)) {
    while (spots.some(s => Math.abs(s.z - z) < 100)) z += 60; // not on top of an oil spot
    spots.push({ kind: 'refinery', z, count: Math.max(2, Math.round(big * (0.4 + 0.2 * roll()))), rate: BREW_RATE * (0.8 + 0.4 * roll()) });
  }
  return spots.sort((a, b) => a.z - b.z).map(s => Object.assign(s, { crew: 0, coming: [], done: false, got: 0, seen: null }));
}
function yieldOf(spots) { // what a model player makes of a run, in fuel (the crude at what it would brew)
  const v = Math.max(30, progress.pace), end = v * runTime(), free = { oil: role('harvester'), refinery: role('brewer') };
  let crude = progress.crude, fuel = 0;
  for (const s of spots) {
    if (s.z > end) break;
    const n = Math.min(cap(s), free[s.kind]), t = Math.min(reach(), s.z) / v - 1 - n / 4 - arrive();
    if (n < s.count || t <= 0) continue;
    if (s.kind === 'oil') crude += Math.min(s.reserve, s.rate * n * harvest() * t);
    else { const used = Math.min(crude, s.rate * n * t); crude -= used; fuel += used / brewRatio(); }
  }
  return fuel + (crude - progress.crude) / brewRatio();
}
function crewPlan() { // the next run's spots: drawn now, so Scouting can list them in the garage
  if (progress.oil < 2 || !crewOn()) return [];
  dice = 1 + (progress.runs * 7919) % 2147483646;
  return Array.from({ length: 5 }, drawSpots).map(s => [yieldOf(s), s]).sort((a, b) => a[0] - b[0])[2][1];
}
let plan = null; // the next run's spots, once drawn
const nextSpots = () => plan ??= crewPlan();
// Scouting (an upgrade): what is on the next run, listed in the garage without places, sizes or rates (the owner, 26
// Oct: so the garage doesn't turn into over-analysis)
function scouted() {
  const l = lvl('scouting'), upTo = SCOUT[l - 1] ?? ROAD_END, spots = nextSpots().filter(s => s.z <= upTo);
  if (!l || !spots.length) return '';
  const n = k => spots.filter(s => s.kind === k).length;
  return `next run${upTo < ROAD_END ? `, its first ${fmtKm(upTo)}` : ''}: ${n('oil')} oil, ${n('refinery')} ` +
    `refiner${n('refinery') === 1 ? 'y' : 'ies'}`;
}

// ---- the script (the owner, 26 Oct): the run after the 5th car, about 5 s in, an oil puddle (0/3) and three of your
// racers made harvesters, its tutorial; past it with crude in the tank, a refinery (0/2) and your last two racers made
// brewers, its tutorial. 15 s or so to send them each time (at act 2's 250 km/h rolling start: a run is 50 s and
// 2.2-4 km). The run over before the refinery, it comes about 5 s into the next; a spot missed comes again (Claude's
// calls)
const SCRIPT = 5; // cars before the oil
const scripted = () => crewOn() && progress.oil < 2 && fleetSize() >= SCRIPT;
const FIRST_PUDDLE = { kind: 'oil', z: 1400, count: 3, rate: 0.1, reserve: 60, scripted: true }; // richer than most: a first taste
const FIRST_REFINERY = { kind: 'refinery', count: 2, rate: 0.15, scripted: true }; // z: 1.1 km on from where you are
const newSpot = (s, z = s.z) => ({ ...s, z, crew: 0, coming: [], done: false, got: 0, seen: null });
function crewRun() { // startRun: this run's spots
  Object.assign(run, { spots: [], pick: null, t: 0, told: false, crude: 0, fuel: 0, worked: 0, sent: 0 });
  if (scripted()) run.spots = progress.oil === 0 ? [newSpot(FIRST_PUDDLE)] : [];
  else run.spots = nextSpots();
  plan = null;
}
function firstRefinery() { // the script's second half: the refinery, your last two racers made brewers, its tutorial
  run.spots.push(newSpot(FIRST_REFINERY, odo + 1100));
  makeRole('brewer', 2 - progress.roles.brewer);
  if (!progress.toured.includes('refinery')) openTour('refinery', true);
}
function crewEnd() { // finishRun: the spots still at work count as passed
  for (const s of run.spots ?? []) if (!s.done) spotDone(s, true);
}

// ---- the run: cars on their way get there, a full spot pays until you are past it (or it is dry), and then its
// crew is yours to send again
const busy = kind => run.spots.reduce((n, s) => n + (s.kind === kind && !s.done ? s.crew + s.coming.length : 0), 0);
const free = kind => role(kind === 'oil' ? 'harvester' : 'brewer') - busy(kind);
const spotsAhead = () => run.spots.filter(s => !s.done && s.z > odo && (s.scripted || s.z - odo <= reach())); // the tracker's
function crewTick(dt) {
  for (let i = traffic.length; i--;) if (traffic[i].gone) traffic.splice(i, 1); // runners there, or out of sight
  if (!crewOn()) return;
  run.t += dt;
  if (scripted() && !run.told && run.t > 5) { // about 5 s in: the puddle's tutorial, or the refinery still to come
    run.told = true;
    if (progress.oil > 0) firstRefinery();
    else {
      makeRole('harvester', 3 - progress.roles.harvester); // once: a puddle missed comes again with the same three
      if (!progress.toured.includes('oil')) openTour('oil', true);
    }
  }
  if (!run.spots?.length) return;
  for (const s of spotsAhead()) s.shown ??= run.t; // when it came on the tracker
  for (const s of run.spots) {
    while (s.coming.length && s.coming[0] <= run.t) { s.coming.shift(); s.crew++; }
    if (s.done) continue;
    if (odo > s.z + 3 || s.kind === 'oil' && s.reserve <= 0) { spotDone(s); continue; }
    if (s.crew < s.count) continue;
    run.worked += s.crew * dt; // the simulation's measure: crew-seconds at work
    if (s.kind === 'oil') {
      const got = Math.min(s.rate * s.crew * harvest() * dt, s.reserve, tankSize() - progress.crude);
      s.reserve -= got; s.got += got; progress.crude += got; run.crude += got;
    } else {
      const used = Math.min(s.rate * s.crew * dt, progress.crude), fuel = used / brewRatio();
      progress.crude -= used; s.got += fuel; progress.fuel += fuel; run.fuel += fuel;
    }
  }
  if (!run.pick || run.pick.done || !spotsAhead().includes(run.pick)) run.pick = spotsAhead().find(s => s.crew + s.coming.length < s.count) ?? spotsAhead()[0] ?? null;
}
function spotDone(s, end) { // passed, dry, or (end) the run over
  s.done = true; s.coming = []; // its crew is yours again (busy counts only what isn't done)
  if (!end && s.got >= 0.05) flash(`+${fmtL(s.got)} L ${s.kind === 'oil' ? 'CRUDE' : 'FUEL'}`, '#5f5', false);
  if (!s.scripted || s.got <= 0) return;
  if (s.kind === 'oil' && progress.oil === 0) { // past the puddle with crude: the refinery
    progress.oil = 1;
    if (!end) { run.told = true; firstRefinery(); }
  }
  if (s.kind === 'refinery') { progress.oil = 2; plan = null; } // the first fuel: the oil is on
}
// < and >: the spot before or after the one picked, on the tracker; SEND: a car of yours to it (two with Double up),
// if one of the right role is free and the spot has room
function pickSpot(by) {
  const list = spotsAhead(), i = list.indexOf(run.pick);
  if (list.length) run.pick = list[Math.max(0, Math.min(list.length - 1, i + by))];
}
function send() {
  const s = run.pick;
  if (run.phase !== 'run' || !s || s.done) return false;
  let sent = 0;
  for (let n = twice() ? 2 : 1; n > 0 && free(s.kind) > 0 && s.crew + s.coming.length < cap(s); n--) {
    s.coming.push(run.t + arrive());
    runner(s);
    sent++;
  }
  beep(sent ? 990 : 180, 0.04);
  if (!sent) flash(s.crew + s.coming.length >= cap(s) ? 'FULL' : `NO ${s.kind === 'oil' ? 'HARVESTER' : 'BREWER'} FREE`, '#fb3', false);
  return sent > 0;
}
// where a sensible player would send a car now (tests/balance/act3.py's bot): a spot a second after it shows, the one
// with the most to pay before you pass it that the free cars can fill, the short ones before the full ones (Overfill)
function bestSpot() {
  const v = Math.max(20, speed), worth = s => payRate(s) * Math.max(0, (s.z - odo) / v - arrive());
  const fits = s => { const want = s.count - s.crew - s.coming.length;
    return want > 0 ? want <= free(s.kind) : s.crew + s.coming.length < cap(s) && free(s.kind) > 0; };
  const open = spotsAhead().filter(s => run.t - s.shown >= 1 && fits(s) && (s.kind === 'oil' || progress.crude > 0));
  const short = open.filter(s => s.crew + s.coming.length < s.count);
  return (short.length ? short : open).sort((a, b) => worth(b) - worth(a))[0] ?? null;
}
// a car you send comes past you on the right shoulder and races off to its spot, quicker and quicker (drawn only:
// road.js updateTraffic leaves it to runnerDrive), until it is there or out of sight
function runner(s) {
  const n = FIELD - (run.sent++ % Math.max(1, riders())); // one of the riders: the slowest numbers
  traffic.push({ runner: s, fleet: true, dir: 1, x: SHOULDER - 0.6, z: odo - 20, v: speed + 15, look: racerSprite(n, true, true),
                 d: NaN, hit: -Infinity, seen: null });
}
function runnerDrive(c, dt) {
  c.v = Math.min(c.v + 30 * dt, speed + 100);
  c.z += c.v * dt;
  if (c.z >= c.runner.z || c.z - odo > 900) c.gone = true;
}

// ---- by the road: the spots (a puddle for a small oil spot, a nodding pumpjack for a big one, a refinery), and your
// crew's cars parked at a spot it works (road.js MARKS draws them; ref: where it is on the screen, for the tag)
function crewMarks() {
  const out = [];
  for (const s of run.spots ?? []) {
    if (s.z < odo - 20 || s.z - odo > 1600) continue;
    out.push({ z: s.z, kind: s.kind === 'refinery' ? 'refinery' : s.count <= 3 ? 'puddle' : 'jack', ref: s });
    for (let i = 0; i < Math.min(s.crew, 4); i++) out.push({ z: s.z - 7 - 5 * Math.floor(i / 2), kind: 'parked', value: { n: FIELD - i, side: i % 2 } });
  }
  return out;
}

// ---- what you see: the tracker on the sonar's right (the owner's: on the far left your hand would hide it), the
// spots ahead on a log scale, near ones spread out, far ones packed close; a tag on the windscreen on the spot picked,
// in the head-up display's look and the sonar's green (not act 4's red gunsight, which stays new); the crude tank on
// the right A-pillar. Redrawn with the sonar, 15 times a second
const TRACK = [74, 13]; // the strip's near and far ends, in the tracker's frame
const trackY = d => TRACK[0] + (TRACK[1] - TRACK[0]) * Math.min(1, Math.log1p(Math.max(0, d) / 50) / Math.log1p(reach() / 50));
const kindName = s => s.kind === 'oil' ? 'OIL' : 'REFINERY';
const payRate = s => s.kind === 'oil' ? s.rate * s.count * harvest() : s.rate * s.count / brewRatio(); // L/s, full
let crewAt = 0;
function renderCrew() {
  const road = run.phase !== 'garage', on = road && !!run.spots?.length, now = performance.now();
  document.body.classList.toggle('has-crew', on);
  document.body.classList.toggle('has-tank', road && crewOn() && (progress.oil > 0 || role('harvester') > 0)); // from the puddle on
  const s = on && run.phase === 'run' ? run.pick : null, seen = s?.seen;
  document.body.classList.toggle('tag-on', !!seen);
  if (seen) {
    const k = 1 / canvas.px, x = (seen[0] + seen[2] / 2) * k, y = seen[1] * k;
    Object.assign($('crew-tag').style, { left: `${x}px`, top: `${y}px` });
    text('crew-tag', `${kindName(s)} ${s.crew + s.coming.length}/${s.count} · ${fmtL(payRate(s))}/s · ${Math.round(s.z - odo)} m`);
  }
  if (!road || now - crewAt < 66) return;
  crewAt = now;
  $('tank-fill').setAttribute('height', (56 * Math.min(1, progress.crude / tankSize())).toFixed(1));
  $('tank-fill').setAttribute('y', (72 - 56 * Math.min(1, progress.crude / tankSize())).toFixed(1));
  text('tank-lcd', `${fmtL(progress.crude)}/${tankSize()}`);
  if (!on) return;
  $('track-spots').innerHTML = spotsAhead().map(s => {
    const y = trackY(s.z - odo), n = s.crew + s.coming.length;
    const icon = s.kind === 'oil' ? `<circle cx="9" cy="${y.toFixed(1)}" r="3.4"/>` : `<rect x="5.6" y="${(y - 3.4).toFixed(1)}" width="6.8" height="6.8"/>`;
    return `<g class="${s.crew >= s.count ? 'pumping' : n >= s.count ? 'coming' : 'short'}${s === run.pick ? ' pick' : ''}">` +
      (s === run.pick ? `<rect class="sel" x="2" y="${(y - 6).toFixed(1)}" width="38" height="12" rx="2"/>` : '') +
      `${icon}<text x="15" y="${(y + 3).toFixed(1)}">${n}/${s.count}</text></g>`;
  }).join('');
  text('crew-free', `${free('oil')}H ${role('brewer') ? `${free('refinery')}B` : ''}`);
}

// ---- the garage: who does what (from the oil on), and what Scouting has seen of the next run. A racer moved into a
// role leaves the grid; one moved out races again
function roleCard() {
  if (progress.oil < 1 || !crewOn()) return '';
  const row = (r, name) => `<span class="role">${name} <b>${role(r)}</b><button data-role="${r}" data-by="-1"` +
    `${role(r) ? '' : ' disabled'}>−</button><button data-role="${r}" data-by="1"${racersOf() ? '' : ' disabled'}>+</button></span>`;
  return `<div class="card roles"><b>Roles</b><small>racers race for metres and places · harvesters pump crude · ` +
    `brewers brew it into fuel · a car with no spot to work earns nothing${scouted() ? ` · <i>${scouted()}</i>` : ''}</small>` +
    `<span class="role">Racers <b>${racersOf()}</b></span>${row('harvester', 'Harvesters')}` +
    `${progress.oil >= 2 ? row('brewer', 'Brewers') : ''}</div>`;
}

// ---- the tutorials: popped up mid-run by the script, and kept under HOW TO DRIVE
TUTORIALS.splice(TUTORIALS.findIndex(t => t.id === 'fleet') + 1, 0,
  { id: 'oil', name: 'Oil', for: ['harvesting', 'crudeTank', 'sonarRange', 'scouting', 'wells', 'overfill', 'doubleUp'],
    open: () => progress.oil > 0 || progress.roles.harvester > 0, pages: [
    { title: 'OIL BY THE ROAD', at: '#tracker',
      both: 'Your crew can work the oil by the road. The tracker beside the sonar shows what is coming: each spot, and ' +
        'how many cars it needs.' },
    { title: 'HARVESTERS',
      both: 'Three of your racers are harvesters now: they ride with you instead. A spot pays once it is fully crewed, ' +
        'until you drive past it; then its crew comes back to you.' },
    { title: 'SEND', at: '#crew-ctl',
      touch: 'Tap SEND once for each car; ‹ and › pick the spot.', desk: 'Press S once for each car; , and . pick the ' +
        'spot. Or click the buttons.',
      both: 'This puddle needs three: send them before you get there.' },
  ] },
  { id: 'refinery', name: 'Refineries', for: ['brewing'], open: () => progress.oil >= 2 || progress.roles.brewer > 0, pages: [
    { title: 'A REFINERY', at: '#tracker',
      both: 'A refinery brews your crude into fuel: the Crew page\'s money now.' },
    { title: 'BREWERS', at: '#crew-ctl',
      both: 'Your last two racers are brewers now: send them to the refinery. It brews while there is crude in the tank, ' +
        'until you drive past it.' },
    { title: 'THE TANK', at: '#tank',
      both: 'Your crude waits in the tank on the right pillar, from run to run.' },
    { title: 'ROLES',
      both: 'The Crew page in the garage splits your crew: racers race for metres and places, harvesters pump crude, ' +
        'brewers make fuel. A car with no spot to work earns nothing.' },
  ] },
);

// ‹ SEND ›: as the finger lands (a tap's click comes after it lifts, and mashing wants each press at once)
for (const [id, act] of [['crew-prev', () => pickSpot(-1)], ['crew-send', send], ['crew-next', () => pickSpot(1)]])
  $(id).onpointerdown = e => { e.preventDefault(); act(); };
