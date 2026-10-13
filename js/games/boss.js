// The final boss. A race that starts at 100% police heat has a tank in it, sent in by the army: it holds the road
// about 80 m ahead of you, so you can't get away from it, and fires a shell at you every 2.5 s while you are within
// 250 m behind it. You and the gang have to outgun it: your guns, and the fleet's, which race up to join the fight.
// Rams barely scratch it. Destroy it and that is the ending: the road is yours, the heat goes back to 0, and you play
// on (the next tank is tougher). Lose (wrecked, head-on, or the bell with the tank still going) and it's a DNF, and
// the heat drops to half, so you have to push again.

// its health, the m it keeps ahead of you, s between shells, the m they reach, % damage a hit, parts for beating it
const TANK = { hp: 2000, gap: 80, reload: 2.5, reach: 250, hit: 8, parts: 300 };
const tankHealth = () => TANK.hp * (1 + 0.5 * progress.tanks); // each one beaten, the next is half as tough again
const bossRace = () => arOn() && progress.wanted >= 1 && !wrecked(); // not in limp mode

// the tank takes over a car out of sight up the road once the race is on
function updateBoss() {
  if (!run.boss || run.tank) return;
  const c = traffic.find(c => !c.racer && !c.police && c !== target);
  if (!c) return;
  Object.assign(c, { tank: true, dir: 1, lane: 0, x: MY_LANES[0], z: odo + 250, v: 20, want: 20, look: { rear: TANK_SPRITE },
                     w: 3, h: 2.3, hp: null, wreck: false, swerve: null, d: NaN, hit: -Infinity, shell: TANK.reload });
  run.tank = c;
  flash('TANK!', '#f55', false);
  horn();
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
  addDamage(TANK.hit * (1 - 0.25 * lvl('armour'))); // damage.js; armour plating (gang.js)
  flash('HIT', '#f55', false);
  crashSound();
  shake = 0.5;
  if (wrecked()) finishRun('wrecked');
}

// destroyed (gang.js total): the ending
function tankDown(c) {
  Object.assign(c, { wreck: true, hp: 0 });
  progress.tanks++;
  progress.parts += TANK.parts;
  run.parts += TANK.parts;
  progress.wanted = 0;
  run.beatTank = true;
  flash('TANK DESTROYED', '#ffd36a', true);
}

// at the bell, or a crash: a boss race lost is a DNF, and the heat drops to half
function bossLost(dnf) {
  if (!run.boss || run.beatTank) return dnf;
  progress.wanted = 0.5;
  return dnf ?? 'tank';
}
