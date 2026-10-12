// Input. Keyboard, mouse and touch all work at once, on the same key, pedals, gear lever and steering wheel.
// Mouse: drag them like the real thing. One pointer can't hold two pedals, so a pedal stays where the mouse leaves
// it (double-click lets it go). Keyboard and fingers hold a pedal only while the key or finger is down; several
// fingers can hold several controls.
const $ = id => document.getElementById(id);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const svgPoint = (svg, e) => { const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse()); return [p.x, p.y]; };
function drag(el, onMove, onUp) { // one pointer per control; capture keeps the drag going off the control
  let id = null;
  el.onpointerdown = e => { if (id !== null) return; id = e.pointerId; el.setPointerCapture(id); onMove(e, true); };
  el.onpointermove = e => { if (e.pointerId === id) onMove(e, false); };
  el.onpointerup = el.onpointercancel = e => { if (e.pointerId === id) { id = null; onUp?.(e); } };
  el.oncontextmenu = e => e.preventDefault(); // long-press on touch screens
}
const byHand = e => e.pointerType !== 'mouse'; // a finger or pen: it holds, and lets go

// ---- ignition key: turn it clockwise to START and hold it there until the engine fires; it springs back to ON.
// Turned back to OFF, the engine stops. Angles in degrees from straight up.
const KEY = { off: -35, on: 35, start: 90, startZone: 70 };
let keyAngle = KEY.off, autoKey = false; // autoKey: turned for you (Enter, Distance): springs back once it runs
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
function startEngine() { if (state === 'off') { keyAngle = KEY.start; crank(true); autoKey = true; } }
function stopEngine() { keyAngle = KEY.off; autoKey = false; crank(false); state = 'off'; }

// ---- pedals: drag down to press ----
// hold: where a key holds it (null: no key); back: seconds to spring fully up once let go (0: stays put).
// press / release: how fast a foot on a key pushes it down / lets it up (a slow clutch, so a key can launch)
const PEDALS = {
  clutch: { get: () => clutchPedal, set: v => { clutchPedal = v; }, press: 0.12, release: 1.2 },
  brake: { get: () => brakePedal, set: v => { brakePedal = v; }, press: 0.1, release: 0.2 },
  gas: { get: () => gasPedal, set: v => { gasPedal = v; }, press: 0.05, release: 0.05 },
};
const FINGER_OFF = 0.15; // seconds for a pedal to spring up when a finger lets go
for (const [id, p] of Object.entries(PEDALS)) {
  Object.assign(p, { hold: null, back: 0, down: false }); // down: a finger or the mouse button is on it right now
  const el = $(id);
  let from;
  drag(el, (e, first) => {
    if (first) p.down = true;
    // full travel = the pedal box's height (the pedal itself looks shorter as it tilts, so it can't be the ruler).
    // A finger floors it and slides up to ease off (a phone's edge is right below the pedals, so never down);
    // the mouse drags it down from where it was.
    const travel = el.parentNode.getBoundingClientRect().height;
    if (first) from = { y: e.clientY, v: byHand(e) ? 1 : p.get() };
    p.set(clamp(from.v + (e.clientY - from.y) / travel, 0, 1));
    p.back = 0;
  }, e => { p.down = false; if (byHand(e)) p.back = FINGER_OFF; });
  el.ondblclick = () => p.set(0);
}
function updatePedals(dt) {
  for (const p of Object.values(PEDALS)) {
    const v = p.get();
    if (p.hold !== null) p.set(p.hold > v ? Math.min(p.hold, v + dt / p.press) : Math.max(p.hold, v - dt / p.press));
    else if (p.back) { p.set(Math.max(0, v - dt / p.back)); if (!p.get()) p.back = 0; }
  }
}
const pushing = () => PEDALS.gas.hold !== null || PEDALS.gas.down; // your own foot on the gas: it overrides the aids
function holdPedal(id, down) { const p = PEDALS[id]; p.hold = down ? 1 : null; if (!down) p.back = p.release; }

