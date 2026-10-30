// The War Rig, Distance's fourth act (called Mad Max until 18 Oct). Once your crew outnumbers the rivals (51 of the
// 100 race for you) it is a gang: about 5 s into the next run the windshield gains an AR layer, a reticle and a health
// bar on the car ahead, kept on it until you pass it or total it, and its tutorial pops up on the road. Its first job
// for you: total a car; the run ends 3 s later, and act IV's card follows (the owner, 27 Oct: on the road, not in the
// garage, where the crew's roles used to vanish as the 51st was bought). A ram is a hit (three for a car, five
// for a racer, six for the police; a bull bar makes them count up to three times), and one closing at over 200 km/h
// totals it outright; at 0 health it skids off onto the shoulder (road.js) and you collect its scrap. A totaled rival
// is out of the race (race.js position). The first total opens the War Rig page, paid in scrap: it is to the Fleet
// what the Black market is to the Workshop. Its gear is yours and your raiders': with guns (last) the wheel's red
// marker is your trigger. From act IV your racers only race (the owner, 27 Oct); the Raiders card makes raiding a
// role of the crew's: raiders ride with you, and SEND sends them at the car in the reticle (below).
Object.assign(UPGRADES, {
  // prices in scrap (22 a car, 55 a racer), from the simulations (tests/balance/act4.py, 14 and 18 Oct): about 15 races
  // from the gang to the tank, something to buy every few races, the guns as the last big save
  bullbar: { name: 'Bull bar', tab: 'warrig', needs: ['warrigTab'], max: 3, base: 20, growth: 2.5,
             info: l => l ? `a hit hurts them ${Math.round(200 * l / 3)}% more and costs you less speed` : 'the factory bumper' },
  armour: { name: 'Armor plating', tab: 'warrig', needs: ['warrigTab'], max: 3, base: 30, growth: 2.5,
            info: l => l ? `collisions do ${25 * l}% less damage to your car` : 'factory panels' },
  spikes: { name: 'Spiked hubs', tab: 'warrig', needs: ['warrigTab'], max: 1, base: 150,
            info: () => 'a side-swipe (into a car while moving over) costs you no speed and counts one more hit' },
  guns: { name: 'Guns', tab: 'warrig', max: 3, base: 400, growth: 2, needs: ['spikes'],
          info: l => l ? `the wheel's red marker (or G) fires at the car in the reticle: ${GUN * l} damage a shot, ` +
            `4 a second, up to ${RANGE} m` : 'unarmed' },
  // the owner's idea (14 Oct): on a phone your thumbs are busy steering and on the pedals
  autogun: { name: 'Auto gun', tab: 'warrig', max: 1, base: 200, needs: ['guns'],
             info: () => 'fires for you whenever the car in the reticle is in reach and in sight; the marker reads AUTO' },
  // the owner's idea (18 Oct; first called Bad drivers, the id kept so saves keep it): a share of ordinary traffic goes
  // mad for fuel, drops its manners and jumps in front of you (road.js mad), so a cut-in is a ram, not a crash to
  // avoid; MADNESS more of it a level, up to MAD_TOP; a switch, like the aids. A mad car carries stolen fuel: double
  // scrap, or buying it slowed act 4 down (act4.py: the tank in races 18-21, 16 without it). Prices: see act4.py
  baddrivers: { name: 'Fuel madness', tab: 'warrig', max: 4, base: 30, growth: 2.5, toggle: true, needs: ['bullbar'],
                info: l => l ? `${Math.round(100 * madShare(l))}% of drivers mad for fuel` : 'drivers check their mirrors. ' +
                  'Mad ones (rusty, weaving) jump in front of you; ram one that does: totaled. Stolen fuel: double scrap' },
  // the owner's idea (18 Oct): autocruise hunts the car in the reticle (aids.js hunt), as act4.py's bot did by hand; a
  // switch. Price: a first guess, see act4.py
  hunter: { name: 'Hunter', tab: 'warrig', max: 1, base: 100, needs: ['warrigTab', 'cruise', 'recklessCruise'], on: ['cruise'],
            info: () => 'adds to Autocruise (and Reckless auto-drive): it hunts ' + (rigged() ? "your raiders' car, on the " +
              'tracker' : 'the car in the reticle') + ', into its lane and into it. Not the tank, and it backs off past 60% damage' },
  // the owner's idea (18 Oct): the stereo plays the War Rig's own music instead of synthwave (stereo.js: three tapes, the
  // owner's, made with Suno);
  // a switch, so synthwave is a tap away. No use for speed. Price: a first guess, see act4.py
  warradio: { name: 'War Rig radio', tab: 'warrig', max: 1, base: 100, needs: ['warrigTab', 'stereo'], on: ['stereo'],
              info: () => "the stereo tunes in to the War Rig's own: three tapes of war rig anthems and darksynth" },
  // the owner's idea (18 Oct: "Fleet should have an attack upgrade so they hunt just like you"), the Hunting pack until
  // 27 Oct: every crew car hunted the car ahead of it. Now a role (the owner: Raiders, riding with you, sent with SEND);
  // the id kept for the saves. Price: act4.py
  pack: { name: 'Raiders', tab: 'warrig', max: 1, base: 150, needs: ['hunter', 'dues', 'fleetPace'],
          info: () => 'your crew can ride as raiders: the car in the reticle shows on the tracker, and SEND sends one at ' +
            'it, to ram it till it is totaled: your bull bar and guns are its too' },
});
const GUN = 6, RANGE = 200; // damage a shot a level; m your guns reach (a raider's: 80)
// the share of drivers gone mad a level of Fuel madness, up to 90% (the owner, 18 Oct: "there should be still an
// occasional sane person")
const MADNESS = 0.25, MAD_TOP = 0.9;
const madShare = l => Math.min(MAD_TOP, MADNESS * l);
const GANG = FIELD / 2 + 1; // fleet cars that make a gang
const health = c => c.tank ? tankHealth() : c.rig ? RIG.hp : c.suv ? SUV.hp : c.police ? 200 : c.racer ? 150 : 100; // full
                                                         // health (the tank: boss.js; a rig: fortress.js; an SUV: police.js)
