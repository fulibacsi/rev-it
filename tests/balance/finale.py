"""The warlord's fight, simulated (docs/design-notes.md, Act 5, layer 15): from debug mode's FINALE start (act 5 bought
out, the board packed: a two-block cannon, armor either side, two pairs of guns, spikes, two engines; 30 shells, a war
crew of 54), optionally with a two-block rocket pod, the fight stepped in the page a 60th of a second at a time, the
game's own loop paused. A bot plays it as a player would: each of his moves seen once it shows, answered after its
reaction time with the move that beats it (right as often as its accuracy says, else another of its moves), when that
move is ready; between his moves, a move of its own as soon as the cooldown allows (the one he is least able to
answer: the beater of which he has cooling longest). A masher, for contrast, presses whatever is ready, his moves
unseen. Each fight to a win or a wreck (or 5 minutes): who won, how long it took, your health and his left, the moves
made and how they met (countered, lost, neutral), his answers.
Usage: finale.py [fights] [skill...] [overrides]: skills good (0.4 s, 90%), average (0.7 s, 70%), poor (1 s, 50%),
masher; the overrides JavaScript run first to try other numbers ("FINALE.hp = 6000")."""
import json, sys
from playwright.sync_api import sync_playwright
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))  # tests/common.py
from common import URL, launch
FIGHTS = int(sys.argv[1]) if len(sys.argv) > 1 else 20
SKILLS = {"good": [0.4, 0.9], "average": [0.7, 0.7], "poor": [1.0, 0.5], "masher": [0, -1]}
ARGS = sys.argv[2:]
OVERRIDES = ARGS[-1] if ARGS and ARGS[-1] not in SKILLS and ARGS[-1] != "pods" else ""
PODS = "pods" in ARGS
WHO = [a for a in ARGS if a in SKILLS] or list(SKILLS)
FIGHT = """(([react, right, seed, pods]) => {
  let dice = seed; const roll = () => ((dice = (dice * 48271) % 2147483647) - 1) / 2147483646;
  progress.damage = 0; progress.broken = []; progress.shells = 30; progress.crewDown = 0; jammed.clear();
  const f = progress.fortress; f.parts = f.parts.filter(p => p.kind !== 'rockets');
  if (pods) f.parts.push({ kind: 'rockets', cells: [[0, 0], [1, 0]], x: 2, y: 3, from: 'rocket' });
  for (const p of f.parts) delete p.hp; // whole
  applyUpgrades();
  rng = seed; startRun(true); run.phase = 'run'; menuOpen = true; // the game's loop paused: stepped here
  const dt = 1 / 60, seen = new Map(), log = { moves: {}, countered: 0, lost: 0, neutral: 0, his: {}, hisCountered: 0, answers: 0 };
  const wasMade = made; window.made = (side, m, u) => { // counted as the moves meet
    const theirs = underway.filter(o => o.side !== side && !o.off && (o.lasts?.() ?? true));
    const hit = theirs.some(o => BEATS[m] === o.m), lost = !hit && theirs.some(o => BEATS[o.m] === m);
    if (side === 'you') { log.moves[m] = (log.moves[m] ?? 0) + 1; if (hit) log.countered++; else if (lost) log.lost++; else if (theirs.length) log.neutral++; }
    else { log.his[m] = (log.his[m] ?? 0) + 1; if (hit) log.hisCountered++; }
    return wasMade(side, m, u);
  };
  const wasAnswer = () => answer; let answered = null;
  const have = MOVES.filter(m => HAVE[m]());
  let t = 0;
  for (; t < 300 && run.phase === 'run'; t += dt) {
    if (answer && answer !== answered) { answered = answer; log.answers++; }
    if (react > 0) { // a player: his moves seen and answered
      for (const u of underway) if (u.side === 'him' && !u.off && !seen.has(u)) {
        const good = roll() < right, others = have.filter(m => m !== beater(u.m));
        seen.set(u, { at: t + react, m: good || !others.length ? beater(u.m) : others[Math.floor(roll() * others.length)] });
      }
      for (const [u, s] of seen) if (!s.done && t >= s.at) { if (u.off) s.done = true; else if (HAVE[s.m]() && ready('you', s.m)) { s.done = true; move(s.m); } }
      if (!underway.some(u => u.side === 'him' && !u.off) && ready('you', 'cannon')) { // his clock: least able to answer
        const can = have.filter(m => m !== 'cannon' || progress.shells > 0), open = m => cooling.him[beater(m)] ?? 0;
        const best = Math.max(...can.map(open)), ties = can.filter(m => open(m) === best), pick = ties[Math.floor(roll() * ties.length)];
        if (pick) move(pick);
      }
    } else { const m = have.filter(m => ready('you', m))[Math.floor(roll() * have.length)]; if (m) move(m); } // a masher
    fightTick(dt);
    updateTraffic(dt, t);
  }
  window.made = wasMade; menuOpen = false;
  const out = { won: !!run.won, secs: Math.round(t), you: Math.round(100 - progress.damage), him: Math.round(100 * hpLeft(warlord)),
                shells: progress.shells, wrecks: progress.crewDown, ...log };
  run.phase = 'garage'; run.fight = false;
  return out;
})"""
with sync_playwright() as p:
    b = launch(p)
    pg = b.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e))); js = pg.evaluate
    pg.goto(URL); js("localStorage.clear()")
    js("settings.debug = true; applyDebug(); settings.debugMoney = false; debugAct(5); progress.toured = TUTORIALS.map(t => t.id); play(DISTANCE)")
    pg.wait_for_timeout(300)
    if js("menuOpen"): js("closeMenu()")
    pg.click("#fight"); pg.wait_for_function("run.phase === 'run'", timeout=20000); pg.wait_for_timeout(800)  # drawn: warlord.seen
    if OVERRIDES: js(OVERRIDES + "; 0")
    print(f"FINALE {js('JSON.stringify(FINALE)')} | pods {PODS} | {FIGHTS} fights a skill")
    for who in WHO:
        react, right = SKILLS[who]
        rs = [js(FIGHT, [react, right, 1000 + i, PODS]) for i in range(FIGHTS)]
        won = [r for r in rs if r["won"]]
        avg = lambda k, rr=rs: sum(r[k] for r in rr) / max(1, len(rr))
        moves = {m: round(sum(r["moves"].get(m, 0) for r in rs) / len(rs), 1) for m in ["raid", "cannon", "guns", "rockets"]}
        print(f"{who:8} won {len(won):2}/{len(rs)}  {avg('secs'):5.0f} s  you {avg('you'):3.0f}% left (won: {avg('you', won):3.0f}%)  him "
              f"{avg('him'):3.0f}% left  moves {moves}  countered {avg('countered'):4.1f} lost {avg('lost'):4.1f} neutral {avg('neutral'):4.1f}  "
              f"his countered {avg('hisCountered'):4.1f} answers {avg('answers'):4.1f}  shells left {avg('shells'):4.1f} wrecks {avg('wrecks'):4.1f}")
    b.close(); print("ERRORS:", errs or "none")