// ---- gear lever in an H gate: slide along the neutral rail, push up or down into a slot when lined up with it.
// Gate units: x -1..1 across the three slots, y -1 (towards the dash: 1, 3, 5) .. 1 (2, 4, 6). Only the gears the
// game gives you are cut into the gate. path: points it is being moved through (keyboard, auto shift).
const SLOTS = { '-1,-1': 1, '-1,1': 2, '0,-1': 3, '0,1': 4, '1,-1': 5, '1,1': 6, '2,-1': 7 }; // 7th: a fourth column
const LEVER_SPEED = 8; // gate units per second when moved for you: about 0.3 s a shift
const lever = { x: 0, y: 0, grinding: false, held: false, path: null, from: 0, out: false }; // from, out: see slotFor
const slotOf = g => [Math.floor((g - 1) / 2) - 1, g % 2 ? -1 : 1];
const gateGears = () => game.gears();
const hasSlot = (x, side) => { const g = SLOTS[`${x},${side}`] ?? Infinity; return g <= gateGears() && !brokenGears.includes(g); };
function buildGate() {
  const top = gateGears(), wide = top >= 7; // a 7th gear widens the gate by a column
  $('shifter').setAttribute('viewBox', `-1.6 -1.75 ${wide ? 4.2 : 3.2} 3.5`);
  $('gate-bg').setAttribute('width', wide ? 4.1 : 3.1);
  document.documentElement.style.setProperty('--gate-w', wide ? 4.2 : 3.2); // the layout makes room for it
  let d = `M-1,0 H${top ? slotOf(top)[0] : 0}`, labels = '';
  for (let g = 1; g <= (wide ? 7 : 6); g++) {
    const [x, y] = slotOf(g);
    const broken = brokenGears.includes(g); // damage: no slot, a red cross
    if (g <= top && !broken) d += ` M${x},0 V${y}`;
    labels += `<text x="${x}" y="${y < 0 ? -1.3 : 1.53}"${broken ? ' class="broken"' : g <= top ? '' : ' class="locked"'}>${broken ? '✕' : g}</text>`;
  }
  $('gate').setAttribute('d', d);
  $('gate-labels').innerHTML = labels;
}
function resetLever() { Object.assign(lever, { x: 0, y: 0, held: false, grinding: false, path: null }); }
function placeLever(x, y) { // the knob to a gate position; past halfway into a slot it engages that gear
  let ok = true;
  if (Math.abs(y) >= 0.45) { // into gear: only with the clutch down while the engine runs
    if (!engage(SLOTS[`${x},${Math.sign(y)}`])) {
      y = 0.44 * Math.sign(y);
      ok = false;
      if (!lever.grinding) { grind(); flash('CLUTCH!', '#f55', false); lever.grinding = true; }
    }
  } else { engage(0); lever.grinding = false; }
  Object.assign(lever, { x, y });
  return ok;
}
function moveLever(g) { // through the gate to gear g (0: neutral, back to the middle of the rail)
  if (g === 0) lever.path = [[lever.x, 0], [0, 0]];
  else { const [x, y] = slotOf(g); lever.path = [[lever.x, 0], [x, 0], [x, y]]; } // out to the rail, along, in
}
function shiftBy(step) { // keyboard: next gear up or down, through neutral, past any broken one
  let g = gear + step;
  while (brokenGears.includes(g)) g += step;
  if (!lever.held && g >= 0 && g <= gateGears()) moveLever(g);
}
function stepLever(dt) {
  if (!lever.path || lever.held) { lever.path = null; return; }
  for (let step = LEVER_SPEED * dt; step > 0 && lever.path?.length;) {
    const [tx, ty] = lever.path[0], d = Math.hypot(tx - lever.x, ty - lever.y);
    const ok = d <= step ? placeLever(tx, ty) : placeLever(lever.x + (tx - lever.x) * step / d, lever.y + (ty - lever.y) * step / d);
    if (!ok) { lever.path = null; lever.y = 0; return; } // grinding: it won't go in, drops back to the rail
    if (d <= step) { lever.path.shift(); step -= d; } else step = 0;
  }
  if (!lever.path.length) lever.path = null;
}
// a finger on a small screen rarely follows the H exactly: it cuts corners, or ends up between two columns. So once a
// finger has taken the lever out through neutral, wherever it is in the top or bottom row (as deep as a gear engages)
// the lever sits in the slot of the nearest column, as deep as the finger, and follows it if it drifts to another
// column. Between two columns the revs tip it: near the limiter towards the next gear up, with the revs sagging the
// next one down (2nd at the limiter, pushed up halfway between 1st and 3rd: 3rd). You still take it there yourself,
// with the clutch down, and the gear is the one the lever is in when you let go: it forgives the route, it does not
// shift for you.
const HINT = 0.4; // columns the gear the revs suggest is favoured by
function hintGear(from) { // the gear the road speed suggests after gear from, if any
  const top = gateGears(), r = engine.redline, next = step => { let g = from + step; while (brokenGears.includes(g)) g += step; return g; };
  if (!from) { let g = 1; while (g < top && (brokenGears.includes(g) || revsIn(g) > 0.75 * r)) g++; return g; } // the lowest that won't over-rev
  if (revsIn(from) > 0.75 * r && next(1) <= top) return next(1);
  if (revsIn(from) < 0.4 * r && next(-1) >= 1) return next(-1);
  return 0;
}
function slotFor(px, py) { // the gear a finger this deep into a row means, if any
  if (Math.abs(py) < 0.45) return 0;
  const hint = hintGear(lever.from), off = g => Math.abs(px - slotOf(g)[0]) - (g === hint ? HINT : 0);
  let best = 0;
  for (let g = 1; g <= gateGears(); g++)
    if (slotOf(g)[1] === Math.sign(py) && !brokenGears.includes(g) && (!best || off(g) < off(best))) best = g;
  return best;
}
drag($('shifter'), (e, first) => {
  const [px, py] = svgPoint($('shifter'), e);
  if (first) {
    lever.held = Math.hypot(px - lever.x, py - lever.y) <= (byHand(e) ? 0.9 : 0.6); // the knob, not the gate
    if (lever.held) lever.path = null;
    if (lever.held && aid('clutch')) { clutchPedal = 1; clutch = 0; } // a hand on the lever: the auto clutch is out
    Object.assign(lever, { from: gear, out: false });
  }
  if (!lever.held) return;
  if (byHand(e) && Math.abs(py) < 0.45) lever.out = true; // a finger: see slotFor. It has to come out through neutral first
  const g = byHand(e) && lever.out && slotFor(px, py);
  if (g) { placeLever(slotOf(g)[0], clamp(py, -1, 1)); return; }
  let { x, y } = lever;
  if (Math.abs(y) < 0.05) { // on the rail: slide sideways, drop into a slot only when lined up with it
    x = clamp(px, -1, gateGears() ? slotOf(gateGears())[0] : 0);
    const col = Math.round(x);
    if (Math.abs(x - col) < 0.2 && Math.abs(py) > 0.1 && hasSlot(col, Math.sign(py))) { x = col; y = clamp(py, -1, 1); }
    else y = 0;
  } else y = clamp(py, hasSlot(x, -1) ? -1 : 0, hasSlot(x, 1) ? 1 : 0); // in a slot: along it, through neutral to the other
  placeLever(x, y);
}, () => { // let go: it snaps fully into the gear, or springs back to the middle of the rail
  if (!lever.held) return;
  Object.assign(lever, gear ? { y: Math.sign(lever.y) } : { x: 0, y: 0 }, { held: false, grinding: false });
});

