// Game: keep the needle inside a target band. Rendering lives in main.js; this file is the rules only.
const TARGET_SECONDS = 5; // how long each target lasts
// levels: [band width rpm, points per second on target]. The level gauge fills while on target and drains
// while off: full = level up, empty = level down, then it restarts half full (pace tuned by simulating players)
const LEVELS = [[1600, 5], [1200, 8], [900, 10], [700, 15], [550, 20], [420, 30], [300, 40]];
const START_LEVEL = 2, GAUGE_SECONDS = 6; // seconds of net on-target time to take the gauge from empty to full

// left: seconds until the next target; gauge: 0..1 progress within the current level; best: highest level reached
const game = { on: false, level: START_LEVEL, best: START_LEVEL, lo: 0, hi: 0, left: 0, gauge: 0.5, points: 0, note: '' };

function toggleGame() {
  game.on = !game.on;
  if (game.on) Object.assign(game, { level: START_LEVEL, best: START_LEVEL, lo: 0, hi: 0, left: 0, gauge: 0.5, points: 0, note: '' });
}

function nextTarget() { // a band away from the last one
  const lo = engine.idle + 1000, hi = engine.redline - 1200, prev = (game.lo + game.hi) / 2;
  let mid;
  do mid = lo + Math.random() * (hi - lo); while (Math.abs(mid - prev) < 1200);
  setBand(mid);
  game.left = TARGET_SECONDS;
}

function setBand(mid) { // band centred on mid, as wide as the current level allows
  const width = LEVELS[game.level][0];
  game.lo = Math.round((mid - width / 2) / 50) * 50;
  game.hi = game.lo + width;
}

function changeLevel(step) { // gauge ran full or empty: move a level and resize the band in place
  game.level += step;
  game.best = Math.max(game.best, game.level);
  game.gauge = 0.5;
  game.note = step > 0 ? '▲ level up' : '▼ level down';
  setBand((game.lo + game.hi) / 2);
  onLevelChange(step > 0); // UI hook, main.js
}

// advance the game by dt; value: the measured rpm. Returns whether it is on target.
function updateGame(dt, value) {
  const onTarget = game.on && state === 'running' && value >= game.lo && value <= game.hi;
  if (game.on && state === 'running') { // the game clock only runs while the engine does
    game.left -= dt;
    if (game.left <= 0) nextTarget();
    game.gauge = Math.min(1, Math.max(0, game.gauge + (onTarget ? dt : -dt) / GAUGE_SECONDS));
    if (onTarget) game.points += LEVELS[game.level][1] * dt;
    if (game.gauge >= 1 && game.level < LEVELS.length - 1) changeLevel(1);
    else if (game.gauge <= 0 && game.level > 0) changeLevel(-1);
  }
  return onTarget;
}
