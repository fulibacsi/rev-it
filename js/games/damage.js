// Damage, from the moment you buy reckless driving. Every collision adds to one meter, 0-100%, harder hits more and
// a head-on most (and it ends the run). An ECU tune heats the engine; run it in the red and that damages it too. The car drives worse at once: the rev limit drops by 30 rpm per percent (up to
// 1,500 rpm at 50%), a random gear breaks at 50% and another at 70%, past 80% the gear pops out now and then under
// load, and at 100% the car is wrecked. Repairs cost metres. The windscreen shows it all, cracks growing with damage.
const REPAIR = 40; // metres per percent of damage
const damageOn = () => lvl('reckless') > 0;
const revLoss = () => damageOn() ? Math.min(1500, 30 * progress.damage) : 0;
let popped = 0; // seconds the GEAR lamp stays lit after the gear jumped out
let heat = 0;   // engine temperature with an ECU tune, 0 cold .. 1 the top of the red zone
const HOT = 0.8; // the red zone: from here on the heat damages the engine
const tuned = () => lvl('ecuRev') + lvl('ecuPower') > 0;

function hurt(kmh, headOn) { addDamage(headOn ? 50 : clamp(kmh * 0.25, 2, 25)); }
function addDamage(pct) {
  const before = progress.damage;
  progress.damage = Math.min(100, before + pct);
  for (const at of [50, 70]) if (before < at && progress.damage >= at) breakGear();
  if (Math.floor(before) !== Math.floor(progress.damage)) { applyUpgrades(); buildDials(); buildGate(); } // at once
}
function breakGear() { // one of the gears above 1st, at random
  const left = [];
  for (let g = 2; g <= topGear(); g++) if (!progress.broken.includes(g)) left.push(g);
  if (!left.length) return;
  const g = left[Math.floor(Math.random() * left.length)];
  progress.broken.push(g);
  if (gear === g) popOut();
}
function popOut() { // the gear jumps out to neutral; the lever drops back onto the rail
  engage(0);
  Object.assign(lever, { y: 0, path: null });
  popped = 2;
  flash('POPPED OUT', '#fb3', false);
}
function damageTick(dt) {
  popped = Math.max(0, popped - dt);
  // a worn gearbox under load jumps out of gear: once in ~15 s at 80%, every ~5 s at 100%
  if (progress.damage >= 80 && gear && locked && throttle > 0.5 && Math.random() < dt * (progress.damage - 70) / 150) popOut();
  // the tune's heat: revving past the factory redline heats fast (held there, the red in ~6 s), the extra power under
  // throttle slowly (floored, ~40 s); easing off cools. In the red it damages the engine, up to 2% a second.
  if (!tuned()) { heat = 0; return; }
  const over = Math.max(0, rpm - engine.stock.redline) / 1000, push = throttle * lvl('ecuPower') / UPGRADES.ecuPower.max;
  const was = heat;
  heat = clamp(heat + dt * (0.15 * over + 0.07 * push - 0.05), 0, 1);
  if (heat >= HOT) addDamage(dt * (0.3 + 1.7 * (heat - HOT) / (1 - HOT)));
  if (was < HOT && heat >= HOT) { flash('OVERHEATING', '#f55', false); beep(220, 0.3); }
}
function coolDown() { heat = 0; } // a fresh run starts with a cold engine

const repairCost = () => Math.ceil(progress.damage * REPAIR);
function repair() { // as much as the metres allow; gears come back once below the damage that broke them
  const pct = Math.min(progress.damage, progress.bank / REPAIR);
  if (pct <= 0) return false;
  progress.bank -= Math.ceil(pct * REPAIR);
  progress.damage = Math.max(0, +(progress.damage - pct).toFixed(1));
  progress.broken = progress.broken.slice(0, progress.damage >= 70 ? 2 : progress.damage >= 50 ? 1 : 0);
  save();
  return true;
}

// ---- what you see: cracks on the windscreen, damage and the GEAR lamp on the cluster ----
let shownCracks = -1;
function renderDamage() {
  const d = Math.round(progress.damage);
  $('cluster-dmg').textContent = d ? `DMG ${d}%` : '';
  $('lamp-gear').style.fill = popped && performance.now() % 400 < 250 ? '#fb3' : '#333';
  $('heat').style.display = tuned() ? '' : 'none'; // the TEMP bar, with a tune
  $('heat-fill').setAttribute('width', 64 * heat);
  $('heat-fill').style.fill = heat >= HOT ? (performance.now() % 300 < 180 ? '#f33' : '#a11') : heat > 0.5 ? '#fb3' : '#5bf';
  if (d !== shownCracks) { shownCracks = d; $('cracks').innerHTML = cracks(d); }
}
function clearDamageView() { $('cluster-dmg').textContent = ''; $('cracks').innerHTML = ''; shownCracks = -1; $('heat').style.display = 'none'; }

// a crack star for every 10% (the same places every time), spokes longer with more damage
function cracks(d) {
  let rnd = 9, s = '';
  const r = () => ((rnd = (rnd * 16807) % 2147483647) - 1) / 2147483646;
  for (let k = 0; k < Math.ceil(d / 10); k++) {
    const cx = 260 + r() * 1080, cy = 90 + r() * 420, reach = 50 + d * 1.5, spokes = 7 + Math.floor(r() * 5);
    for (let i = 0; i < spokes; i++) {
      let a = (i + r() * 0.6) / spokes * 2 * Math.PI, x = cx, y = cy, pts = `${x.toFixed(0)},${y.toFixed(0)}`;
      for (let j = 0, len = reach * (0.5 + r()); j < 4; j++) { // a jagged spoke
        a += (r() - 0.5) * 0.5; x += Math.cos(a) * len / 4; y += Math.sin(a) * len / 4;
        pts += ` ${x.toFixed(0)},${y.toFixed(0)}`;
      }
      s += `<polyline points="${pts}"/>`;
    }
    s += `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${(8 + r() * 10).toFixed(0)}"/>`;
  }
  return s;
}