// ---- steering wheel: grab it anywhere near the rim and drag sideways; past TURN degrees the car changes lanes that
// way. It has to come back near the middle before it can change again, and springs back to the middle when let go.
const WHEEL = { turn: 20, gain: 0.35 }; // degrees that change lanes; degrees per wheel unit dragged sideways
const wheel = { held: false, angle: 0, from: 0, dir: 0 }; // angle: degrees turned, + clockwise; dir: last change
function steerLane(dir) { if (!game.parked) changeLane(dir); }
drag($('wheel-grip'), (e, first) => {
  const [x] = svgPoint($('wheel'), e);
  if (first) Object.assign(wheel, { held: true, from: x, angle: 0, dir: 0 });
  wheel.angle = clamp((x - wheel.from) * WHEEL.gain, -120, 120);
  const side = Math.abs(wheel.angle) >= WHEEL.turn ? Math.sign(wheel.angle) : 0;
  if (side && side !== wheel.dir) { steerLane(side); wheel.dir = side; }
  else if (Math.abs(wheel.angle) < WHEEL.turn / 3) wheel.dir = 0;
}, () => { wheel.held = false; });

// ---- headlight flash (Distance): press F or the FLASH button; the car ahead in your lane moves over ----
let flashedAt = -Infinity;
function flashLights() {
  const now = performance.now();
  if (!game.canFlash?.() || now - flashedAt < 800) return;
  flashedAt = now;
  flashAhead();
  document.body.classList.add('flashing');
  setTimeout(() => document.body.classList.remove('flashing'), 150);
  beep(2400, 0.03); // the stalk's click
}
$('headlights').onpointerdown = e => { e.preventDefault(); flashLights(); };

// ---- nitro (Distance): hold N, or hold the NOS button with the mouse or a finger ----
let nitroHeld = false;
$('nos').onpointerdown = e => { $('nos').setPointerCapture(e.pointerId); nitroHeld = true; };
$('nos').onpointerup = $('nos').onpointercancel = () => { nitroHeld = false; };
$('nos').oncontextmenu = e => e.preventDefault();

// ---- keyboard ----
const HELD_KEYS = { ' ': 'gas', Shift: 'clutch', b: 'brake', B: 'brake' };
addEventListener('keydown', e => {
  if (e.key === 'Escape') return toggleMenu();
  if (menuOpen || e.target.closest?.('button') && e.key === ' ') return;
  if (game.key?.(e.key)) return e.preventDefault();
  const n = Number(e.key);
  if (HELD_KEYS[e.key]) { e.preventDefault(); holdPedal(HELD_KEYS[e.key], true); }
  else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); if (!e.repeat) shiftBy(e.key === 'ArrowUp' ? 1 : -1); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); if (!e.repeat) steerLane(e.key === 'ArrowLeft' ? -1 : 1); }
  else if (e.key === 'Enter' && !e.repeat) state === 'off' ? startEngine() : stopEngine();
  else if (e.key === 'n' || e.key === 'N') nitroHeld = true;
  else if ((e.key === 'f' || e.key === 'F') && !e.repeat) flashLights();
  else if (n >= 1 && n <= ENGINES.length) pickEngine(n - 1);
});
addEventListener('keyup', e => {
  if (HELD_KEYS[e.key]) holdPedal(HELD_KEYS[e.key], false);
  if (e.key === 'n' || e.key === 'N') nitroHeld = false;
});
addEventListener('blur', () => {
  for (const id of Object.keys(PEDALS)) if (PEDALS[id].hold !== null) holdPedal(id, false);
  nitroHeld = false;
});

function updateControls(dt) { // once a frame, before the aids and the physics
  updatePedals(dt);
  stepLever(dt);
  if (autoKey && state === 'running') { autoKey = false; keyAngle = KEY.on; crank(false); }
}
