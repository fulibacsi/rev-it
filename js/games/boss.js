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
// each one beaten, the next is half as tough again; on the war rig, tougher by how built-out the fortress is
// (fortress.js strength: the owner, 2 Nov, "tougher versions"), as tanks come often there: 1,200 at the first single
// cell, 2,500 on a 3x4 with two cannons. Kept on the tank as it comes (c.full: gang.js health)
const tankHealth = () => TANK.hp * (rigged() ? 1 + strength() / 20 : 1 + 0.5 * progress.tanks);
// armed, not in limp mode. On the war rig there is no tank's race: tanks come in the army's ambushes (fortress.js), an
// enemy like the rest (the owner, 2 Nov: "the tank is just an ambush")
const bossRace = () => arOn() && progress.wanted >= 1 && lvl('guns') > 0 && !wrecked() && !rigged();

// the tank takes over a car up the road as the boss race starts (startRun), waiting for you there (tankDrive keeps
// it until you come); or as soon as there is one, should the road have none
function sendTank() { // false with no car to take over, or two tanks on the road already (the army's ambushes)
  const k = traffic.filter(c => c.tank && !c.wreck).length;
  const c = k < 2 && traffic.find(takeable); // fortress.js
  if (!c) return false;
  Object.assign(c, { tank: true, dir: 1, lane: k, x: MY_LANES[k], z: odo + 250 + 60 * k, v: 0, want: 0, look: { rear: TANK_SPRITE },
                     w: 3, h: 2.3, hp: null, full: tankHealth(), wreck: false, swerve: null, d: NaN, hit: -Infinity, shell: TANK.reload,
                     second: k > 0 });
  if (!rigged()) run.tank = c; // act 4's boss race
  else flash('TANK!', '#f55', false);
  return true;
}
function updateBoss() {
  if (!run.boss || run.tank) return;
  sendTank();
  if (run.tank) { flash('TANK!', '#f55', false); horn(); }
}

// how it drives (road.js updateTraffic): it keeps its distance ahead of you, changes lanes to stay in front of you,
// and fires back
function tankDrive(c, dt) {
  const gap = c.z - odo, keep = TANK.gap + (c.second ? 40 : 0); // a second tank holds the road further on, in your other lane
  c.v = clamp(speed + (keep - gap) * 0.6, 0, 140); // closer: quicker; further: slower, or waiting
  c.z += c.v * dt;
  if (lane <= 1 && gap > 30) c.lane = c.second ? 1 - lane : lane; // into your lane, out of reach of a ram from the side
  c.x += clamp(MY_LANES[c.lane] - c.x, -2 * dt, 2 * dt);
  c.shell -= dt;
  if (c.shell > 0 || gap < 0 || gap > TANK.reach || run.phase !== 'run') return;
  c.shell = TANK.reload;
  tracers.push([c, 'you', performance.now()]);
  strike(TANK.hit, c.x, c.z); // fortress.js: on the war rig, the front row
  flash('HIT', '#f55', false);
  crashSound();
  shake = 0.5;
  if (wrecked()) finishRun('wrecked');
}

// destroyed (gang.js total): the ending. The run stops (the owner, 14 Oct: that's the end state). On the war rig it is
// one enemy down and the race goes on, its parts in a crate on the road (fortress.js)
function tankDown(c) {
  Object.assign(c, { wreck: true, hp: 0 });
  dropLoot(c); // fortress.js
  progress.tanks++;
  progress.scrap += TANK.scrap;
  run.scrap += TANK.scrap;
  if (rigged()) { flash('TANK DOWN', '#ffd23a', true); if (c === target) target = nextTarget(); return; }
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
