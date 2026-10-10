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
  else s += `<path class="band" fill="none" stroke-width="8"/>`; // speedometer: game target, filled in per frame
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

function flash(text, color, rise) { // short message floating up (good news) or sinking (bad news) on the HUD
  const f = $('flash'), [from, to] = rise ? ['0px', '-50px'] : ['-50px', '10px'];
  f.textContent = text;
  f.style.color = color;
  f.animate([{ opacity: 1, transform: `translate(-50%, ${from}) scale(1.3)` },
             { opacity: 0, transform: `translate(-50%, ${to}) scale(1)` }], { duration: 1200, easing: 'ease-out' });
}
function onLevelChange(up) { flash(up ? '▲ LEVEL UP' : '▼ LEVEL DOWN', up ? '#5f5' : '#f55', up); }

// ---- kinetic controls: everything is dragged with the mouse (or a finger) ----
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const svgPoint = (svg, e) => { const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse()); return [p.x, p.y]; };
function drag(el, onMove, onUp) { // pointer capture keeps the drag going when the pointer leaves the control
  el.onpointerdown = e => { el.setPointerCapture(e.pointerId); onMove(e, true); };
  el.onpointermove = e => { if (el.hasPointerCapture(e.pointerId)) onMove(e, false); };
  el.onpointerup = el.onpointercancel = () => onUp?.();
  el.oncontextmenu = e => e.preventDefault(); // long-press on touch screens
}

// ignition key: turn it clockwise to START and hold it there until the engine fires; it springs back to ON.
// Turned back to OFF, the engine stops. Angles in degrees from straight up.
const KEY = { off: -35, on: 35, start: 90, startZone: 70 };
let keyAngle = KEY.off;
drag($('ignition'), e => {
  const [x, y] = svgPoint($('ignition'), e);
  keyAngle = clamp(Math.atan2(x - 65, 70 - y) * 180 / Math.PI, KEY.off, KEY.start);
  crank(keyAngle >= KEY.startZone);
  if (keyAngle <= 0) state = 'off';
}, () => {
  keyAngle = keyAngle > 0 ? KEY.on : KEY.off;
  crank(false);
  if (keyAngle === KEY.off) state = 'off';
});

// pedals: drag down to press. One pointer can't hold two pedals at once, so they stay where you leave them;
// a double-click lets a pedal spring back up.
const PEDALS = { clutch: [() => clutchPedal, v => { clutchPedal = v; }], brake: [() => brakePedal, v => { brakePedal = v; }],
                 gas: [() => gasPedal, v => { gasPedal = v; }] };
for (const [id, [get, set]] of Object.entries(PEDALS)) {
  const el = $(id);
  let from;
  drag(el, (e, first) => {
    if (first) from = { y: e.clientY, v: get() };
    // full travel = the pedal box's height (the pedal itself looks shorter as it tilts, so it can't be the ruler)
    set(clamp(from.v + (e.clientY - from.y) / el.parentNode.getBoundingClientRect().height, 0, 1));
  });
  el.ondblclick = () => set(0);
}

// gear lever in an H gate: slide along the neutral rail, push up or down into a slot when lined up with it.
// Gate units: x -1..1 across the three slots, y -1 (towards the dash: 1, 3, 5) .. 1 (2, 4, 6).
const SLOTS = { '-1,-1': 1, '-1,1': 2, '0,-1': 3, '0,1': 4, '1,-1': 5, '1,1': 6 };
const lever = { x: 0, y: 0, grinding: false };
drag($('shifter'), (e, first) => {
  const [px, py] = svgPoint($('shifter'), e);
  if (first) lever.held = Math.hypot(px - lever.x, py - lever.y) <= 0.6; // grab the knob, not the gate
  if (!lever.held) return;
  let { x, y } = lever;
  if (Math.abs(y) < 0.05) { // on the rail: slide sideways, drop into a slot only when lined up with it
    x = clamp(px, -1, 1);
    const col = Math.round(x);
    if (Math.abs(x - col) < 0.2 && Math.abs(py) > 0.1) { x = col; y = clamp(py, -1, 1); } else y = 0;
  } else y = clamp(py, -1, 1); // in a slot: only along it (straight through neutral to the opposite gear is fine)
  if (Math.abs(y) >= 0.45) { // into gear: only with the clutch down while the engine runs
    if (!engage(SLOTS[`${x},${Math.sign(y)}`])) {
      y = 0.44 * Math.sign(y);
      if (!lever.grinding) { grind(); flash('CLUTCH!', '#f55', false); lever.grinding = true; }
    }
  } else { engage(0); lever.grinding = false; }
  Object.assign(lever, { x, y });
}, () => { // let go: it snaps fully into the gear, or springs back to the middle of the rail
  if (!lever.held) return;
  Object.assign(lever, gear ? { y: Math.sign(lever.y) } : { x: 0, y: 0 }, { held: false, grinding: false });
});

