// UI: input, the main loop, the cockpit view and its instruments.
const $ = id => document.getElementById(id);

const list = $('engines'); // engine buttons on the centre console
ENGINES.forEach((e, i) => {
  const b = document.createElement('button');
  b.textContent = `${i + 1} · ${e.name}`;
  b.onclick = () => selectEngine(i);
  list.append(b);
});

function selectEngine(i) {
  engine = ENGINES[i];
  [...list.children].forEach((b, j) => b.classList.toggle('on', j === i));
  if (engine.buffers) buildPlayers();
  game.left = 0; // new rev range: pick a fresh target
  buildDials();
}

// ---- instrument cluster: analogue dials drawn as SVG ----
const DIAL = { cy: 105, r: 86, sweep: 135 }, SPEEDO_MAX = 260; // needles sweep ±135° from straight up
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
  s += `<path class="band" fill="none" stroke-width="8"/>`; // game target, filled in per frame
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
function buildDials() {
  tachMax = Math.ceil((engine.redline + 1000) / 1000) * 1000;
  buildDial($('tach'), 140, tachMax, 250, 1000, 1000, '×1000 rpm', v => v / 1000, engine.redline);
  buildDial($('speedo'), 420, SPEEDO_MAX, 10, 20, 40, 'km/h', v => v);
}
const needle = (id, cx, v, max) => $(id).querySelector('.needle').setAttribute('transform', `rotate(${dialAngle(v, max)} ${cx} ${DIAL.cy})`);
selectEngine(0);

$('game-toggle').onclick = toggleGame;
$('ignition').onclick = () => state === 'off' ? ignite() : (state = 'off');

function flash(text, color, rise) { // short message floating up (good news) or sinking (bad news) on the HUD
  const f = $('flash'), [from, to] = rise ? ['0px', '-50px'] : ['-50px', '10px'];
  f.textContent = text;
  f.style.color = color;
  f.animate([{ opacity: 1, transform: `translate(-50%, ${from}) scale(1.3)` },
             { opacity: 0, transform: `translate(-50%, ${to}) scale(1)` }], { duration: 1200, easing: 'ease-out' });
}
function onLevelChange(up) { flash(up ? '▲ LEVEL UP' : '▼ LEVEL DOWN', up ? '#5f5' : '#f55', up); }

function tryShift(step) {
  if (!shift(step)) { grind(); flash('CLUTCH!', '#f55', false); }
}

// ---- input: keyboard, plus on-screen pedals and gear buttons for the mouse ----
const KEYS = { ' ': v => setGas(v), Shift: v => { clutchDown = v; }, b: v => { braking = v; }, B: v => { braking = v; } };
addEventListener('keydown', e => {
  const n = Number(e.key);
  if (KEYS[e.key]) { e.preventDefault(); KEYS[e.key](true); }
  else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); if (!e.repeat) tryShift(e.key === 'ArrowUp' ? 1 : -1); }
  else if (n >= 1 && n <= ENGINES.length) selectEngine(n - 1);
  else if (e.key.toLowerCase() === 'g') toggleGame();
  else if (e.key === 'Enter' && state === 'off') ignite();
  else if (e.key === 'Escape') state = 'off';
});
addEventListener('keyup', e => { if (KEYS[e.key]) KEYS[e.key](false); });
addEventListener('blur', () => { setGas(false); clutchDown = braking = false; }); // don't get stuck if focus is lost

// pointer capture keeps the release even if it happens off the pedal
for (const [id, set] of [['gas', v => setGas(v)], ['clutch', v => { clutchDown = v; }], ['brake', v => { braking = v; }]]) {
  const p = $(id);
  p.onpointerdown = e => { p.setPointerCapture(e.pointerId); set(true); };
  p.onpointerup = p.onpointercancel = () => set(false);
  p.oncontextmenu = e => e.preventDefault(); // long-press on touch screens
}
$('gear-up').onclick = () => tryShift(1);
$('gear-down').onclick = () => tryShift(-1);

