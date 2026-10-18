// The Fleet, Distance's third act. Once you have won a race the racers you beat take offers, the slowest first. One you
// pay off keeps its number, its place in the field and its pace, in your team's colours, and races for you: it gives
// way when you come up behind it, and moves across to block a rival closing on it from behind. Your position counts
// the rivals only. Paid in miles, from the Fleet page's Exchange (distance.js). The upgrades are fleet-wide: dues (a
// share of the metres your fleet drives, paid at the finish), tuning, and a flash used for you.

Object.assign(UPGRADES, {
  // prices: tests/balance/act3.py, 51 cars (the gang, act 4) after the first win, buying dues first. Each racer 6%
  // dearer took about 26 races; the owner (18 Oct) wanted about 15, the Fleet being the weakest act: 3.5% takes 14-16
  fleet: { name: 'Pay off a racer', tab: 'fleet', base: 1, growth: 1.035, max: () => FIELD - 1, locked: "#1 won't sell",
           info: l => !l ? 'every racer for themselves' : l === 1 ? '#100 races for you'
             : `#${FIELD + 1 - l} to #100 race for you` },
  dues: { name: 'Fleet dues', tab: 'fleet', max: 5, base: 5, growth: 2, needs: ['fleet'],
          info: l => l ? `each fleet car pays you ${10 * l}% of the metres it drives` : 'your fleet drives for nothing' },
  fleetPace: { name: 'Fleet tuning', tab: 'fleet', max: 5, base: 3, growth: 2, needs: ['fleet'],
               info: l => l ? `fleet cars ${5 * l}% quicker` : 'fleet cars at their old pace' },
  fleetFlash: { name: 'Fleet flash', tab: 'fleet', max: 1, base: 15, needs: ['fleet', 'flash'],
                info: () => 'a fleet car flashes slower traffic ahead of it out of your lane' },
});
const fleetSize = () => lvl('fleet');
const inFleet = n => progress.racing && n > FIELD - fleetSize(); // racer n is yours
const fleetPace = () => 1 + 0.05 * lvl('fleetPace');
// the dues for a run: a share of the metres your fleet drove from the grid, paid into the bank at the finish
const fleetDues = () => Math.round(0.1 * lvl('dues') * racers().reduce((m, c) => m + (c.fleet ? Math.max(0, c.z - c.grid) : 0), 0));

// the sonar on the A-pillar: your fleet cars up to 500 m behind you, by distance (out from you at the top) and by how
// far across the road they are (the angle)
const SONAR = 500; // m
function renderSonar() {
  const on = run.phase !== 'garage' && fleetSize() > 0;
  document.body.classList.toggle('has-fleet', on);
  if (!on) return;
  $('sonar-blips').innerHTML = racers().filter(c => c.fleet && c.z < odo && odo - c.z < SONAR).map(c => {
    const r = 8 + 52 * (odo - c.z) / SONAR, a = clamp((c.x - carX) / 7, -1, 1) * 36 * Math.PI / 180;
    return `<circle cx="${(64 + r * Math.sin(a)).toFixed(1)}" cy="${(12 + r * Math.cos(a)).toFixed(1)}" r="3.2"/>`;
  }).join('');
}

// a fleet car's teamwork, before it drives on (road.js driveCar): its flash for you, out of your way, then in the way
// of a rival
function teamwork(c, dt) {
  const other = MY_LANES[1 - c.lane], you = c.z - odo; // m it is ahead of you
  c.flashed = Math.max(0, (c.flashed ?? 0) - dt);
  if (arOn()) gangwork(c, dt); // a gang now (gang.js)
  if (run.tank) c.want = run.tank.wreck ? pace(c.racer) * fleetPace() // the tank (boss.js): up to the fight, 40 m/s
    : run.tank.v + (c.z < run.tank.z - 60 ? 40 : 0);                 // quicker, then alongside it; after it, own pace
  // its flash, for you (Fleet flash): a slower car in your lane up to 100 m ahead of it moves over, every 3 s at most
  if (lvl('fleetFlash') && !progress.off.fleetFlash && lane <= 1 && !c.flashed) {
    const t = traffic.find(o => !o.racer && sameLane(o.x, MY_LANES[lane]) && o.z > c.z && o.z - c.z < 100 &&
      o.v < speed - 2 && yields(o, 1 - lane));
    if (t) { Object.assign(t, { lane: 1 - lane, yielding: true, cool: LANE_GAP.car + 2 }); c.flashed = 3; }
  }
  if (c.cool || Math.abs(c.x - MY_LANES[c.lane]) > 0.2) return; // settled first, like any car
  if (you > 0 && you < 250 && sameLane(carX, c.x) && speed > c.v + 2) { // you, coming up behind it in its lane
    if (roomAt(c, other, 12, 25)) Object.assign(c, { lane: 1 - c.lane, yielding: true, cool: 2 });
    return;
  }
  // a rival close behind, faster, in (or heading for) the other lane: it moves across in front of it. It waits 2 s
  // between moves and a racer 5 s, so a blocked rival rarely gets past
  const rival = traffic.find(o => o.racer && !o.fleet && !o.wreck && MY_LANES[o.lane] === other && o.z < c.z && c.z - o.z < 60 && o.want > c.v);
  const yours = sameLane(carX, other) && you > 0 && you < 250; // that lane is yours behind it: never block you
  if (rival && !yours && roomAt(c, other, 8, 25)) Object.assign(c, { lane: 1 - c.lane, cool: 2 });
}
