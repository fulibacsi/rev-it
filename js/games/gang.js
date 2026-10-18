// The War Rig, Distance's fourth act (called Mad Max until 18 Oct). Once your fleet outnumbers the rivals (51 of the
// 100 race for you) it is a gang, and the windscreen gains an AR layer: a reticle and a health bar on the car ahead,
// kept on it until you pass it or total it. Its first job for you: total a car. A ram is a hit (three for a car, five
// for a racer, six for the police; a bull bar makes them count up to three times), and one closing at over 200 km/h
// totals it outright; at 0 health it skids off onto the shoulder (road.js) and you collect its parts. A totalled rival
// is out of the race (race.js position). The first total opens the War Rig page, paid in parts: it is to the Fleet
// what the Black market is to the Workshop. Its gear is yours and the gang's: with a bull bar a fleet car side-swipes
// a rival beside it; with guns (last) the wheel's red marker is your trigger and the gang shoots at rivals too.
Object.assign(UPGRADES, {
  // prices in parts (10 a car, 25 a racer), from the simulations (tests/balance/act4.py, 14 Oct): about 25 races from
  // the gang to the tank, something to buy every few races, the guns as the last big save
  bullbar: { name: 'Bull bar', tab: 'warrig', max: 3, base: 20, growth: 2.5,
             info: l => l ? `a hit hurts them ${Math.round(200 * l / 3)}% more and costs you less speed; the gang ` +
               `side-swipes rivals beside it (${20 * l} damage)` : 'the factory bumper' },
  armour: { name: 'Armour plating', tab: 'warrig', max: 3, base: 30, growth: 2.5,
            info: l => l ? `collisions do ${25 * l}% less damage to your car` : 'factory panels' },
  spikes: { name: 'Spiked hubs', tab: 'warrig', max: 1, base: 150,
            info: () => 'a side-swipe (into a car while moving over) costs you no speed and counts one more hit; ' +
              "the gang's swipes do 30 more" },
  guns: { name: 'Guns', tab: 'warrig', max: 3, base: 400, growth: 2, needs: ['spikes'],
          info: l => l ? `the wheel's red marker (or G) fires at the car in the reticle: ${GUN * l} damage a shot, ` +
            `4 a second, up to ${RANGE} m; the gang fires at rivals once a second` : 'unarmed' },
  // the owner's idea (14 Oct): on a phone your thumbs are busy steering and on the pedals
  // the owner's idea (18 Oct): ordinary traffic drops its manners (road.js driveCar) and jumps in front of you, so a
  // cut-in is a ram, not a crash to avoid; a switch, like the aids. Price: a first guess, see act4.py
  baddrivers: { name: 'Bad drivers', tab: 'warrig', max: 1, base: 60,
                info: () => 'panic on the road: drivers stop checking their mirrors and pull out in front of you, to be rammed' },
  autogun: { name: 'Auto gun', tab: 'warrig', max: 1, base: 200, needs: ['guns'],
             info: () => 'fires for you whenever the car in the reticle is in reach and in sight; the marker reads AUTO' },
});
const GUN = 6, RANGE = 200; // damage a shot a level; m your guns reach (the gang's: 80)
const GANG = FIELD / 2 + 1; // fleet cars that make a gang
const health = c => c.tank ? tankHealth() : c.police ? 200 : c.racer ? 150 : 100; // full health (the tank: boss.js)
const PARTS = { car: 10, racer: 25 }; // parts from a totalled car
const arOn = () => progress.racing && (fleetSize() >= GANG || progress.totals > 0);
const gangOpen = () => progress.totals > 0; // the first job done: the War Rig page

// the target: the nearest car ahead going your way (not one of yours, not a wreck), kept while it is in your guns'
// reach until you pass it or total it; further up the road, the nearest again. Gone when it is off the road (a run
// starts with new cars: last run's rival stayed the target, out of sight, and the guns could fire at nothing else)
let target = null;
function nextTarget() {
  let t = null;
  for (const c of traffic) if (c.dir > 0 && !c.fleet && !c.wreck && c.z > odo && c.z - odo < 300 && (!t || c.z < t.z)) t = c;
  return t;
}
function updateGang(dt) { // every frame of a run
  if (!arOn()) { target = null; return; }
  if (run.tank && !run.tank.wreck) target = run.tank; // boss.js: the tank, while it lasts
  else if (!target || target.wreck || target.dir < 0 || target.z < odo || target.z - odo > RANGE || !traffic.includes(target))
    target = nextTarget();
  fireGuns(dt);
}

