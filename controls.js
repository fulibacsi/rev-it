// Input. Keyboard, mouse and touch all work at once, on the same key, pedals and gear lever.
// Mouse: drag them like the real thing. One pointer can't hold two pedals, so a pedal stays where the mouse leaves
// it (double-click lets it go). Keyboard and touch hold a pedal only while the key or finger is down.
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
  Object.assign(p, { hold: null, back: 0 });
  const el = $(id);
  let from;
  drag(el, (e, first) => {
    if (first) from = { y: e.clientY, v: p.get() };
    // full travel = the pedal box's height (the pedal itself looks shorter as it tilts, so it can't be the ruler)
    p.set(clamp(from.v + (e.clientY - from.y) / el.parentNode.getBoundingClientRect().height, 0, 1));
    p.back = 0;
  }, e => { if (byHand(e)) p.back = FINGER_OFF; });
  el.ondblclick = () => p.set(0);
}
function updatePedals(dt) {
  for (const p of Object.values(PEDALS)) {
    const v = p.get();
    if (p.hold !== null) p.set(p.hold > v ? Math.min(p.hold, v + dt / p.press) : Math.max(p.hold, v - dt / p.press));
    else if (p.back) { p.set(Math.max(0, v - dt / p.back)); if (!p.get()) p.back = 0; }
  }
}
function holdPedal(id, down) { const p = PEDALS[id]; p.hold = down ? 1 : null; if (!down) p.back = p.release; }

// ---- gear lever in an H gate: slide along the neutral rail, push up or down into a slot when lined up with it.
// Gate units: x -1..1 across the three slots, y -1 (towards the dash: 1, 3, 5) .. 1 (2, 4, 6). Only the gears the
// game gives you are cut into the gate. path: points it is being moved through (keyboard, auto shift).
const SLOTS = { '-1,-1': 1, '-1,1': 2, '0,-1': 3, '0,1': 4, '1,-1': 5, '1,1': 6 };
const LEVER_SPEED = 8; // gate units per second when moved for you: about 0.3 s a shift
const lever = { x: 0, y: 0, grinding: false, held: false, path: null };
const slotOf = g => [Math.floor((g - 1) / 2) - 1, g % 2 ? -1 : 1];
const gateGears = () => game.gears();
const hasSlot = (x, side) => (SLOTS[`${x},${side}`] ?? Infinity) <= gateGears();
function buildGate() {
  const top = gateGears();
  let d = `M-1,0 H${top ? slotOf(top)[0] : 0}`, labels = '';
  for (let g = 1; g <= 6; g++) {
    const [x, y] = slotOf(g);
    if (g <= top) d += ` M${x},0 V${y}`;
    labels += `<text x="${x}" y="${y < 0 ? -1.3 : 1.53}"${g <= top ? '' : ' class="locked"'}>${g}</text>`;
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
function shiftBy(step) { // keyboard: next gear up or down, through neutral
  const g = gear + step;
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
drag($('shifter'), (e, first) => {
  const [px, py] = svgPoint($('shifter'), e);
  if (first) {
    lever.held = Math.hypot(px - lever.x, py - lever.y) <= 0.6; // grab the knob, not the gate
    if (lever.held) lever.path = null;
    if (lever.held && aid('clutch')) { clutchPedal = 1; clutch = 0; } // a hand on the lever: the auto clutch is out
  }
  if (!lever.held) return;
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

// ---- keyboard ----
const HELD_KEYS = { ' ': 'gas', Shift: 'clutch', b: 'brake', B: 'brake' };
addEventListener('keydown', e => {
  if (e.key === 'Escape') return toggleMenu();
  if (menuOpen || e.target.closest?.('button') && e.key === ' ') return;
  if (game.key?.(e.key)) return e.preventDefault();
  const n = Number(e.key);
  if (HELD_KEYS[e.key]) { e.preventDefault(); holdPedal(HELD_KEYS[e.key], true); }
  else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); if (!e.repeat) shiftBy(e.key === 'ArrowUp' ? 1 : -1); }
  else if (e.key === 'Enter' && !e.repeat) state === 'off' ? startEngine() : stopEngine();
  else if (n >= 1 && n <= ENGINES.length) pickEngine(n - 1);
});
addEventListener('keyup', e => { if (HELD_KEYS[e.key]) holdPedal(HELD_KEYS[e.key], false); });
addEventListener('blur', () => { for (const id of Object.keys(PEDALS)) if (PEDALS[id].hold !== null) holdPedal(id, false); });

function updateControls(dt) { // once a frame, before the aids and the physics
  updatePedals(dt);
  stepLever(dt);
  if (autoKey && state === 'running') { autoKey = false; keyAngle = KEY.on; crank(false); }
}
