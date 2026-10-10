// Game: hold the road speed set by the roadside signs. Rendering lives in main.js; this file is the rules only.
// levels: [band width km/h, points per second on target, metres between signs]. Higher levels narrow the band and
// bring the signs closer, so more of the time goes into reaching the next speed: shifting, braking, reading hills.
// The level gauge fills while on target and drains twice as fast while off, so holding a level takes about 2/3 of
// the time on target: full = level up, empty = level down, then it restarts half full.
const LEVELS = [[30, 5, 500], [24, 8, 420], [18, 10, 350], [14, 15, 290], [10, 20, 240], [7, 30, 200], [5, 40, 170]];
const START_LEVEL = 2, GAUGE_FILL = 6, GAUGE_DRAIN = 3; // seconds to fill the gauge on target / empty it off target

// gauge: 0..1 progress within the current level; best: highest level reached;
// signs: upcoming speed signs [{ z: odometer metres, value: km/h }]
const game = { on: false, level: START_LEVEL, best: START_LEVEL, lo: 0, hi: 0, gauge: 0.5, points: 0, note: '', signs: [] };

function toggleGame() { // turning it on starts a fresh game; turning it off keeps the score on screen
  game.on = !game.on;
  if (!game.on) return;
  Object.assign(game, { level: START_LEVEL, best: START_LEVEL, lo: 0, hi: 0, gauge: 0.5, points: 0, note: '', signs: [] });
  for (let i = 0; i < 3; i++) addSign();
}

function addSign() { // the next sign 20-50 km/h away from the previous one, 40-160 km/h
  const prev = game.signs.at(-1), z = prev ? prev.z + LEVELS[game.level][2] : odo + 150;
  let value = 50 + 10 * Math.floor(Math.random() * 6);
  if (prev) do value = 10 * Math.round((prev.value + (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 30)) / 10);
  while (value < 40 || value > 160);
  game.signs.push({ z, value });
}

function setBand(mid) { // band centred on mid, as wide as the current level allows
  const width = LEVELS[game.level][0];
  [game.lo, game.hi] = [mid - width / 2, mid + width / 2];
}

function changeLevel(step) { // gauge ran full or empty: move a level and resize the band in place
  game.level += step;
  game.best = Math.max(game.best, game.level);
  game.gauge = 0.5;
  game.note = step > 0 ? '▲ level up' : '▼ level down';
  setBand((game.lo + game.hi) / 2);
  onLevelChange(step > 0); // UI hook, main.js
}

// advance the game by dt; returns whether the speed is on target
function updateGame(dt) {
  if (!game.on || state !== 'running') return false; // the game clock only runs while the engine does
  while (game.signs[0].z <= odo) { setBand(game.signs.shift().value); addSign(); } // passed a sign
  if (!game.lo) return false; // not at the first sign yet
  const kmh = speed * 3.6, onTarget = kmh >= game.lo && kmh <= game.hi;
  game.gauge = Math.min(1, Math.max(0, game.gauge + (onTarget ? dt / GAUGE_FILL : -dt / GAUGE_DRAIN)));
  if (onTarget) game.points += LEVELS[game.level][1] * dt;
  if (game.gauge >= 1 && game.level < LEVELS.length - 1) changeLevel(1);
  else if (game.gauge <= 0 && game.level > 0) changeLevel(-1);
  return onTarget;
}