// scrap from a totaled car: 2.2 times the first guesses (with the heat), so act 4 takes about 15 races (act4.py)
const SCRAP = { car: 22, racer: 55 };
const arOn = () => progress.racing && (progress.gang || progress.totals > 0); // the AR layer: from the gang's moment
const gangOpen = () => progress.totals > 0; // the first job done: act IV, the War Rig page; the oil's roles are over
// the gang's moment: about 5 s into the first run with 51 of the field yours, the oil still running; the tutorial waits
// for a car in the reticle to show it (else it pops up in the garage after the run)
function gangMoment() {
  if (!progress.gang) {
    if (progress.racing && fleetSize() >= GANG && runTime() - run.left > 5) { progress.gang = true; save(); }
    return;
  }
  if (!gangOpen() && target?.seen && !progress.toured.includes('warrig')) openTour('warrig', true);
}

// the target: the nearest car ahead going your way (not one of yours, not a wreck), kept while it is in your guns'
// reach until you pass it or total it; further up the road, the nearest again. Gone when it is off the road (a run
// starts with new cars: last run's rival stayed the target, out of sight, and the guns could fire at nothing else).
// On the war rig (fortress.js) the reticle takes only the notable enemies, and the raiders' car, the quarry, is
// picked the same way from the rest, a rival gang car before anything else
let target = null, quarry = null;
function nextTarget(fits = c => !rigged() || notable(c)) {
  let t = null;
  for (const c of traffic) if (c.dir > 0 && !c.fleet && !c.wreck && c.z > odo && c.z - odo < 300 && fits(c) && (!t || c.z < t.z)) t = c;
  return t;
}
const nextQuarry = () => rigged() ? nextTarget(c => c.racer) ?? nextTarget(c => !notable(c)) : null; // the rival gang first
// passed once its front is behind you, not its back: in a ram at speed one long frame (up to 50 ms) carries you past
// its back before the bump settles, and the reticle moved on to the next car, at full health (28 Oct)
const lost = t => !t || t.wreck || t.dir < 0 || t.z + CAR_LEN < odo || t.z - odo > RANGE || !traffic.includes(t);
function updateGang(dt) { // every frame of a run
  gangMoment();
  if (!arOn()) { target = quarry = null; return; }
  if (run.tank && !run.tank.wreck) target = run.tank; // boss.js: the tank, while it lasts
  else if (lost(target)) target = nextTarget();
  if (lost(quarry) || rigged() && !quarry.racer && nextTarget(c => c.racer)) quarry = nextQuarry();
  fireGuns(dt);
}
// the car your crew goes after: the raiders' and Hunter's (aids.js). The reticle's, until the war rig
const crewTarget = () => rigged() ? quarry : target;

