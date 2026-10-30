// The final boss. A race that starts at 100% police heat has a tank in it, sent in by the army (never one already
// under way: the heat filling mid-run sends it to the next; the owner, 27 Oct). Its card pops up over the road as you
// drive off, so it is plainly a boss fight, and the tank waits up the road from the line. It holds the road
// about 80 m ahead of you, so you can't get away from it, and fires a shell at you every 2.5 s while you are within
// 250 m behind it. You and your raiders have to outgun it: your guns, and theirs, sent at it (gang.js raiders).
// Rams barely scratch it. Destroy it and that is the ending: TANK DOWN, the run stops there with the tank burning,
// then the ending's screen (WARLORD OF THE COAST ROAD, main.js); the road is yours and the heat goes back to 0. You can
// still play on (the next tank is tougher). Lose (wrecked, head-on, or the bell with the
// tank still going) and it's a DNF, and the heat drops to half, so you have to push again. It comes only once you have
// guns (unarmed, rams alone can't beat it).

// its health, the m it keeps ahead of you, s between shells, the m they reach, % damage a hit, scrap for beating it
// (1,000 health: the first level of guns, firing all race, just wins; act4.py)
const TANK = { hp: 1000, gap: 80, reload: 2.5, reach: 250, hit: 8, scrap: 300 };
const tankHealth = () => TANK.hp * (1 + 0.5 * progress.tanks); // each one beaten, the next is half as tough again
const bossRace = () => arOn() && progress.wanted >= 1 && lvl('guns') > 0 && !wrecked(); // armed, not in limp mode

// the tank takes over a car up the road as the boss race starts (startRun), waiting for you there (tankDrive keeps
// it until you come); or as soon as there is one, should the road have none
function sendTank() {
  const c = traffic.find(c => !c.racer && !c.police && !c.fleet && c !== target);
  if (!c) return;
  Object.assign(c, { tank: true, dir: 1, lane: 0, x: MY_LANES[0], z: odo + 250, v: 0, want: 0, look: { rear: TANK_SPRITE },
                     w: 3, h: 2.3, hp: null, wreck: false, swerve: null, d: NaN, hit: -Infinity, shell: TANK.reload });
  run.tank = c;
}
function updateBoss() {
  if (!run.boss || run.tank) return;
  sendTank();
  if (run.tank) { flash('TANK!', '#f55', false); horn(); }
}

// how it drives (road.js updateTraffic): it keeps its distance ahead of you, changes lanes to stay in front of you,
// and fires back
function tankDrive(c, dt) {
  const gap = c.z - odo;
  c.v = clamp(speed + (TANK.gap - gap) * 0.6, 0, 140); // closer: quicker; further: slower, or waiting
  c.z += c.v * dt;
  if (lane <= 1 && gap > 30) c.lane = lane; // into your lane, out of reach of a ram from the side
  c.x += clamp(MY_LANES[c.lane] - c.x, -2 * dt, 2 * dt);
  c.shell -= dt;
  if (c.shell > 0 || gap < 0 || gap > TANK.reach || run.phase !== 'run') return;
  c.shell = TANK.reload;
  tracers.push([c, 'you', performance.now()]);
  addDamage(TANK.hit * (1 - 0.25 * lvl('armour'))); // damage.js; armor plating (gang.js)
  flash('HIT', '#f55', false);
  crashSound();
  shake = 0.5;
  if (wrecked()) finishRun('wrecked');
}

// destroyed (gang.js total): the ending. The run stops (the owner, 14 Oct: that's the end state)
function tankDown(c) {
  Object.assign(c, { wreck: true, hp: 0 });
  progress.tanks++;
  progress.scrap += TANK.scrap;
  run.scrap += TANK.scrap;
  progress.wanted = 0;
  run.beatTank = true;
  finishRun();
  run.count = 4; // twice a finish: TANK DOWN on the heads-up display, the tank burning (distance.js renderRun)
}

// at the bell, or a crash: a boss race lost is a DNF, and the heat drops to half
function bossLost(dnf) {
  if (!run.boss || run.beatTank) return dnf;
  progress.wanted = 0.5;
  return dnf ?? 'tank';
}
