// Game: hold the road speed set by the roadside signs. Rendering lives in main.js; this file is the rules only.
const ZONE = 400; // metres between speed signs
// levels: [band width km/h, points per second on target]. The level gauge fills while on target and drains
// while off: full = level up, empty = level down, then it restarts half full (pace tuned by simulating players)
const LEVELS = [[30, 5], [24, 8], [18, 10], [14, 15], [10, 20], [7, 30], [5, 40]];
const START_LEVEL = 2, GAUGE_SECONDS = 6; // seconds of net on-target time to take the gauge from empty to full

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
  const prev = game.signs.at(-1), z = prev ? prev.z + ZONE : odo + 150;
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
  game.gauge = Math.min(1, Math.max(0, game.gauge + (onTarget ? dt : -dt) / GAUGE_SECONDS));
  if (onTarget) game.points += LEVELS[game.level][1] * dt;
  if (game.gauge >= 1 && game.level < LEVELS.length - 1) changeLevel(1);
  else if (game.gauge <= 0 && game.level > 0) changeLevel(-1);
  return onTarget;
}