// ---- head-up display ----
const pips = $('pips');
LEVELS.forEach(() => pips.append(document.createElement('i')));

function renderGame(onTarget) {
  document.body.classList.toggle('game', game.on);
  document.body.classList.toggle('hit', onTarget);
  $('game-toggle').textContent = game.on ? 'GAME ON' : 'GAME OFF';
  // levels below are solid; the current one is the gauge, green when nearly full, red when nearly empty
  $('lvl').textContent = `LEVEL ${game.level + 1}`;
  pips.querySelectorAll('i').forEach((p, i) => {
    p.style.setProperty('--f', i < game.level ? '100%' : i > game.level ? '0%' : game.gauge * 100 + '%');
    p.style.setProperty('--c', i !== game.level ? 'var(--hud)' : game.gauge >= 0.75 ? '#5f5' : game.gauge <= 0.25 ? '#f55' : 'var(--hud)');
  });
  const s = $('score'), [width, pps] = LEVELS[game.level], next = game.signs[0];
  if (!game.on) s.textContent = game.points ? `${Math.round(game.points)} pts\nlast game · best level ${game.best + 1}` : '';
  else if (state !== 'running' && !game.lo) s.textContent = 'turn the key to start';
  else s.textContent = `${Math.round(game.points)} pts\n${width} km/h band · ${pps} pts/s\n` +
    (game.lo ? `target ${Math.round(game.lo)}–${Math.round(game.hi)} km/h · ` : '') +
    `next sign ${next.value} in ${Math.max(0, Math.round(next.z - odo))} m` + (game.note ? `\n${game.note}` : '');
  const band = $('speedo').querySelector('.band'); // target band on the speedometer
  band.setAttribute('d', game.on && game.lo ? arc(420, dialAngle(game.lo, SPEEDO_MAX), dialAngle(game.hi, SPEEDO_MAX), DIAL.r - 4) : '');
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
  const ignitionOn = keyAngle > 0; // warning lamps glow with the ignition on and the engine not running
  lamp('lamp-batt', ignitionOn && state !== 'running', '#f44'); lamp('lamp-oil', ignitionOn && state !== 'running', '#f44');
  lamp('lamp-brake', brakePedal > 0.05, '#f44'); lamp('lamp-clutch', clutchPedal > CAR.bite[0], '#fb3');
  $('cluster-gear').textContent = $('hud-gear').textContent = gear || 'N';
  $('hud-speed').textContent = Math.round(kmh);
  $('fill').style.width = Math.min(100, shown / tachMax * 100) + '%';

  // controls follow their state: key angle, pedal depth, lever position
  $('key').style.transform = `rotate(${keyAngle}deg)`;
  $('ignition').dataset.state = keyAngle >= KEY.startZone ? 'start' : keyAngle > 0 ? 'on' : 'off';
  for (const [id, [get]] of Object.entries(PEDALS)) {
    $(id).style.transform = `perspective(300px) rotateX(${get() * 35}deg)`;
    $(id).parentNode.style.setProperty('--depth', get());
  }
  $('knob').setAttribute('transform', `translate(${lever.x} ${lever.y})`);
  $('knob-gear').textContent = gear || 'N';

  renderGame(updateGame(dt));
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
