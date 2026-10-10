// Game: keep the needle inside a target band. Rendering lives in main.js; this file is the rules only.
// Modes: 'rev' holds the rpm (works in neutral), 'speed' holds the road speed set by roadside signs.
const MODES = ['off', 'rev', 'speed'];
const TARGET_SECONDS = 5; // rev game: how long each target lasts
const ZONE = 400;         // speed game: metres between speed signs
// levels: [rpm band width, points per second on target]; the speed game uses SPEED_WIDTHS (km/h) instead.
// The level gauge fills while on target and drains while off: full = level up, empty = level down, then it
// restarts half full (pace tuned by simulating players)
const LEVELS = [[1600, 5], [1200, 8], [900, 10], [700, 15], [550, 20], [420, 30], [300, 40]];
const SPEED_WIDTHS = [30, 24, 18, 14, 10, 7, 5];
const START_LEVEL = 2, GAUGE_SECONDS = 6; // seconds of net on-target time to take the gauge from empty to full

// left: seconds until the next rev target; gauge: 0..1 progress within the current level; best: highest level
// reached; signs: upcoming speed signs [{ z: odometer metres, value: km/h }]
const game = { mode: 'off', on: false, level: START_LEVEL, best: START_LEVEL, lo: 0, hi: 0, left: 0, gauge: 0.5,
               points: 0, note: '', signs: [] };

function toggleGame() { // off -> rev -> speed -> off; a new mode starts a fresh game, turning off keeps the score
  game.mode = MODES[(MODES.indexOf(game.mode) + 1) % MODES.length];
  game.on = game.mode !== 'off';
  if (!game.on) return;
  Object.assign(game, { level: START_LEVEL, best: START_LEVEL, lo: 0, hi: 0, left: 0, gauge: 0.5, points: 0, note: '', signs: [] });
  if (game.mode === 'speed') for (let i = 0; i < 3; i++) addSign();
}

function nextTarget() { // rev game: a band away from the last one
  const lo = engine.idle + 1000, hi = engine.redline - 1200, prev = (game.lo + game.hi) / 2;
  let mid;
  do mid = lo + Math.random() * (hi - lo); while (Math.abs(mid - prev) < 1200);
  setBand(mid);
  game.left = TARGET_SECONDS;
}

function addSign() { // speed game: the next sign 20-50 km/h away from the previous one, 40-160 km/h
  const prev = game.signs.at(-1), z = prev ? prev.z + ZONE : odo + 150;
  let value = 50 + 10 * Math.floor(Math.random() * 6);
  if (prev) do value = 10 * Math.round((prev.value + (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 30)) / 10);
  while (value < 40 || value > 160);
  game.signs.push({ z, value });
}

function setBand(mid) { // band centred on mid, as wide as the current level allows
  if (game.mode === 'speed') {
    const width = SPEED_WIDTHS[game.level];
    [game.lo, game.hi] = [mid - width / 2, mid + width / 2];
  } else {
    const width = LEVELS[game.level][0];
    game.lo = Math.round((mid - width / 2) / 50) * 50;
    game.hi = game.lo + width;
  }
}

function changeLevel(step) { // gauge ran full or empty: move a level and resize the band in place
  game.level += step;
  game.best = Math.max(game.best, game.level);
  game.gauge = 0.5;
  game.note = step > 0 ? '▲ level up' : '▼ level down';
  setBand((game.lo + game.hi) / 2);
  onLevelChange(step > 0); // UI hook, main.js
}

// advance the game by dt; returns whether the needle is on target
function updateGame(dt) {
  if (!game.on || state !== 'running') return false; // the game clock only runs while the engine does
  if (game.mode === 'rev') {
    game.left -= dt;
    if (game.left <= 0) nextTarget();
  } else while (game.signs[0].z <= odo) { setBand(game.signs.shift().value); addSign(); } // passed a sign
  if (!game.lo) return false; // speed game: not at the first sign yet
  const value = game.mode === 'rev' ? rpm : speed * 3.6, onTarget = value >= game.lo && value <= game.hi;
  game.gauge = Math.min(1, Math.max(0, game.gauge + (onTarget ? dt : -dt) / GAUGE_SECONDS));
  if (onTarget) game.points += LEVELS[game.level][1] * dt;
  if (game.gauge >= 1 && game.level < LEVELS.length - 1) changeLevel(1);
  else if (game.gauge <= 0 && game.level > 0) changeLevel(-1);
  return onTarget;
}
