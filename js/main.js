// The app shell: menu, instrument cluster, head-up display and the main loop. The games plug in here (rev.js,
// signs.js, distance.js, and Free drive below); controls.js handles the input.
// A game: { id, name, blurb, hud: 'levels' | 'run' | undefined, gears(): gears in the gate, parked?, and optionally
//   start(), stop(), update(dt), render(), marks() for the roadside, readout() for the big HUD number,
//   engine() / tune() when it chooses and tunes the car itself, key(k) to take a key press }
const fmt = n => Math.round(n).toLocaleString('en-US');

// settings kept between visits: the engine for the games that let you choose, best scores
const SETTINGS_KEY = 'car-rev-settings';
const settings = Object.assign({ engine: 0, best: {}, layout: 'auto' }, (() => {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) ?? {}; } catch { return {}; }
})());
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* not saved */ } }

const FREE = { id: 'free', name: 'Free drive', blurb: 'No targets, no clock: just the coast road.', gears: () => 6 };
const GAMES = [REV, SIGNS, DISTANCE, FREE];
let game = FREE, menuOpen = false, playing = false;

function selectEngine(i) {
  engine = ENGINES[i];
  if (engine.buffers) buildPlayers();
  buildDials();
}
function refreshCar() { // the game's tune (stock unless it has a garage), its engine, the gears it allows
  (game.tune ?? stockCar)();
  selectEngine(game.engine?.() ?? settings.engine);
  buildGate();
}
function pickEngine(i) { // menu or keys 1-3; Distance drives what its garage gives it
  settings.engine = i;
  saveSettings();
  if (!game.engine) selectEngine(i);
  renderMenu();
}
// touch layout (shifter left, pedals right, bigger): a multi-touch screen whose main pointer is a finger, i.e. a
// phone or tablet, not a laptop with a touchscreen. The menu can force either layout.
const LAYOUTS = ['auto', 'touch', 'desktop'];
const touchDevice = matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 1;
const touchLayout = () => settings.layout === 'touch' || settings.layout === 'auto' && touchDevice;
function applyLayout() { document.body.classList.toggle('touch', touchLayout()); }
function goFullscreen() { // phones: the whole screen, held sideways (where the browser allows it)
  if (!touchLayout() || document.fullscreenElement) return;
  document.documentElement.requestFullscreen?.({ navigationUI: 'hide' })
    .then(() => screen.orientation?.lock?.('landscape')).catch(() => { /* not allowed here: fine */ });
}

function resetScene() { resetCar(); resetLever(); resetTraffic(); if (game.parked) carX = SHOULDER; }

function play(g) {
  leaveGame();
  game = g;
  playing = true;
  stopEngine();
  resetScene();
  document.body.dataset.game = g.id;
  document.body.dataset.hud = g.hud ?? '';
  showBand('tach', 0, 0); showBand('speedo', 0, 0);
  $('pips').querySelectorAll('i').forEach(p => p.remove());
  g.levels?.table.forEach(() => $('pips').append(document.createElement('i')));
  g.start?.();
  refreshCar();
  closeMenu();
  goFullscreen();
}
function leaveGame() { // keep the best score, let the game tidy up
  const lv = game.levels, best = settings.best[game.id];
  if (lv?.points && (!best || lv.points > best.points)) { settings.best[game.id] = { points: Math.round(lv.points), level: lv.best }; saveSettings(); }
  game.stop?.();
  document.body.classList.remove('hit', 'garage', 'low');
}

// ---- menu ----
function renderMenu() {
  const best = g => g === DISTANCE ? (progress.best ? `best ${fmt(progress.best)} m` : '')
    : settings.best[g.id] ? `best ${fmt(settings.best[g.id].points)} pts · level ${settings.best[g.id].level + 1}` : '';
  $('game-list').innerHTML = GAMES.map(g =>
    `<button data-play="${g.id}"${g === game && playing ? ' class="on"' : ''}><b>${g.name}</b><small>${g.blurb}</small><i>${best(g)}</i></button>`).join('');
  $('engine-pick').innerHTML = ENGINES.map((e, i) => `<button data-engine="${i}"${i === settings.engine ? ' class="on"' : ''}>${e.name}</button>`).join('');
  $('resume').hidden = !playing;
  $('layout').textContent = `Layout: ${settings.layout}` + (settings.layout === 'auto' ? ` (${touchDevice ? 'touch' : 'mouse and keys'})` : '');
}
function openMenu() {
  menuOpen = true;
  document.body.classList.add('menu');
  ctx?.suspend(); // paused: the engine falls silent too
  renderMenu();
}
function closeMenu() {
  menuOpen = false;
  document.body.classList.remove('menu');
  ctx?.resume();
}
function toggleMenu() { if (!menuOpen) openMenu(); else if (playing) closeMenu(); }
$('menu').onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  loading ??= start(); // any click is a user gesture: audio can start
  if (b.dataset.play) play(GAMES.find(g => g.id === b.dataset.play));
  if (b.dataset.engine) pickEngine(+b.dataset.engine);
  if (b.id === 'resume') { closeMenu(); goFullscreen(); }
  if (b.id === 'layout') {
    settings.layout = LAYOUTS[(LAYOUTS.indexOf(settings.layout) + 1) % LAYOUTS.length];
    saveSettings(); applyLayout(); renderMenu();
  }
};
$('menu-button').onclick = openMenu;
addEventListener('click', e => e.target.closest('button')?.blur()); // keys stay with the car, not a focused button

