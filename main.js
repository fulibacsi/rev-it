// UI: input, the main loop and the on-screen readouts.
const $ = id => document.getElementById(id);

const list = $('engines');
ENGINES.forEach((e, i) => {
  const s = document.createElement('span');
  s.textContent = `${i + 1} · ${e.name}`;
  s.onclick = () => selectEngine(i);
  list.append(s);
});

function selectEngine(i) {
  engine = ENGINES[i];
  [...list.children].forEach((s, j) => s.classList.toggle('on', j === i));
  if (engine.buffers) buildPlayers();
  game.left = 0; // new rev range: pick a fresh target
}
selectEngine(0);

$('game-toggle').onclick = toggleGame;
$('ignition').onclick = () => state === 'off' ? ignite() : (state = 'off');

function flash(text, color, rise) { // short message floating up (good news) or sinking (bad news) at the readout
  const f = $('flash'), [from, to] = rise ? ['0px', '-60px'] : ['-60px', '20px'];
  f.textContent = text;
  f.style.color = color;
  f.animate([{ opacity: 1, transform: `translate(-50%, ${from}) scale(1.3)` },
             { opacity: 0, transform: `translate(-50%, ${to}) scale(1)` }], { duration: 1200, easing: 'ease-out' });
}
function onLevelChange(up) { flash(up ? '▲ LEVEL UP' : '▼ LEVEL DOWN', up ? '#4c4' : '#e44', up); }

function tryShift(step) {
  if (!shift(step)) { grind(); flash('CLUTCH!', '#e44', false); }
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

// ---- readouts ----
const pips = $('pips'); // central level indicator under the rpm bar
LEVELS.forEach(() => pips.append(document.createElement('i')));

function renderScore() {
  document.body.classList.toggle('game', game.on);
  // levels below are solid; the current one is the gauge, green when nearly full, red when nearly empty
  $('lvl').textContent = `LEVEL ${game.level + 1}`;
  pips.querySelectorAll('i').forEach((p, i) => {
    p.style.setProperty('--f', i < game.level ? '100%' : i > game.level ? '0%' : game.gauge * 100 + '%');
    p.style.setProperty('--c', i !== game.level ? '#ec4' : game.gauge >= 0.75 ? '#4c4' : game.gauge <= 0.25 ? '#e44' : '#ec4');
  });
  const s = $('score'), [width, pps] = LEVELS[game.level];
  if (!game.on) s.textContent = game.points ? `${Math.round(game.points)} pts\nlast game · best level ${game.best + 1}` : '';
  else if (!game.lo) s.textContent = 'press ENTER to start';
  else s.textContent = `${Math.round(game.points)} pts\n` +
    `level ${game.level + 1}/${LEVELS.length} · ${width} rpm band · ${pps} pts/s\n` +
    `target ${game.lo}–${game.hi} · new in ${Math.ceil(game.left)}s` + (game.note ? `\n${game.note}` : '');
}

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000); // a background tab can stall the loop: don't jump
  last = now;
  stepCar(dt, updateEngine(dt, now));
  if (stalled) { stalled = false; flash('STALL', '#e44', false); }
  const shown = shownRpm(now);
  if (players.length) updateAudio(shown);

  const e = engine;
  $('ignition').dataset.state = state;
  $('rpm').textContent = Math.round(shown);
  $('fill').style.width = Math.min(100, rpm / e.redline * 100) + '%';
  $('gear').textContent = gear || 'N';
  $('speed').textContent = Math.round(speed * 3.6);
  $('gas').classList.toggle('down', gas);
  $('clutch').classList.toggle('down', clutchDown);
  $('brake').classList.toggle('down', braking);

  document.body.classList.toggle('hit', updateGame(dt, rpm));
  const band = $('target');
  band.style.left = game.lo / e.redline * 100 + '%';
  band.style.width = (game.hi - game.lo) / e.redline * 100 + '%';
  renderScore();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