// guns: held, the trigger fires 4 shots a second from the hood at the car in the reticle, if it is in reach and in
// sight. Auto gun holds it for you, only while there is something to hit. The tracers are drawn over the road
// (renderGang)
let reload = 0;
const tracers = []; // [from, to, when]: from a car's middle on the screen, null for your hood, 'cannon' the rig's cannon
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
// a side-swipe always counts. The tank takes a fifth of a hit and is never knocked out, and so does a rival rig
// (fortress.js). A head-on is your DNF, not a total
const HIT = 34, NUDGE = 30, OHKO = 200;
function ram(i) {
  const c = i.car;
  if (!c || c.wreck || c.fleet || i.headOn || !i.side && i.kmh < NUDGE) return;
  if (i.kmh > OHKO && !notable(c)) return total(c, false, 'OHKO!');
  if (c.cut > 0) return total(c, false, 'HAD IT COMING!'); // Fuel madness: it cut in on you, it's totaled (road.js c.cut)
  hurtCar(c, HIT * (1 + 2 / 3 * lvl('bullbar') + (i.side && spikes ? 1 : 0)) * (notable(c) ? 0.2 : 1));
}
function hurtCar(c, hp, gang) {
  c.hp = (c.hp ?? health(c)) - hp;
  if (c.hp <= 0) total(c, gang);
}
function total(c, gang, how) { // the scrap is yours, whoever did it; the heat too (police.js); how: the HUD's word for it
  if (c.tank) return tankDown(c); // boss.js
  // a mad driver's stolen fuel (Fuel madness), double; a rival rig's (fortress.js), a police SUV's (police.js); a rival
  // gang car's shells
  const scrap = c.rig ? RIG.scrap : c.suv ? SUV.scrap : (c.racer ? SCRAP.racer : SCRAP.car) * (mad(c) ? 2 : 1), shells = gangShells(c);
  raiseHeat(gang ? WANTED.gang : c.police ? WANTED.police : c.racer || c.rig ? WANTED.racer : WANTED.car);
  Object.assign(c, { wreck: true, hp: 0 });
  if (c === target) target = nextTarget(); // the reticle moves on at once: for a frame Hunter had nothing to hunt, and
  if (c === quarry) quarry = nextQuarry(); // autocruise steered away from the car it would hunt next
  progress.totals++;
  progress.scrap += scrap;
  run.scrap += scrap;
  progress.shells += shells;
  run.shells += shells;
  run.totals++;
  if (progress.totals === 1) { run.firstTotal = true; run.left = Math.min(run.left, 3); } // the first job done: 3 s more
  const who = c.racer ? `#${c.racer}` : c.suv ? 'A POLICE SUV' : c.police ? 'A POLICE CAR' : c.rig ? 'A RIG' : 'A CAR'; // raiders ram anything
  flash(`${gang ? `THE GANG TOTALED ${who}` : how ?? 'TOTALED'} +${scrap} SCRAP${shells ? ` +${shells} SHELLS` : ''}`, '#ff6a4a', true);
}