// ---- head-up display ----
const pips = $('pips');
LEVELS.forEach(() => pips.append(document.createElement('i')));

function renderGame(onTarget) {
  document.body.classList.toggle('game', game.on);
  document.body.classList.toggle('hit', onTarget);
  $('game-toggle').textContent = game.on ? 'GAME: REV' : 'GAME OFF';
  // levels below are solid; the current one is the gauge, green when nearly full, red when nearly empty
  $('lvl').textContent = `LEVEL ${game.level + 1}`;
  pips.querySelectorAll('i').forEach((p, i) => {
    p.style.setProperty('--f', i < game.level ? '100%' : i > game.level ? '0%' : game.gauge * 100 + '%');
    p.style.setProperty('--c', i !== game.level ? 'var(--hud)' : game.gauge >= 0.75 ? '#5f5' : game.gauge <= 0.25 ? '#f55' : 'var(--hud)');
  });
  const s = $('score'), [width, pps] = LEVELS[game.level];
  if (!game.on) s.textContent = game.points ? `${Math.round(game.points)} pts\nlast game · best level ${game.best + 1}` : '';
  else if (!game.lo) s.textContent = 'press ENTER to start';
  else s.textContent = `${Math.round(game.points)} pts\n` +
    `${width} rpm band · ${pps} pts/s · target ${game.lo}–${game.hi} · new in ${Math.ceil(game.left)}s` +
    (game.note ? `\n${game.note}` : '');
  // target band on the HUD rpm strip and on the tachometer
  $('target').style.left = game.lo / tachMax * 100 + '%';
  $('target').style.width = (game.hi - game.lo) / tachMax * 100 + '%';
  const band = $('tach').querySelector('.band');
  band.setAttribute('d', game.on && game.lo ? arc(140, dialAngle(game.lo, tachMax), dialAngle(game.hi, tachMax), DIAL.r - 4) : '');
  band.setAttribute('stroke', onTarget ? '#5f5' : '#fff');
}

// ---- main loop ----
const canvas = $('world'), g2d = canvas.getContext('2d');
function resize() { const s = Math.min(devicePixelRatio, 1.5); canvas.width = innerWidth * s; canvas.height = innerHeight * s; }
addEventListener('resize', resize);
resize();

let last = performance.now(), steer = 0;
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000); // a background tab can stall the loop: don't jump
  last = now;
  stepCar(dt, updateEngine(dt, now));
  if (stalled) { stalled = false; flash('STALL', '#f55', false); }
  updateTraffic(dt);
  const shown = shownRpm(now), kmh = speed * 3.6;
  if (players.length) updateAudio(shown);

  drawRoad(g2d, canvas.width, canvas.height, dt);
  const curve = segments[Math.floor(odo % (ROAD.count * ROAD.segment) / ROAD.segment)].curve;
  steer += (curve * 9000 - steer) * Math.min(1, dt * 3); // the wheel follows the bends
  $('wheel-rim').setAttribute('transform', `rotate(${steer} 500 560)`);

  needle('tach', 140, shown, tachMax);
  needle('speedo', 420, kmh, SPEEDO_MAX);
  $('shift-light').setAttribute('fill', cut && now % 200 < 100 ? '#f22' : rpm > engine.redline - 600 ? '#fa0' : '#330');
  const lamp = (id, on, color) => $(id).style.fill = on ? color : '#333';
  lamp('lamp-batt', state !== 'running', '#f44'); lamp('lamp-oil', state !== 'running', '#f44');
  lamp('lamp-brake', braking, '#f44'); lamp('lamp-clutch', clutchDown, '#fb3');
  $('cluster-gear').textContent = $('gear').textContent = $('hud-gear').textContent = gear || 'N';
  $('hud-speed').textContent = Math.round(kmh);
  $('fill').style.width = Math.min(100, shown / tachMax * 100) + '%';
  $('ignition').dataset.state = state;
  $('gas').classList.toggle('down', gas);
  $('clutch').classList.toggle('down', clutchDown);
  $('brake').classList.toggle('down', braking);

  renderGame(updateGame(dt, rpm));
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