// ---- instrument cluster: analogue dials drawn as SVG ----
const DIAL = { cy: 105, r: 86, sweep: 135 }, SPEEDO_MAX = 360; // needles sweep ±135° from straight up
let tachMax = 8000;
const polar = (cx, a, r) => [cx + r * Math.sin(a * Math.PI / 180), DIAL.cy - r * Math.cos(a * Math.PI / 180)];
const dialAngle = (v, max) => -DIAL.sweep + 2 * DIAL.sweep * Math.min(1, Math.max(0, v / max));
function arc(cx, a1, a2, r) {
  const [x1, y1] = polar(cx, a1, r), [x2, y2] = polar(cx, a2, r);
  return `M${x1},${y1} A${r},${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2},${y2}`;
}
function buildDial(g, cx, max, step, major, labelEvery, label, format, redFrom) {
  let s = `<circle cx="${cx}" cy="${DIAL.cy}" r="${DIAL.r + 6}" fill="#111" stroke="#2c2c35" stroke-width="2"/>`;
  if (redFrom) s += `<path d="${arc(cx, dialAngle(redFrom, max), DIAL.sweep, DIAL.r - 4)}" stroke="#c22" stroke-width="8" fill="none"/>`;
  s += `<path class="band" fill="none" stroke-width="8"/>`; // a game's target, set by showBand()
  for (let v = 0; v <= max; v += step) {
    const a = dialAngle(v, max), big = v % major === 0;
    const [x1, y1] = polar(cx, a, DIAL.r), [x2, y2] = polar(cx, a, DIAL.r - (big ? 14 : 7));
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ccc" stroke-width="${big ? 3 : 1.5}"/>`;
    if (v % labelEvery === 0) { const [tx, ty] = polar(cx, a, DIAL.r - 28); s += `<text x="${tx}" y="${ty + 5}" font-size="15">${format(v)}</text>`; }
  }
  s += `<text x="${cx}" y="${DIAL.cy + 46}" font-size="11">${label}</text>`;
  s += `<g class="needle"><line x1="${cx}" y1="${DIAL.cy + 12}" x2="${cx}" y2="${DIAL.cy - DIAL.r + 8}" stroke="#f33" ` +
       `stroke-width="4" stroke-linecap="round"/><circle cx="${cx}" cy="${DIAL.cy}" r="8" fill="#333"/></g>`;
  g.innerHTML = s;
}
function buildDials() { // the tach is scaled for the stock engine: a lower rev limit shows as a longer red zone
  tachMax = Math.ceil((engine.stock.redline + 1000) / 1000) * 1000;
  buildDial($('tach'), 140, tachMax, 250, 1000, 1000, '×1000 rpm', v => v / 1000, engine.redline);
  buildDial($('speedo'), 420, SPEEDO_MAX, 10, 30, 60, 'km/h', v => v);
}
const needle = (id, cx, v, max) => $(id).querySelector('.needle').setAttribute('transform', `rotate(${dialAngle(v, max)} ${cx} ${DIAL.cy})`);
const DIALS = { tach: { cx: 140, max: () => tachMax }, speedo: { cx: 420, max: () => SPEEDO_MAX } };
function showBand(id, lo, hi, on) { // a game's target range on a dial, green while you are in it
  const { cx, max } = DIALS[id], band = $(id).querySelector('.band');
  if (!band) return;
  band.setAttribute('d', hi > lo ? arc(cx, dialAngle(lo, max()), dialAngle(hi, max()), DIAL.r - 4) : '');
  band.setAttribute('stroke', on ? '#5f5' : '#fff');
}

function flash(text, color, rise) { // short message floating up (good news) or sinking (bad news) on the HUD
  const f = $('flash'), [from, to] = rise ? ['0px', '-50px'] : ['-50px', '10px'];
  f.textContent = text;
  f.style.color = color;
  f.animate([{ opacity: 1, transform: `translate(-50%, ${from}) scale(1.3)` },
             { opacity: 0, transform: `translate(-50%, ${to}) scale(1)` }], { duration: 1200, easing: 'ease-out' });
}


