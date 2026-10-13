// The Fleet, Distance's third act. Once you have won a race the racers you beat take offers, the slowest first. One you
// pay off keeps its number, its place in the field and its pace, in your team's colours, and races for you: it gives
// way when you come up behind it, and moves across to block a rival closing on it from behind. Your position counts
// the rivals only. Paid in miles, from the Fleet page's Exchange (distance.js).

Object.assign(UPGRADES, {
  // prices: a first guess, from a paper model: 51 cars (the gang, act 4) about 26 races after the first win
  fleet: { name: 'Pay off a racer', tab: 'fleet', base: 1, growth: 1.06, max: () => FIELD - 1, locked: "#1 won't sell",
           info: l => !l ? 'every racer for themselves' : l === 1 ? '#100 races for you' : `#${FIELD + 1 - l} to #100 race for you` },
});
const fleetSize = () => lvl('fleet');
const inFleet = n => progress.racing && n > FIELD - fleetSize(); // racer n is yours

// a fleet car's teamwork, before it drives on (road.js driveCar): out of your way first, then in the way of a rival
function teamwork(c) {
  if (c.cool || Math.abs(c.x - MY_LANES[c.lane]) > 0.2) return; // settled first, like any car
  const other = MY_LANES[1 - c.lane], you = c.z - odo; // m it is ahead of you
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
