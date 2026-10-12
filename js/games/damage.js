// Damage, from the moment you buy reckless driving. Every collision adds to one meter, 0-100%, harder hits more and
// a head-on most (and it ends the run). The car drives worse at once: the rev limit drops by 30 rpm per percent (up to
// 1,500 rpm at 50%), a random gear breaks at 50% and another at 70%, past 80% the gear pops out now and then under
// load, and at 100% the car is wrecked. Repairs cost metres. The windscreen shows it all, cracks growing with damage.
const REPAIR = 40; // metres per percent of damage
const damageOn = () => lvl('reckless') > 0;
const revLoss = () => damageOn() ? Math.min(1500, 30 * progress.damage) : 0;
let popped = 0; // seconds the GEAR lamp stays lit after the gear jumped out

function hurt(kmh, headOn) {
  const before = progress.damage;
  progress.damage = Math.min(100, before + (headOn ? 50 : clamp(kmh * 0.25, 2, 25)));
  for (const at of [50, 70]) if (before < at && progress.damage >= at) breakGear();
  applyUpgrades(); buildDials(); buildGate(); // the lower limit and any broken gear, right away
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
function damageTick(dt) { // a worn gearbox under load: once in ~15 s at 80%, every ~5 s at 100%
  popped = Math.max(0, popped - dt);
  if (progress.damage >= 80 && gear && locked && throttle > 0.5 && Math.random() < dt * (progress.damage - 70) / 150) popOut();
}

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
  if (d !== shownCracks) { shownCracks = d; $('cracks').innerHTML = cracks(d); }
}
function clearDamageView() { $('cluster-dmg').textContent = ''; $('cracks').innerHTML = ''; shownCracks = -1; }

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
