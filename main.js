// UI: input, the main loop, the cockpit view and its instruments.
const $ = id => document.getElementById(id);

const fmt = n => Math.round(n).toLocaleString('en-US');

function selectEngine(i) {
  engine = ENGINES[i];
  if (engine.buffers) buildPlayers();
  buildDials();
}
function refreshCar() { // after the garage: upgrades on, chosen engine in, the gate cut for the gears there are
  applyUpgrades();
  selectEngine(progress.engine);
  buildGate();
}

// ---- instrument cluster: analogue dials drawn as SVG ----
const DIAL = { cy: 105, r: 86, sweep: 135 }, SPEEDO_MAX = 400; // needles sweep ±135° from straight up
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
  buildDial($('speedo'), 420, SPEEDO_MAX, 20, 40, 80, 'km/h', v => v);
}
const needle = (id, cx, v, max) => $(id).querySelector('.needle').setAttribute('transform', `rotate(${dialAngle(v, max)} ${cx} ${DIAL.cy})`);
function flash(text, color, rise) { // short message floating up (good news) or sinking (bad news) on the HUD
  const f = $('flash'), [from, to] = rise ? ['0px', '-50px'] : ['-50px', '10px'];
  f.textContent = text;
  f.style.color = color;
  f.animate([{ opacity: 1, transform: `translate(-50%, ${from}) scale(1.3)` },
             { opacity: 0, transform: `translate(-50%, ${to}) scale(1)` }], { duration: 1200, easing: 'ease-out' });
}

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
// Gate units: x -1..1 across the three slots, y -1 (towards the dash: 1, 3, 5) .. 1 (2, 4, 6). Only the gears the
// gearbox has are cut into the gate. path: where the auto shift is moving it.
const SLOTS = { '-1,-1': 1, '-1,1': 2, '0,-1': 3, '0,1': 4, '1,-1': 5, '1,1': 6 };
const lever = { x: 0, y: 0, grinding: false, held: false, path: null };
const hasSlot = (x, side) => (SLOTS[`${x},${side}`] ?? Infinity) <= topGear(); // is there a slot there
function buildGate() {
  let d = `M-1,0 H${slotOf(topGear())[0]}`, labels = '';
  for (let g = 1; g <= 6; g++) {
    const [x, y] = slotOf(g);
    if (g <= topGear()) d += ` M${x},0 V${y}`;
    labels += `<text x="${x}" y="${y < 0 ? -1.3 : 1.53}"${g <= topGear() ? '' : ' class="locked"'}>${g}</text>`;
  }
  $('gate').setAttribute('d', d);
  $('gate-labels').innerHTML = labels;
}
function placeLever(x, y) { // the knob to a gate position; past halfway into a slot it engages that gear
  if (Math.abs(y) >= 0.45) { // into gear: only with the clutch down while the engine runs
    if (!engage(SLOTS[`${x},${Math.sign(y)}`])) {
      y = 0.44 * Math.sign(y);
      if (!lever.grinding) { grind(); flash('CLUTCH!', '#f55', false); lever.grinding = true; }
    }
  } else { engage(0); lever.grinding = false; }
  Object.assign(lever, { x, y });
}
drag($('shifter'), (e, first) => {
  const [px, py] = svgPoint($('shifter'), e);
  if (first) {
    lever.held = Math.hypot(px - lever.x, py - lever.y) <= 0.6; // grab the knob, not the gate
    if (lever.held && aid('clutch')) { clutchPedal = 1; clutch = 0; } // a hand on the lever: the auto clutch is out
  }
  if (!lever.held) return;
  let { x, y } = lever;
  if (Math.abs(y) < 0.05) { // on the rail: slide sideways, drop into a slot only when lined up with it
    x = clamp(px, -1, slotOf(topGear())[0]);
    const col = Math.round(x);
    if (Math.abs(x - col) < 0.2 && Math.abs(py) > 0.1 && hasSlot(col, Math.sign(py))) { x = col; y = clamp(py, -1, 1); }
    else y = 0;
  } else y = clamp(py, hasSlot(x, -1) ? -1 : 0, hasSlot(x, 1) ? 1 : 0); // in a slot: along it, through neutral to the other
  placeLever(x, y);
}, () => { // let go: it snaps fully into the gear, or springs back to the middle of the rail
  if (!lever.held) return;
  Object.assign(lever, gear ? { y: Math.sign(lever.y) } : { x: 0, y: 0 }, { held: false, grinding: false });
});

