// The Crew (the Fleet until 26 Oct), Distance's third act. Once you have won a race the racers you beat take offers, the
// slowest first. One you pay off keeps its number, its place in the field and its pace, in your team's colors, and
// races for you: it yields when you come up behind it, and moves across to block a rival closing on it from behind.
// Your position counts the rivals only. From the 5th, the crew has roles (oil.js): racers stay on the grid, harvesters
// and brewers ride with you and work the oil. Paid in fuel: the oil's, and the Crew page's Fuel converter
// (distance.js). Here: the racers' places at the finish (points), Racing (a share of the meters they drive), and Crew
// tuning.

Object.assign(UPGRADES, {
  // prices: tests/balance/act3.py, 51 cars (the gang, act 4) after the first win, buying dues first. Each racer 6%
  // dearer took about 26 races; the owner (18 Oct) wanted about 15, the Fleet being the weakest act: 3.5% takes 14-16
  fleet: { name: 'Pay off a racer', tab: 'fleet', base: 1, growth: 1.035, max: () => FIELD - 1, locked: "#1 won't sell",
           needs: ['fleetTab'],
           info: l => !l ? 'every racer for themselves' : l === 1 ? '#100 races for you'
             : `#${FIELD + 1 - l} to #100 race for you` },
  // Fleet dues until 26 Oct: the racer's own upgrade now, with the roles (the first crude; or at the gang, for a save
  // that got there before the oil: Raiders need it); the role upgrades and tuning grow steeply (the owner, 26
  // Oct). Crew flash went (it never fired at P1: the racers are far behind you)
  dues: { name: 'Racing', tab: 'fleet', max: 5, base: 5, growth: 3, needs: ['fleetTab'], story: () => progress.oil >= 1 || arOn(),
          info: l => l ? `each racer pays you ${10 * l}% of the meters it drives` : 'your racers drive for nothing' },
  fleetPace: { name: 'Crew tuning', tab: 'fleet', max: 5, base: 3, growth: 3, needs: ['fleet'],
               info: l => l ? `your racers ${5 * l}% quicker, and your cars get to their spots sooner` : 'as they came' },
});
const fleetSize = () => lvl('fleet');
const inFleet = n => progress.racing && n > FIELD - fleetSize(); // racer n is yours
const fleetPace = () => 1 + 0.05 * lvl('fleetPace');
// the dues for a run: a share of the meters your fleet drove from the grid, paid into the bank at the finish
const fleetDues = () => Math.round(0.1 * lvl('dues') * racers().reduce((m, c) => m + (c.fleet ? Math.max(0, c.z - c.grid) : 0), 0));
// team places (the owner, 23 Oct; points since 26 Oct, so what is left on the Black market stays in reach): at the
// finish each racer of yours pays TEAM points for each ten places it is from the back (P101 to P92 one, P2 ten), so
// more racers and quicker ones pay more. Its place among the cars on the road (your riders aren't: oil.js)
const TEAM = 1;
const placeOf = c => 1 + (odo > c.z ? 1 : 0) + racers().filter(o => o !== c && !o.wreck && o.z > c.z).length; // you too
const teamPoints = () => Math.round(racers().filter(c => c.fleet && !c.wreck)
  .reduce((pts, c) => pts + TEAM * Math.ceil((FIELD + 2 - placeOf(c)) / 10), 0));

// the sonar on the A-pillar: the road 250 m ahead of you and behind, from above, ahead up. The lanes to scale across
// (4.4 px a meter: the lanes 15 px apart), squeezed along (34 px for 250 m); you in the middle, every car colored by
// what it is (the owner, 20 Oct). Redrawn 15 times a second: plenty for a blip, and a phone stays cool
const SONAR = 250; // m each way
const BLIPS = ['car', 'rival', 'ally', 'red', 'blue', 'rig', 'tank']; // their order on the screen: the police, a rival rig
                                                                      // (fortress.js) and the tank on top; the notable
                                                                      // ones (fortress.js) squares, a police SUV too
let sonarAt = 0; // when it was last drawn
function renderSonar() {
  const on = run.phase !== 'garage' && fleetSize() > 0, now = performance.now();
  document.body.classList.toggle('has-fleet', on);
  if (!on || now - sonarAt < 66) return;
  sonarAt = now;
  const X = x => (66 + 4.4 * x).toFixed(1), Y = z => (43 - 34 * (z - odo) / SONAR).toFixed(1);
  const kind = c => c.tank ? 'tank' : c.rig ? 'rig' : c.police ? (now % 500 < 250 ? 'red' : 'blue') : c.fleet ? 'ally' : c.racer ? 'rival' : 'car';
  $('sonar-blips').innerHTML = traffic.filter(c => !c.wreck && Math.abs(c.z - odo) < SONAR).map(c => [kind(c), c])
    .sort((a, b) => BLIPS.indexOf(a[0]) - BLIPS.indexOf(b[0])).map(([k, c]) => k === 'tank' || k === 'rig' || c.suv
      ? `<rect class="${k}" x="-3.5" y="-3.5" width="7" height="7" transform="translate(${X(c.x)},${Y(c.z)})"/>`
      : `<circle class="${k}" cx="${X(c.x)}" cy="${Y(c.z)}" r="2.4"/>`).join('');
  $('sonar-blips').innerHTML += (run.loot ?? []).filter(l => Math.abs(l.z - odo) < SONAR) // act 5's loot (fortress.js): gold
    .map(l => `<rect class="loot" x="-2" y="-2" width="4" height="4" transform="translate(${X(l.x)},${Y(l.z)}) rotate(45)"/>`).join(''); // diamonds
  $('sonar-you').setAttribute('transform', `translate(${X(carX)},43)`);
  $('sonar-dash').style.strokeDashoffset = -(odo * 34 / SONAR) % 6; // the lane lines go by as fast as the road does
}

// a racer of yours at work, before it drives on (road.js driveCar): out of your way, or in the way of a rival. From act
// IV it only races, flat out for meters and places (the owner, 27 Oct: you hunt now, there is no road to clear for
// you; the war is the raiders', gang.js)
function teamwork(c, dt) {
  if (gangOpen()) return;
  const other = MY_LANES[1 - c.lane], you = c.z - odo; // m it is ahead of you
  if (c.cool || Math.abs(c.x - MY_LANES[c.lane]) > 0.2) return; // settled first, like any car
  if (you > 0 && you < 250 && sameLane(carX, c.x) && speed > c.v + 2) { // you, coming up behind it in its lane
    if (roomAt(c, other, 12, 25)) Object.assign(c, { lane: 1 - c.lane, yielding: true, cool: 2 });
    return;
  }
  const yours = x => sameLane(carX, x) && you > 0 && you < 250; // that lane is yours behind it: never block you
  // a rival close behind, faster, in (or heading for) the other lane: it moves across in front of it. It waits 2 s
  // between moves and a racer 5 s, so a blocked rival rarely gets past
  const rival = RIVALS.find(o => !o.wreck && MY_LANES[o.lane] === other && o.z < c.z && c.z - o.z < 60 && o.want > c.v);
  if (rival && !yours(other) && roomAt(c, other, 8, 25)) Object.assign(c, { lane: 1 - c.lane, cool: 2 });
}
