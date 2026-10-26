// The app shell: menu, instrument cluster, head-up display and the main loop. The games plug in here (rev.js,
// signs.js, distance.js, and Free drive below); controls.js handles the input.
// A game: { id, name, blurb, hud: 'levels' | 'run' | undefined, gears(): gears in the gate, parked?, and optionally
//   start(), stop(), update(dt), render(), marks() for the roadside, readout() for the big HUD number,
//   engine() / tune() when it chooses and tunes the car itself, key(k) to take a key press, crash(impact) to hear of a collision, speedo() for the
//   speedometer's top (km/h), field() for
//   cars it places on the road itself (racers), useFlash() to allow a headlight flash (and count it), stereo() whether
//   the car has a stereo, tape() the tape it plays (null: off) and nextTape(round) to change it (round: a tape ended,
//   so the next, round to the first; stereo.js), madness() the
//   share of ordinary drivers gone mad, 0 to 1: no look, no signal, they jump in front of you (road.js), rust() the
//   share of ordinary cars gone to rust, 0 to 1 (a look only: road.js); the main game
//   (Distance) also:
//   pause() as the menu opens over it, endRun() for the pause menu's END RUN, stats() for STATS }
const fmt = n => Math.round(n).toLocaleString('en-US');

// settings kept between visits: the engine for the games that let you choose, best scores, the layout, the volumes
const SETTINGS_KEY = 'car-rev-settings';
const settings = Object.assign({ engine: 0, best: {}, layout: 'auto', volume: { car: 1, music: 1 } }, (() => {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) ?? {}; } catch { return {}; }
})());
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* not saved */ } }

const FREE = { id: 'free', name: 'Free drive', blurb: 'No targets, no clock: just the coast road.', gears: () => 6 };
const GAMES = [REV, SIGNS, DISTANCE, FREE];
const ARCADE = [REV, SIGNS, FREE]; // the side gigs; the main game, Distance, is the menu's CONTINUE / NEW GAME
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

function resetScene() { resetCar(); resetLever(); resetTraffic(game.field?.()); if (game.parked) carX = SHOULDER; }

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

// ---- menu: one screen at a time, the game paused while it shows. main: CONTINUE (or NEW GAME, without a save), STATS,
// SETTINGS, ARCADE (the side gigs), a small credits link; pause, over a game: RESUME, HOW TO DRIVE, END RUN (a Distance
// run), EXIT TO MAIN MENU (the game stays paused behind it, and CONTINUE goes back to it); win: the tank beaten (the
// owner's design, 14 Oct). BACK goes to the screen it came from
let screen = 'main', screenFrom = [];
const started = () => progress.runs > 0; // a game of Distance under way (in debug mode, its own save)
// the build a playtester has: when the page was published (its Last-Modified), said in STATS, SHARE and feedback
const BUILD = 'build ' + new Date(document.lastModified).toLocaleString('en-GB', { day: 'numeric', month: 'short',
  year: 'numeric', hour: '2-digit', minute: '2-digit' });
