// The Fleet, Distance's third act. Once you have won a race the racers you beat take offers, the slowest first. One you
// pay off keeps its number, its place in the field and its pace, in your team's colours, and races for you: it gives
// way when you come up behind it, and moves across to block a rival closing on it from behind. Your position counts
// the rivals only. Paid in miles, from the Fleet page's Exchange (distance.js). The upgrades are fleet-wide: dues (a
// share of the metres your fleet drives, paid at the finish), tuning, and a flash used for you.

Object.assign(UPGRADES, {
  // prices: first guesses. tests/balance/act3.py: 51 cars (the gang, act 4) about 26 races after the first win, buying
  // dues first; about 70 buying the cheapest first, as dues come late
  fleet: { name: 'Pay off a racer', tab: 'fleet', base: 1, growth: 1.06, max: () => FIELD - 1, locked: "#1 won't sell",
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

// a fleet car's teamwork, before it drives on (road.js driveCar): its flash for you, out of your way, then in the way
// of a rival
function teamwork(c, dt) {
  const other = MY_LANES[1 - c.lane], you = c.z - odo; // m it is ahead of you
  c.flashed = Math.max(0, (c.flashed ?? 0) - dt);
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
  const rival = traffic.find(o => o.racer && !o.fleet && MY_LANES[o.lane] === other && o.z < c.z && c.z - o.z < 60 && o.want > c.v);
  const yours = sameLane(carX, other) && you > 0 && you < 250; // that lane is yours behind it: never block you
  if (rival && !yours && roomAt(c, other, 8, 25)) Object.assign(c, { lane: 1 - c.lane, cool: 2 });
}
