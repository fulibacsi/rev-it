// Mad Max, Distance's fourth act. Once your fleet outnumbers the rivals (51 of the 100 race for you) it is a gang, and
// the windscreen gains an AR layer: a reticle and a health bar on the car ahead, kept on it until you pass it or total
// it. Its first job for you: total a car. A bump hurts the car you hit by 0.4 of the speed you hit it at (in km/h:
// two or three rams for a car, three or four for a racer); at 0 health it skids off onto the shoulder (road.js) and you
// collect its parts. A totalled rival is out of the race (race.js position). The first total opens the Mad Max page,
// paid in parts: it is to the Fleet what the Black market is to the Workshop. Its gear is yours and the gang's: with
// a bull bar a fleet car side-swipes a rival beside it.

Object.assign(UPGRADES, {
  // prices: first guesses, in parts (10 a car, 25 a racer)
  bullbar: { name: 'Bull bar', tab: 'madmax', max: 3, base: 10, growth: 2.5,
             info: l => l ? `bumps hurt them ${50 * l}% more and cost you less speed; the gang side-swipes rivals ` +
               `beside it (${20 * l} damage)` : 'the factory bumper' },
  armour: { name: 'Armour plating', tab: 'madmax', max: 3, base: 15, growth: 2.5,
            info: l => l ? `collisions do ${25 * l}% less damage to your car` : 'factory panels' },
  spikes: { name: 'Spiked hubs', tab: 'madmax', max: 1, base: 60,
            info: () => 'a side-swipe (into a car while moving over) costs you no speed and does 50 more damage; ' +
              "the gang's swipes do 30 more" },
});
const GANG = FIELD / 2 + 1; // fleet cars that make a gang
const health = c => c.racer ? 150 : 100; // full health: racers are built tougher
const PARTS = { car: 10, racer: 25 }; // parts from a totalled car
const arOn = () => progress.racing && (fleetSize() >= GANG || progress.totals > 0);
const gangOpen = () => progress.totals > 0; // the first job done: the Mad Max page

// the target: the nearest car ahead going your way (not one of yours, not a wreck), until you pass it or total it
let target = null;
function nextTarget() {
  let t = null;
  for (const c of traffic) if (c.dir > 0 && !c.fleet && !c.wreck && c.z > odo && c.z - odo < 300 && (!t || c.z < t.z)) t = c;
  return t;
}
function updateGang() { // every frame of a run
  if (!arOn()) { target = null; return; }
  if (!target || target.wreck || target.dir < 0 || target.z < odo) target = nextTarget();
}

// you hit car c (impact from car.js): it takes 0.4 of the speed you hit it at, more with a bull bar. A head-on is your
// DNF, not a total
function ram(i) {
  const c = i.car;
  if (!c || c.wreck || c.fleet || i.headOn) return;
  hurtCar(c, 0.4 * i.kmh * (1 + 0.5 * lvl('bullbar')) + (i.side && spikes ? 50 : 0));
}
function hurtCar(c, hp, gang) {
  c.hp = (c.hp ?? health(c)) - hp;
  if (c.hp <= 0) total(c, gang);
}
function total(c, gang) { // the parts are yours, whoever did it
  const parts = c.racer ? PARTS.racer : PARTS.car;
  Object.assign(c, { wreck: true, hp: 0 });
  progress.totals++;
  progress.parts += parts;
  run.parts += parts;
  run.totals++;
  if (progress.totals === 1) run.firstTotal = true;
  flash(`${gang ? `THE GANG TOTALLED #${c.racer}` : 'TOTALLED'} +${parts} PARTS`, '#ff6a4a', true);
}

// the gang at work (fleet.js teamwork): with a bull bar a fleet car side-swipes a rival beside it, every 3 s at most;
// it lurches across, then drives back into its lane
function gangwork(c, dt) {
  c.rammed = Math.max(0, (c.rammed ?? 0) - dt);
  if (!lvl('bullbar') || c.rammed) return;
  const o = traffic.find(o => o.racer && !o.fleet && !o.wreck && Math.abs(o.z - c.z) < CAR_LEN && Math.abs(o.x - c.x) > 1 &&
    Math.abs(o.x - c.x) < 4.5);
  if (!o) return;
  c.rammed = 3;
  c.x += Math.sign(o.x - c.x) * 0.9;
  hurtCar(o, 20 * lvl('bullbar') + (spikes ? 30 : 0), true);
}

// the AR layer: the reticle round the target where it is on the screen (road.js keeps c.seen), its health above it
function renderGang() {
  const t = arOn() && run.phase === 'run' ? target : null, s = t?.seen;
  document.body.classList.toggle('ar-on', !!s);
  if (!s) return;
  const k = canvas.clientWidth / canvas.width, w = Math.max(26, s[2] * k), h = Math.max(20, s[3] * k);
  Object.assign($('ar').style, { left: `${(s[0] + s[2] / 2) * k - w / 2}px`, top: `${(s[1] + s[3] / 2) * k - h / 2}px`,
                                 width: `${w}px`, height: `${h}px` });
  $('ar').style.setProperty('--hp', Math.max(0, t.hp ?? health(t)) / health(t));
  $('ar-label').textContent = !gangOpen() ? 'TOTAL IT' : t.racer ? `#${t.racer}` : '';
}