function showScreen(name, back = false) {
  if (!back && name !== screen) screenFrom.push(screen);
  screen = name;
  for (const s of $('menu').querySelectorAll('section')) s.hidden = s.dataset.screen !== name;
  document.body.classList.toggle('touring', name === 'tour'); // a tutorial: the menu goes clear (tutorial.js)
  for (const s of $('menu').querySelectorAll('.shared')) s.textContent = '';
  renderMenu();
  if (name === 'tour') renderTour();
  if (name === 'act') renderCard(); // distance.js
  if (name === 'feedback') renderFeedback(); // reporting.js
}
function renderMenu() {
  $('continue').textContent = started() ? 'CONTINUE' : 'NEW GAME';
  $('continue').classList.toggle('done', progress.tanks > 0); // the tank beaten: a green tick
  $('to-stats').hidden = !started();
  $('end-run').hidden = !(game === DISTANCE && run.phase === 'run');
  $('act-button').hidden = !(game === DISTANCE && playing); // the act's card again: what to do (distance.js)
  if (game === DISTANCE) $('act-button').textContent = actTitle() ?? 'WHAT TO DO';
  const best = g => settings.best[g.id] ? `best ${fmt(settings.best[g.id].points)} pts · level ${settings.best[g.id].level + 1}` : '';
  $('game-list').innerHTML = ARCADE.map(g => `<button data-play="${g.id}"${g === game && playing ? ' class="on"' : ''}>` +
    `<b>${g.name}</b><small>${g.blurb}</small><i>${best(g)}</i></button>`).join('');
  $('engine-pick').innerHTML = ENGINES.map((e, i) => `<button data-engine="${i}"${i === settings.engine ? ' class="on"' : ''}>${e.name}</button>`).join('');
  $('layout').textContent = settings.layout + (settings.layout === 'auto' ? ` (${touchDevice ? 'touch' : 'mouse and keys'})` : '');
  $('vol-car').value = Math.round(settings.volume.car * 100);
  $('vol-music').value = Math.round(settings.volume.music * 100);
  $('reset').hidden = !started();
  $('stats-switch').textContent = settings.stats ? 'ON' : 'OFF';
  // a build that reports (itch.io's, reporting.js): FEEDBACK in SHARE's place, and the gameplay data's setting
  for (const b of $('menu').querySelectorAll('[data-share]')) b.hidden = reporting();
  for (const b of $('menu').querySelectorAll('[data-show="feedback"], .reporting')) b.hidden = !reporting();
  // a control, and its words, only once the car has it, as in the cockpit (the owner, 22 Oct: nothing locked is named)
  for (const e of $('menu').querySelectorAll('[data-has]')) e.hidden = !lvl(e.dataset.has);
  renderTutorials();
  if (DISTANCE.stereo() && DISTANCE.tape() !== null) loadTape(DISTANCE.tape()); // ready when you drive (stereo.js)
  const rows = DISTANCE.stats().map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  $('stats-list').innerHTML = $('win-stats').innerHTML = rows;
  for (const b of $('menu').querySelectorAll('.build')) b.textContent = BUILD;
}
function openMenu(name) {
  menuOpen = true;
  document.body.classList.add('menu');
  ctx?.suspend(); // paused: the engine falls silent too
  game.pause?.();
  screenFrom = [];
  showScreen(name ?? (playing ? 'pause' : 'main'), true);
}
function closeMenu() {
  menuOpen = false;
  document.body.classList.remove('menu');
  ctx?.resume();
}
function toggleMenu() { if (!menuOpen) openMenu(); else if (playing) closeMenu(); }
function resetGame() { // RESET PROGRESS, or a new game after the win: Distance from scratch, back at the main menu
  resetProgress();
  if (game === DISTANCE) { leaveGame(); game = FREE; playing = false; resetScene(); refreshCar(); }
  screenFrom = [];
  showScreen('main', true);
}
function applyVolume() { // the settings' sliders: the car's sounds (engine.js) and the stereo's music (stereo.js)
  carVolume = settings.volume.car;
  if (carBus) carBus.gain.value = carVolume;
  stereo.volume = settings.volume.music;
  if (stereo.out) stereo.out.gain.value = MUSIC * stereo.volume;
}
async function shareStats(out) { // STATS' SHARE: the phone's share sheet, else the clipboard, else text to copy by hand
  const text = ['Rev It: my game', ...DISTANCE.stats().map(([k, v]) => `${k}: ${v}`), BUILD, location.href.split(/[?#]/)[0]].join('\n');
  try {
    if (navigator.share && touchDevice) { await navigator.share({ text }); out.textContent = 'Shared, thank you!'; return; }
    await navigator.clipboard.writeText(text);
    out.textContent = 'Copied: paste it into a message.';
  } catch (e) {
    if (e?.name === 'AbortError') return; // the share sheet closed
    out.innerHTML = 'Copy it from here:<textarea readonly></textarea>';
    out.querySelector('textarea').value = text;
  }
}
$('menu').onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  loading ??= start(); // any click is a user gesture: audio can start
  if (b.dataset.play === 'distance' && game === DISTANCE && playing) { closeMenu(); goFullscreen(); } // back to it
  else if (b.dataset.play) play(GAMES.find(g => g.id === b.dataset.play));
  if (b.dataset.show) showScreen(b.dataset.show);
  if ('back' in b.dataset) showScreen(screenFrom.pop() ?? (playing ? 'pause' : 'main'), true);
  if ('share' in b.dataset) shareStats(b.closest('section').querySelector('.shared'));
  if (b.dataset.engine) pickEngine(+b.dataset.engine);
  if (b.id === 'resume' || b.id === 'win-garage') { closeMenu(); goFullscreen(); }
  if (b.dataset.tour) openTour(b.dataset.tour);
  if (b.id === 'tour-prev' || b.id === 'tour-next') turnTour(b.id === 'tour-next' ? 1 : -1);
  if (b.id === 'tour-back') exitTour();
  if (b.id === 'act-button') openCard(currentCard().id);
  if (b.id === 'act-drive') openTour('driving');
  if (b.id === 'act-go') closeCard();
  if (b.id === 'hello-go') { setStats($('stats-ok').checked); showScreen('main', true); } // the first visit's question
  if (b.id === 'stats-switch') { setStats(!settings.stats); renderMenu(); }
  if (b.id === 'feedback-send') submitFeedback();
  if (b.id === 'to-main' || b.id === 'win-main') showScreen('main');
  if (b.dataset.act && confirm(`Debug: start the debug game at act ${b.textContent}? It is set to that act's start; ` +
    'your own game is kept as it is.')) { debugAct(+b.dataset.act); play(DISTANCE); } // distance.js
  if (b.id === 'end-run' && confirm('End this run now? It counts as if the time had run out.')) { closeMenu(); game.endRun?.(); }
  if (b.id === 'reset' && confirm('Reset your progress? Every metre, point and upgrade is gone, and the game starts over.')) resetGame();
  if (b.id === 'layout') {
    settings.layout = LAYOUTS[(LAYOUTS.indexOf(settings.layout) + 1) % LAYOUTS.length];
    saveSettings(); applyLayout(); renderMenu();
  }
};
$('menu').oninput = e => { // the volume sliders, as they move; the feedback, as it is typed
  if (e.target.id === 'feedback-text') return renderFeedback();
  const v = { 'vol-car': 'car', 'vol-music': 'music' }[e.target.id];
  if (!v) return;
  settings.volume[v] = e.target.value / 100;
  saveSettings();
  applyVolume();
};
// typing feedback (reporting.js): on a phone the keyboard takes the screen's lower half, so meanwhile the form packs
// into the top (style.css .typing), SEND in sight. And iOS, which scrolls a box into view, can leave the page out of
// place once the keyboard has gone (in itch.io's frame on an iPhone: SEND off the screen until the phone was turned,
// the owner, 25 Oct), so then everything is scrolled back. Both after the keyboard is down: a tap on SEND lands first
$('menu').addEventListener('focusin', e => { if (e.target.id === 'feedback-text') document.body.classList.add('typing'); });
$('menu').addEventListener('focusout', e => {
  if (e.target.id === 'feedback-text') setTimeout(() => {
    if (document.activeElement === e.target) return; // back in the box
    document.body.classList.remove('typing');
    scrollTo(0, 0); $('menu').scrollTop = 0;
  }, 400);
});
$('menu-button').onclick = () => openMenu();
addEventListener('click', e => e.target.closest('button')?.blur()); // keys stay with the car, not a focused button

// leaving the page (another app, another tab) pauses the game; phones suspend its sound meanwhile, and only a tap
// can bring it back: the RESUME tap does, and so does any tap while playing, should the sound still be stopped
document.addEventListener('visibilitychange', () => { if (document.hidden && playing && !menuOpen) openMenu(); });
addEventListener('pointerdown', () => { if (ctx && ctx.state !== 'running' && !menuOpen) ctx.resume(); }, true);
// iPhone Safari can't go full screen, but the game can from the home screen: say so there (not when already on it, nor
// inside a page's frame, itch.io's: Add to Home Screen would keep that page, not the game)
const iosBrowser = (/iP(hone|od|ad)/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) &&
  !navigator.standalone && self === top;
document.body.classList.toggle('ios', iosBrowser);

// ---- instrument cluster: analogue dials drawn as SVG ----
const DIAL = { cy: 105, r: 86, sweep: 135 }; // needles sweep ±135° from straight up
let SPEEDO_MAX = 360;
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
  tachMax = Math.ceil((Math.max(engine.stock.redline, engine.redline) + 1000) / 1000) * 1000; // room for an ECU tune
  buildDial($('tach'), 140, tachMax, 250, 1000, 1000, '×1000 rpm', v => v / 1000, engine.redline);
  SPEEDO_MAX = game.speedo?.() ?? 360;
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
function resize() { const s = Math.min(devicePixelRatio, 1.5); canvas.width = innerWidth * s; canvas.height = innerHeight * s; canvas.px = s; }
addEventListener('resize', resize);
resize();

let last = performance.now(), steer = 0, shake = 0;
// the gas pedal's size, kept as the browser lays it out: read each frame after the pedals moved, it forced a layout
const gasBox = { w: 0, h: 0 };
new ResizeObserver(() => Object.assign(gasBox, { w: $('gas').clientWidth, h: $('gas').clientHeight })).observe($('gas'));
const text = (id, v) => { const e = $(id); if (e.textContent !== String(v)) e.textContent = v; }; // only when it changes
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
  if (crashed) { crashed = false; crashSound(); flash('CRASH', '#f55', false); shake = 0.7; game.crash?.(impact); }
  shake = Math.max(0, shake - dt); // the view jolts after a crash
  canvas.style.transform = shake ? `translate(${(Math.random() - 0.5) * 30 * shake}px, ${(Math.random() - 0.5) * 30 * shake}px)` : '';
  const shown = shownRpm(now), kmh = speed * 3.6;
  if (players.length) updateAudio(shown);

  drawRoad(g2d, canvas.width, canvas.height, dt);
  if (wheel.held) steer = wheel.angle; // only your hands turn it
  else steer -= steer * Math.min(1, dt * 8); // let go: straight back to the middle
  $('wheel-rim').setAttribute('transform', `rotate(${steer} 500 560)`);

  needle('tach', 140, shown, tachMax);
  needle('speedo', 420, kmh, SPEEDO_MAX);
  $('shift-light').setAttribute('fill', cut && now % 200 < 100 ? '#f22' : rpm > engine.redline - 600 ? '#fa0' : '#330');
  const lamp = (id, on, color) => $(id).style.fill = on ? color : '#333';
  const ignitionOn = keyAngle > 0; // warning lamps glow with the ignition on and the engine not running
  lamp('lamp-batt', ignitionOn && state !== 'running', '#f44'); lamp('lamp-oil', ignitionOn && state !== 'running', '#f44');
  lamp('lamp-brake', brakePedal > 0.05, '#f44'); lamp('lamp-clutch', clutchPedal > CAR.bite[0], '#fb3');
  lamp('lamp-slip', spinning, '#fb3');
  text('cluster-gear', gear || 'N'); text('hud-gear', gear || 'N');
  const [value, unit] = game.readout?.() ?? [Math.round(kmh), 'km/h']; // the big number: speed, unless the game says
  text('hud-speed', value);
  text('hud-unit', unit);
  $('fill').style.width = Math.min(100, shown / tachMax * 100) + '%';

  // controls follow their state: key angle, pedal depth, lever position
  $('key').style.transform = `rotate(${keyAngle}deg)`;
  $('ignition').dataset.state = keyAngle >= KEY.startZone ? 'start' : keyAngle > 0 ? 'on' : 'off';
  for (const [id, { get }] of Object.entries(PEDALS)) {
    $(id).style.transform = `perspective(300px) rotateX(${get() * 35}deg)`;
    $(id).parentNode.style.setProperty('--depth', get());
  }
  // the nitro pedal is bolted to the gas pedal's top corner, which comes down and in as the gas pedal tilts away (35°,
  // seen through a 300px perspective: the top edge shrinks by `far`)
  const a = gasPedal * 35 * Math.PI / 180, far = 300 / (300 + gasBox.h * Math.sin(a));
  const down = gasBox.h * (1 - Math.cos(a) * far), inward = gasBox.w * (1 - far) / 2;
  $('nos').style.transform = `translate(${-inward}px, ${down}px) perspective(300px) rotateX(${nitroHeld || nitroByAid ? 25 : 0}deg)`;
  $('knob').setAttribute('transform', `translate(${lever.x} ${lever.y})`);
  text('knob-gear', gear || 'N');

  game.render?.();
  updateStereo();
  renderStereo();
}
// debug mode: tap the menu's title 5 times. Distance then plays a save of its own with unlimited metres and points
let titleTaps = [];
function applyDebug() { useDebugSave(!!settings.debug); document.body.classList.toggle('debug', !!settings.debug); }
document.querySelector('#menu h1').onclick = () => {
  const now = performance.now();
  titleTaps = [...titleTaps.filter(t => now - t < 3000), now];
  if (titleTaps.length < 5) return;
  titleTaps = [];
  if (!confirm(settings.debug ? 'Leave debug mode? Your own Distance game comes back as you left it.'
    : 'Debug mode: Distance plays a separate save with unlimited metres and points. Your own game is kept as it is.')) return;
  settings.debug = !settings.debug;
  saveSettings();
  applyDebug();
  if (game === DISTANCE && playing) play(DISTANCE); else renderMenu();
};

if (settings.debug) applyDebug();
applyLayout();
applyVolume();
refreshCar();
openMenu(askStats() ? 'hello' : null); // the first visit: what we'd like to know (reporting.js)
drawRoad(g2d, canvas.width, canvas.height, 0); // the view behind the menu
requestAnimationFrame(tick);