// ---- head-up display helpers for the games ----
function renderLevels(lv, on, text) { // level pips: levels below solid, the current one is its gauge
  document.body.classList.toggle('hit', on);
  $('lvl').textContent = `LEVEL ${lv.level + 1}`;
  $('pips').querySelectorAll('i').forEach((p, i) => {
    p.style.setProperty('--f', i < lv.level ? '100%' : i > lv.level ? '0%' : lv.gauge * 100 + '%');
    p.style.setProperty('--c', i !== lv.level ? 'var(--hud)' : lv.gauge >= 0.75 ? '#5f5' : lv.gauge <= 0.25 ? '#f55' : 'var(--hud)');
  });
  $('score').textContent = text;
}
function levelFlash(step) { flash(step > 0 ? '▲ LEVEL UP' : '▼ LEVEL DOWN', step > 0 ? '#5f5' : '#f55', step > 0); }

// ---- main loop ----
const canvas = $('world'), g2d = canvas.getContext('2d');
function resize() { const s = Math.min(devicePixelRatio, 1.5); canvas.width = innerWidth * s; canvas.height = innerHeight * s; }
addEventListener('resize', resize);
resize();

let last = performance.now(), steer = 0, shake = 0;
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000); // a background tab can stall the loop: don't jump
  last = now;
  requestAnimationFrame(tick);
  if (menuOpen) return; // paused
  updateControls(dt);
  updateAids(dt);
  stepCar(dt, updateEngine(dt, now));
  if (stalled) { stalled = false; flash('STALL', '#f55', false); }
  game.update?.(dt);
  updateTraffic(dt, now / 1000);
  if (crashed) { crashed = false; crashSound(); flash('CRASH', '#f55', false); shake = 0.4; }
  shake = Math.max(0, shake - dt); // the view jolts after a crash
  canvas.style.transform = shake ? `translate(${(Math.random() - 0.5) * 30 * shake}px, ${(Math.random() - 0.5) * 30 * shake}px)` : '';
  const shown = shownRpm(now), kmh = speed * 3.6;
  if (players.length) updateAudio(shown);

  drawRoad(g2d, canvas.width, canvas.height, dt);
  const curve = segments[Math.floor(odo % (ROAD.count * ROAD.segment) / ROAD.segment)].curve;
  if (wheel.held) steer = wheel.angle; // in your hands; let go, it eases back to following the road
  else steer += (curve * 9000 + slide * 12 - steer) * Math.min(1, dt * 3); // the bends and lane changes turn it
  $('wheel-rim').setAttribute('transform', `rotate(${steer} 500 560)`);

  needle('tach', 140, shown, tachMax);
  needle('speedo', 420, kmh, SPEEDO_MAX);
  $('shift-light').setAttribute('fill', cut && now % 200 < 100 ? '#f22' : rpm > engine.redline - 600 ? '#fa0' : '#330');
  const lamp = (id, on, color) => $(id).style.fill = on ? color : '#333';
  const ignitionOn = keyAngle > 0; // warning lamps glow with the ignition on and the engine not running
  lamp('lamp-batt', ignitionOn && state !== 'running', '#f44'); lamp('lamp-oil', ignitionOn && state !== 'running', '#f44');
  lamp('lamp-brake', brakePedal > 0.05, '#f44'); lamp('lamp-clutch', clutchPedal > CAR.bite[0], '#fb3');
  lamp('lamp-slip', spinning, '#fb3');
  $('cluster-gear').textContent = $('hud-gear').textContent = gear || 'N';
  const [value, unit] = game.readout?.() ?? [Math.round(kmh), 'km/h']; // the big number: speed, unless the game says
  $('hud-speed').textContent = value;
  $('hud-unit').textContent = unit;
  $('fill').style.width = Math.min(100, shown / tachMax * 100) + '%';

  // controls follow their state: key angle, pedal depth, lever position
  $('key').style.transform = `rotate(${keyAngle}deg)`;
  $('ignition').dataset.state = keyAngle >= KEY.startZone ? 'start' : keyAngle > 0 ? 'on' : 'off';
  for (const [id, { get }] of Object.entries(PEDALS)) {
    $(id).style.transform = `perspective(300px) rotateX(${get() * 35}deg)`;
    $(id).parentNode.style.setProperty('--depth', get());
  }
  $('knob').setAttribute('transform', `translate(${lever.x} ${lever.y})`);
  $('knob-gear').textContent = gear || 'N';

  game.render?.();
}
applyLayout();
refreshCar();
openMenu();
drawRoad(g2d, canvas.width, canvas.height, 0); // the view behind the menu
requestAnimationFrame(tick);