// guns: held, the trigger fires 4 shots a second from the bonnet at the car in the reticle, if it is in reach and in
// sight. Auto gun holds it for you, only while there is something to hit. The tracers are drawn over the road
// (renderGang)
let reload = 0;
const tracers = []; // [from, to, when]: from a car's middle on the screen, or null for your bonnet
function fireGuns(dt) {
  reload = Math.max(0, reload - dt);
  const auto = lvl('autogun') && !progress.off.autogun && target?.seen && target.z - odo < RANGE;
  if (!lvl('guns') || !(firing || auto) || reload) return;
  reload = 0.25;
  beep(70, 0.04);
  raiseHeat(WANTED.shot);
  const hit = target?.seen && target.z - odo < RANGE ? target : null;
  tracers.push([null, hit, performance.now()]);
  if (hit) hurtCar(hit, GUN * lvl('guns'));
}

// you hit car c (impact from car.js): a hit, HIT off its health. The owner's numbers (14 Oct): traffic goes down in 3,
// racers in 5, police in 6; with a full bull bar (3 times a hit) in 1, 2 and 2. Spiked hubs add a hit to a side-swipe.
// From behind, a bump closing at under NUDGE km/h does nothing, and one at over OHKO km/h totals it outright ("OHKO!");
// a side-swipe always counts. The tank takes a fifth of a hit and is never knocked out. A head-on is your DNF, not a
// total
const HIT = 34, NUDGE = 30, OHKO = 200;
function ram(i) {
  const c = i.car;
  if (!c || c.wreck || c.fleet || i.headOn || !i.side && i.kmh < NUDGE) return;
  if (i.kmh > OHKO && !c.tank) return total(c, false, true);
  hurtCar(c, HIT * (1 + 2 / 3 * lvl('bullbar') + (i.side && spikes ? 1 : 0)) * (c.tank ? 0.2 : 1));
}
function hurtCar(c, hp, gang) {
  c.hp = (c.hp ?? health(c)) - hp;
  if (c.hp <= 0) total(c, gang);
}
function total(c, gang, ohko) { // the parts are yours, whoever did it; the heat too (police.js)
  if (c.tank) return tankDown(c); // boss.js
  const parts = c.racer ? PARTS.racer : PARTS.car;
  raiseHeat(gang ? WANTED.gang : c.police ? WANTED.police : c.racer ? WANTED.racer : WANTED.car);
  Object.assign(c, { wreck: true, hp: 0 });
  progress.totals++;
  progress.parts += parts;
  run.parts += parts;
  run.totals++;
  if (progress.totals === 1) run.firstTotal = true;
  flash(`${gang ? `THE GANG TOTALLED #${c.racer}` : ohko ? 'OHKO!' : 'TOTALLED'} +${parts} PARTS`, '#ff6a4a', true);
}

// the gang at work (fleet.js teamwork): with a bull bar a fleet car side-swipes a rival beside it, every 3 s at most;
// it lurches across, then drives back into its lane
function gangwork(c, dt) {
  c.rammed = Math.max(0, (c.rammed ?? 0) - dt);
  c.gun = Math.max(0, (c.gun ?? 0) - dt);
  if (lvl('guns') && !c.gun) { // a rival up to 80 m ahead of it, or beside it, or the tank within 200 m: a shot a second
    const o = run.tank && !run.tank.wreck && Math.abs(run.tank.z - c.z) < 200 ? run.tank
      : traffic.find(o => o.racer && !o.fleet && !o.wreck && o.z > c.z - CAR_LEN && o.z - c.z < 80);
    if (o) { c.gun = 1; tracers.push([c, o, performance.now()]); hurtCar(o, GUN * lvl('guns'), true); }
  }
  if (!lvl('bullbar') || c.rammed) return;
  const o = traffic.find(o => o.racer && !o.fleet && !o.wreck && Math.abs(o.z - c.z) < CAR_LEN && Math.abs(o.x - c.x) > 1 &&
    Math.abs(o.x - c.x) < 4.5);
  if (!o) return;
  c.rammed = 3;
  c.x += Math.sign(o.x - c.x) * 0.9;
  hurtCar(o, 20 * lvl('bullbar') + (spikes ? 30 : 0), true);
}

// the AR layer: the reticle round the target where it is on the screen (road.js keeps c.seen), its health above it;
// the tracers, drawn over the road for 0.1 s each
function renderGang() {
  document.body.classList.toggle('has-guns', run.phase !== 'garage' && lvl('guns') > 0);
  const label = lvl('autogun') && !progress.off.autogun ? 'AUTO' : 'FIRE'; // the trigger's marker: Auto gun fires for you
  if ($('fire').textContent !== label) $('fire').textContent = label;
  renderKit();
  drawTracers();
  const t = arOn() && run.phase === 'run' ? target : null, s = t?.seen;
  document.body.classList.toggle('ar-on', !!s);
  if (t) $('ar').style.setProperty('--hp', Math.max(0, t.hp ?? health(t)) / health(t)); // right as soon as it shows again
  if (!s) return; // out of sight: under your bonnet just after a bump, say
  const k = canvas.clientWidth / canvas.width, w = Math.max(26, s[2] * k), h = Math.max(20, s[3] * k);
  Object.assign($('ar').style, { left: `${(s[0] + s[2] / 2) * k - w / 2}px`, top: `${(s[1] + s[3] / 2) * k - h / 2}px`,
                                 width: `${w}px`, height: `${h}px` });
  $('ar-label').textContent = t.tank ? 'TANK' : !gangOpen() ? 'TOTAL IT' : t.racer ? `#${t.racer}` : '';
}

// your car's war kit, seen from the seat (index.html #kit): each part shows from its level up, the Auto gun's red lamps
// while it is switched on (the owner, 18 Oct: the guns and armour should show). Spiked hubs can't be seen from inside
let shownKit = '';
function renderKit() {
  const have = { bullbar: lvl('bullbar'), armour: lvl('armour'), guns: lvl('guns'), autogun: lvl('autogun') && !progress.off.autogun ? 1 : 0 };
  const key = JSON.stringify(have);
  if (key === shownKit) return;
  shownKit = key;
  for (const g of $('kit').children) { const [id, l] = g.dataset.kit.split(' '); g.classList.toggle('on', have[id] >= +l); }
}

const middle = s => [s[0] + s[2] / 2, s[1] + s[3] / 2];
const MUZZLES = { [-1]: [598 / 1600, 512 / 900], 1: [1002 / 1600, 512 / 900] }; // the guns' barrel ends in the frame (#kit)
function drawTracers() {
  const now = performance.now(), w = canvas.width, h = canvas.height;
  while (tracers.length && now - tracers[0][2] > 100) tracers.shift();
  for (const [from, to, when] of tracers) {
    const side = Math.round(when / 250) % 2 ? 1 : -1; // twin guns on the bonnet, in turn
    const [x1, y1] = from ? from.seen && middle(from.seen) || [] : [w * MUZZLES[side][0], h * MUZZLES[side][1]];
    const [x2, y2] = to === 'you' ? [w / 2, h * 0.66] : to?.seen ? middle(to.seen) // the tank at you; a miss: off
      : [x1 + side * w * 0.02, h * 0.42];                                          // into the distance
    if (x1 === undefined) continue;
    g2d.globalAlpha = 1 - (now - when) / 100;
    g2d.strokeStyle = '#ffd36a'; g2d.lineWidth = Math.max(2, w / 500);
    g2d.beginPath(); g2d.moveTo(x1, y1); g2d.lineTo(x2, y2); g2d.stroke();
    if (!from || from.tank) { // a muzzle flash
      g2d.fillStyle = '#fff3c0'; g2d.beginPath(); g2d.arc(x1, y1, w / (from ? 50 : 120), 0, 2 * Math.PI); g2d.fill();
    }
  }
  g2d.globalAlpha = 1;
}