// ---- raiders (the owner, 27 Oct: the Hunting pack as a role, riding with you as harvesters and brewers do): the car in
// the reticle is on the tracker as a target (oil.js), and SEND sends a raider at it, up the shoulder and into it: a ram
// every 1.5 s or so (the bull bar counts, and the tank takes a fifth, as yours do) and its guns, if any, once a second,
// until it is totaled or you pass it; then it rides with you again. Up to RAID raiders a car, the tank RAID_TANK
const RAID = 3, RAID_TANK = 6;
// a ram knocks it back: KNOCK s falling back BACK m/s, then it charges again and hits at about 17 m/s, a ram every
// 1.5 s (Claude's numbers: the pace it had before, 27 Oct). Several on one car take turns (the owner, 27 Oct, after
// two sent at once with Double up drove as one and hit as one: "the first car hits the target, slows down, and then
// the second car hits the target, passing through the first car", as Mario does when hit): the one that has waited
// longest charges, the rest wait in line behind the car, the next HOLD m back and the others LINE m apart; one knocked
// back goes to the back of the line. Raiders never touch one another
const KNOCK = 0.8, BACK = 5, HOLD = 10, LINE = 6;
const raiding = () => traffic.filter(c => c.raider && !c.gone);
function raidAhead() { // the crew's car as a tracker row, while you have raiders (the same row while it is their target)
  const t = crewTarget();
  if (!role('raider') || !arOn() || !t || t.wreck || t.dir < 0 || t.z < odo + 5) return null;
  if (run.raid?.car !== t) run.raid = { kind: 'raid', car: t, shown: run.t, get z() { return this.car.z; }, get done() { return this.car.wreck; },
                                        get seen() { return rigged() ? this.car.seen : null; } }; // tagged once the reticle isn't on it
  return run.raid;
}
const raidersOn = r => raiding().filter(c => c.raider === r.car).length;
const raidCap = r => r.car.tank ? RAID_TANK : RAID;
function sendRaider(r) { // up the right shoulder, as a car sent to a spot goes (oil.js runner)
  const n = FIELD - (run.sent++ % Math.max(1, riders()));
  traffic.push({ raider: r.car, fleet: true, dir: 1, x: SHOULDER - 0.6, z: odo - 20, v: speed + 15, look: racerSprite(n, true, true),
                 d: NaN, hit: -Infinity, seen: null, rammed: 0, gun: 0, turn: run.t }); // turn: in line since
}
// road.js updateTraffic: after its car, flat out, and on its turn into it without braking for it (the owner, 27 Oct:
// they lined up, then braked before the ram); knocked back by each ram. On its turn it holds back only while it is
// still moving into the car's lane, so it doesn't drive past it; waiting its turn, it eases into its place in line
function raiderDrive(c, dt) {
  const o = c.raider;
  if (o.wreck || !traffic.includes(o) || o.z < odo - 40 || c.z - odo > 900) { c.gone = true; return; } // back with you
  c.rammed = Math.max(0, c.rammed - dt);
  c.gun = Math.max(0, c.gun - dt);
  const gap = o.z - c.z - CAR_LEN, lined = Math.abs(o.x - c.x) < 0.6, top = Math.max(speed, o.v) + 60;
  const k = raiding().filter(r => r.raider === o && !r.rammed).sort((a, b) => a.turn - b.turn).indexOf(c); // -1: knocked back
  if (c.rammed) c.v = o.v - BACK;
  else if (k === 0) c.v = !lined && gap < 8 ? o.v : Math.min(c.v + 30 * dt, top); // its turn
  else { // its place in line: closing on it, then braking into it (25 m/s² at most)
    const off = gap - HOLD - LINE * (k - 1), want = o.v + Math.sign(off) * Math.sqrt(50 * Math.abs(off));
    c.v += clamp(Math.min(want, top) - c.v, -30 * dt, 30 * dt);
  }
  c.z += c.v * dt;
  c.x += clamp(o.x - c.x, -4 * dt, 4 * dt); // off the shoulder, into its lane
  if (o.z - c.z - CAR_LEN < 0.5 && Math.abs(o.x - c.x) < 1.2) { c.z = Math.min(c.z, o.z - CAR_LEN - 0.5); raidRam(c, o); }
  if (lvl('guns') && !c.gun && gap < 80) { c.gun = 1; tracers.push([c, o, performance.now()]); hurtCar(o, GUN * lvl('guns'), true); }
}
function raidRam(c, o) { // a hit, as yours are, and it is knocked back (raiderDrive) to the back of the line
  if (c.rammed) return;
  c.rammed = KNOCK;
  c.turn = run.t;
  hurtCar(o, HIT * (1 + 2 / 3 * lvl('bullbar')) * (notable(o) ? 0.2 : 1), true);
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
  if (!s) return; // out of sight: under your hood just after a bump, say
  const k = 1 / canvas.px, w = Math.max(26, s[2] * k), h = Math.max(20, s[3] * k); // canvas px to page px (main.js resize)
  Object.assign($('ar').style, { left: `${(s[0] + s[2] / 2) * k - w / 2}px`, top: `${(s[1] + s[3] / 2) * k - h / 2}px`,
                                 width: `${w}px`, height: `${h}px` });
  text('ar-label', rigged() ? notableTag(t) : t.tank ? 'TANK' : !gangOpen() ? 'TOTAL IT' : t.racer ? `#${t.racer}` : ''); // fortress.js
}

// your car's war kit, seen from the seat (index.html #kit): each part shows from its level up, the Auto gun's red lamps
// while it is switched on (the owner, 18 Oct: the guns and armor should show). Spiked hubs can't be seen from inside
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
    const side = Math.round(when / 250) % 2 ? 1 : -1; // twin guns on the hood, in turn
    const shell = from === 'cannon', [x1, y1] = shell ? [w / 2, h * 0.6] // the rig's cannon (fortress.js): a shell
      : from ? from.seen && middle(from.seen) || [] : [w * MUZZLES[side][0], h * MUZZLES[side][1]];
    const [x2, y2] = to === 'you' ? [w / 2, h * 0.66] : to?.seen ? middle(to.seen) // the tank at you; a miss: off
      : [x1 + side * w * 0.02, h * 0.42];                                          // into the distance
    if (x1 === undefined) continue;
    g2d.globalAlpha = 1 - (now - when) / 100;
    g2d.strokeStyle = shell ? '#ff9a3c' : '#ffd36a'; g2d.lineWidth = Math.max(2, w / (shell ? 160 : 500));
    g2d.beginPath(); g2d.moveTo(x1, y1); g2d.lineTo(x2, y2); g2d.stroke();
    if (!from || from.tank || shell) { // a muzzle flash
      g2d.fillStyle = '#fff3c0'; g2d.beginPath(); g2d.arc(x1, y1, w / (from && !shell ? 50 : shell ? 40 : 120), 0, 2 * Math.PI); g2d.fill();
    }
    if (shell && to?.seen) { g2d.fillStyle = '#ffb347'; g2d.beginPath(); g2d.arc(x2, y2, w / 30, 0, 2 * Math.PI); g2d.fill(); } // the hit
  }
  g2d.globalAlpha = 1;
}