// ---- garage ----
function renderGarage(bought) {
  $('bank').textContent = `${fmt(progress.bank)} m to spend`;
  const done = Object.keys(UPGRADES).every(id => whyNot(id) === 'max');
  $('report').innerHTML = !progress.runs
    ? `You get ${runTime()} seconds. Drive as far as you can: every metre is money for upgrades.`
    : `Last run <b>+${fmt(run.gain)} m</b>${run.newBest ? ' · <b>new best!</b>' : ''} · best ${fmt(progress.best)} m · ` +
      `${progress.runs} run${progress.runs > 1 ? 's' : ''} · ${runTime()} s a run` + (done ? ' · fully built: beat your best!' : '');
  $('engine-row').innerHTML = ENGINES.map((e, i) => i <= lvl('engine')
    ? `<button data-engine="${i}"${i === progress.engine ? ' class="on"' : ''}>${e.name}</button>`
    : i === lvl('engine') + 1
      ? `<button data-buy="engine"${whyNot('engine') ? ' disabled' : ''}>${e.name} · ${fmt(cost('engine'))} m</button>`
      : `<button disabled>${e.name} · locked</button>`).join('');
  $('cards').innerHTML = Object.entries(UPGRADES).filter(([id]) => id !== 'engine').map(([id, u]) => {
    const l = lvl(id), why = whyNot(id);
    const pips = u.max > 1 ? `<i>${'■'.repeat(l)}${'□'.repeat(u.max - l)}</i>` : '';
    const info = u.max > 1 ? u.info(l) + (l < u.max ? ` → ${u.info(l + 1)}` : '') : u.info();
    const button = why === 'max' ? (u.max > 1 ? '<button disabled>MAX</button>'
        : u.needs && progress.off[u.needs] ? `<button disabled>needs ${UPGRADES[u.needs].name} on</button>`
        : `<button data-toggle="${id}"${progress.off[id] ? '' : ' class="on"'}>${progress.off[id] ? 'OFF' : 'ON'}</button>`)
      : why.startsWith('needs') ? `<button disabled>${why}</button>`
      : `<button data-buy="${id}"${why ? ' disabled' : ''}>${fmt(cost(id))} m</button>`;
    return `<div class="card${id === bought ? ' bought' : ''}"><b>${u.name}</b>${pips}<small>${info}</small>${button}</div>`;
  }).join('');
}

$('garage').onclick = e => {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  loading ??= start(); // any click is a user gesture: audio can start
  const { buy: id, engine: i, toggle } = b.dataset;
  if (id && buy(id)) { beep(1760, 0.08); refreshCar(); }
  if (i) { progress.engine = +i; save(); refreshCar(); }
  if (toggle) { progress.off[toggle] = !progress.off[toggle]; save(); }
  if (b.id === 'reset' && confirm('Start over? This clears every metre and upgrade.')) { resetProgress(); refreshCar(); }
  if (b.id === 'drive') return drive();
  renderGarage(id);
};

let autoKey = false; // the key was turned for you at the start of a run, so let it spring back once the engine runs
function drive() {
  startRun();
  Object.assign(lever, { x: 0, y: 0, held: false, grinding: false, path: null });
  passedBest = false;
  if (state !== 'running') { keyAngle = KEY.start; crank(true); autoKey = true; }
}

// ---- head-up display: the run ----
let shownPhase, shownCount, passedBest = false;
function renderRun() {
  if (run.phase !== shownPhase) { // a new phase starts
    if (run.phase === 'run') { flash('GO!', '#5f5', true); beep(1320, 0.5); }
    if (run.phase === 'finish') { flash('TIME!', '#ec4', true); beep(880, 0.8); }
    if (run.phase === 'garage') renderGarage();
    document.body.classList.toggle('garage', run.phase === 'garage');
    shownPhase = run.phase;
  }
  if (run.phase === 'countdown' && Math.ceil(run.count) !== shownCount) { // 3, 2, 1
    shownCount = Math.ceil(run.count);
    flash(shownCount, '#fff', true);
    beep(660, 0.15);
  }
  if (run.phase === 'run' && run.best && odo >= run.best && !passedBest) {
    passedBest = true;
    flash('NEW BEST!', '#5f5', true);
  }
  const [dist, info] = {
    starting: ['', 'starting the engine…'],
    countdown: ['GET READY', [!aid('clutch') && 'clutch down', !aid('shift') && '1st gear', !aid('gas') && 'gas']
      .filter(Boolean).join(' · ') || 'sit back: the car does it all'],
    run: [`${fmt(odo)} m`, `${run.left.toFixed(1)} s` + (run.best ? ` · best ${fmt(run.best)} m` : '')],
    finish: [`${fmt(run.gain)} m`, run.newBest ? 'new best!' : 'time'],
  }[run.phase] ?? ['', ''];
  $('run-dist').textContent = dist;
  $('run-info').textContent = info;
  document.body.classList.toggle('low', run.phase === 'run' && run.left < 5);
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
  updateAids(dt);
  stepCar(dt, updateEngine(dt, now));
  if (stalled) { stalled = false; flash('STALL', '#f55', false); }
  if (autoKey && state === 'running') { autoKey = false; keyAngle = KEY.on; crank(false); }
  updateRun(dt);
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
  lamp('lamp-slip', spinning, '#fb3');
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

  renderRun();
  requestAnimationFrame(tick);
}
refreshCar();
requestAnimationFrame(tick);
