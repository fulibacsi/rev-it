"""Act 5's ambushes (docs/design-notes.md, Act 5, layer 9): on the war rig the heat retires (totals raise none, the
scanner goes, no tank's race), and the road fights back by how built-out the fortress is. Each race's ambushes are
drawn as it starts, on dice of their own: along the race in clusters and gaps, one faction each, their members bought
from a budget the fortress's strength sets (a bigger, better-armed board more, a battered one less). Near one, its
members come one by one, POLICE AMBUSH! and the like. The army's: tanks, two at once in two lanes, as tough as the
fortress is strong; beaten, TANK DOWN, the race goes on and a crate is on the road. Phone and desktop."""
import json
from playwright.sync_api import sync_playwright
from common import URL, OUT, launch
LEVELS = dict(workshopTab=1, autopilotTab=1, blackTab=1, fleetTab=1, warrigTab=1, fortressTab=1, rebuild=1, lengthen=2, widen=1,
              power=10, rev=4, gears=3, tyres=4, time=6, clutch=1, gas=1, shift=1, steer=1, cruise=1, engine=2, flash=5, grid=100,
              rolling=6, reckless=1, chicken=1, ecuRev=4, recklessCruise=1, cooling=3, ecuPower=4, nitro=5, fleet=80, bullbar=3,
              armour=3, spikes=1, guns=1, autogun=1, hunter=1, pack=1, dues=3, fleetPace=3)
BOARD = dict(parts=[dict(kind="cannon", cells=[[0, 0]], x=0, y=1), dict(kind="armor", cells=[[0, 0], [1, 0]], x=0, y=0)], hold=[])
errors, fails = [], []
def check(name, ok, got=""):
    print(f"{'ok ' if ok else 'FAIL'} {name}" + (f": {got}" if got != "" else ""))
    if not ok: fails.append(name)
# the road cleared but for what a check puts there: the traffic oncoming far off, the racers far behind, the clocks held
CLEAR = "traffic.forEach((c, i) => { if (!c.racer && !c.fleet) Object.assign(c, { dir: -1, x: LANES.oncoming[i % 2], z: odo + 1500 + 40 * i, " \
        "rig: false, police: false, suv: false, heli: false, tank: false, alt: undefined, hp: null, wreck: false, swerve: null }); " \
        "else if (c.racer) c.z = odo - 3000; }); target = quarry = null; gangClock = copClock = 1e9; ambushes = []; run.loot = []"
with sync_playwright() as p:
    b = launch(p, args=["--autoplay-policy=no-user-gesture-required"])
    for layout in ["phone", "desktop"]:
        phone = layout == "phone"
        ctx = b.new_context(**(dict(viewport={"width": 844, "height": 390}, device_scale_factor=2, is_mobile=True, has_touch=True)
                               if phone else dict(viewport={"width": 1440, "height": 900})))
        pg = ctx.new_page(); js = pg.evaluate; pg.on("pageerror", lambda e: errors.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(URL); js("localStorage.clear()")
        js(f"Object.assign(progress, {{ racing: true, finish: 1, gang: true, totals: 60, tanks: 1, oil: 2, runs: 80, races: 60, bank: 9000, "
           f"points: 5000, scrap: 2000, shells: 10, damage: 0, wanted: 0.5, fortress: {json.dumps(BOARD)}, "
           f"roles: {{ harvester: 17, brewer: 9, raider: 6 }}, levels: {json.dumps(LEVELS)}, toured: TUTORIALS.map(t => t.id) }}); save()")
        if phone: js("settings.layout = 'touch'; applyLayout()")
        pg.click('[data-play="distance"]'); pg.wait_for_timeout(300)
        pg.click("#drive"); pg.wait_for_function("run.phase === 'run'", timeout=20000)
        drawn = js("ambushes.length")
        js(CLEAR); pg.wait_for_timeout(200)

        # 1. the heat retired: totals raise none, the scanner gone, no tank's race even at 100%
        got = js("""(() => { const c = traffic.find(c => !c.racer && !c.fleet && !c.wreck); const w = progress.wanted; hurtCar(c, 5000);
            const r = [progress.wanted === w, getComputedStyle($('scanner')).display]; progress.wanted = 1; r.push(bossRace()); progress.wanted = 0.5; return r; })()""")
        check(f"{layout}: on the rig a total raises no heat, the scanner is gone, no tank's race at 100%", got == [True, "none", False], got)
        check(f"{layout}: the race's ambushes drawn as it started", drawn > 0, drawn)

        # 2. the budget from the fortress's strength: a bigger, better-armed board buys more; a battered one less
        got = js("""(() => { const f = progress.fortress, keep = JSON.stringify(f), lv = { ...progress.levels };
            Object.assign(progress.levels, { widen: 0, lengthen: 0 }); f.parts = [{ kind: 'cannon', cells: [[0, 0]], x: 0, y: 0 }]; const small = [strength(), budget()];
            Object.assign(progress.levels, { widen: 2, lengthen: 3 }); f.parts = [{ kind: 'cannon', cells: [[0, 0]], x: 0, y: 1 }, { kind: 'cannon', cells: [[0, 0]], x: 2, y: 1 },
              { kind: 'armor', cells: [[0, 0], [1, 0], [2, 0]], x: 0, y: 0 }, { kind: 'armor', cells: [[0, 0], [1, 0], [2, 0]], x: 0, y: 3 }, { kind: 'gun', cells: [[0, 0], [0, 1]], x: 1, y: 1 }];
            const big = [strength(), budget()]; for (const p of f.parts) p.hp = fullHp(p) / 2; const worn = budget();
            Object.assign(f, JSON.parse(keep)); Object.assign(progress.levels, lv); return [...small, ...big, worn].map(n => +n.toFixed(1)); })()""")
        check(f"{layout}: strength and budget: a 1x1 with a cannon {got[0]}, {got[1]}; a 3x4 with two cannons, armor and a gun {got[2]}, {got[3]}; "
              f"the same half worn {got[4]}", got[3] > 2 * got[1] and got[1] < got[4] < got[3], got)

        # 3. the draw: along the race in clusters and gaps, one faction each from its own roster, within the budget; the
        # same again for the same race; the traffic's dice untouched
        got = js("""(() => { const r0 = rng, a = drawAmbushes(), b = drawAmbushes(), length = Math.max(30, progress.pace) * runTime();
            const roster = { police: ['cop', 'suv', 'heli'], gang: ['gang', 'rig'], army: ['tank'] };
            const gaps = a.slice(1).map((x, i) => x.at - a[i].at);
            return [a.length >= 2, a[0].at >= 300 && a[0].at <= 600, gaps.every(g => g >= 200 && g <= 400 || g >= 600 && g <= 1000), a.every(x => x.at < length),
                    a.every(x => x.members.length && x.members.every(m => roster[x.faction].includes(m))), costOf(a) <= budget() * 1.2,
                    JSON.stringify(a) === JSON.stringify(b), rng === r0, [...new Set(a.map(x => x.faction))].join()]; })()""")
        check(f"{layout}: ambushes along the race, the first 300-600 m in, then 200-400 m (a cluster) or 600-1,000 m (a gap) apart, "
              f"each one faction's own, within the budget; the same for the same race; the traffic's dice untouched ({got[8]})",
              got[:8] == [True] * 8, got)

        # 4. near one, its members come one by one: a police ambush
        js(CLEAR)
        got = js("""(() => { lane = fromLane = 0; carX = laneX(0); traffic.filter(c => !c.racer && !c.fleet).slice(0, 4).forEach((c, i) => c.z = odo + 800 + 40 * i);
            ambushes = [{ at: odo + 300, faction: 'police', members: ['suv', 'cop', 'heli'], sent: 0 }];
            ambushTick(); const told = $('flash').textContent; for (let i = 0; i < 5; i++) ambushTick();
            return [told, ambushes[0].sent, traffic.some(c => c.suv && !c.wreck), traffic.some(c => c.police && !c.suv && !c.wreck), traffic.some(c => c.heli && !c.wreck)]; })()""")
        check(f"{layout}: a police ambush within reach: POLICE AMBUSH!, an SUV, a police car and a helicopter on the road",
              got == ["POLICE AMBUSH!", 3, True, True, True], got)
        got = js("""(() => { ambushes = [{ at: odo + 2000, faction: 'gang', members: ['rig'], sent: 0 }]; ambushTick(); return ambushes[0].sent; })()""")
        check(f"{layout}: one further than 450 m off sends nothing yet", got == 0, got)

        # 5. the army's: two tanks in two lanes, as tough as the fortress is strong; beaten, the race goes on
        js(CLEAR)
        got = js("""(() => { traffic.filter(c => !c.racer && !c.fleet).slice(0, 3).forEach((c, i) => c.z = odo + 900 + 40 * i);
            ambushes = [{ at: odo, faction: 'army', members: ['tank', 'tank'], sent: 0 }]; const tough = Math.round(1000 * (1 + strength() / 20));
            ambushTick(); ambushTick(); const t = traffic.filter(c => c.tank && !c.wreck); return [t.length, t.every(c => Math.round(health(c)) === tough)]; })()""")
        pg.wait_for_timeout(4000)  # the road under them: they settle at their distances
        got += js("(() => { const t = traffic.filter(c => c.tank && !c.wreck).sort((a, b) => a.z - b.z); return [t[0].lane !== t[1].lane, Math.round(t[1].z - t[0].z)]; })()")
        check(f"{layout}: two tanks, in your two lanes, the second 40 m further on; as tough as the fortress is strong (1,000 x (1 + strength/20))",
              got[:3] == [2, True, True] and 25 <= got[3] <= 55, got)
        pg.screenshot(path=f"{OUT}/ambush_{layout}_tanks.png")
        got = js("""(() => { const t = traffic.find(c => c.tank && !c.wreck), s0 = run.scrap; run.loot = []; DROPS.tank[0] = 1; hurtCar(t, 1e6); DROPS.tank[0] = 0.85;
            return [run.phase, run.scrap - s0, $('flash').textContent, run.loot.length, traffic.filter(c => c.tank && !c.wreck).length]; })()""")
        check(f"{layout}: one beaten: TANK DOWN, 300 scrap, its crate on the road, the race goes on, the other tank still there",
              got == ["run", 300, "TANK DOWN", 1, 1], got)
        got = js("TUTORIALS.find(t => t.id === 'act5').now()")
        check(f"{layout}: the act's card speaks of ambushes, not the police heat", "mbush" in got and "Police heat" not in got, got)
        got = js("""(() => { const g = run.gain; run.gain = g ?? 0; const line = runLine(); run.gain = g;
            return [line.includes('police heat'), runRows().some(r => r[0] === 'Police heat')]; })()""")
        check(f"{layout}: the garage's run line and the act card's rows show no police heat", got == [False, False], got)
        ctx.close()
    b.close()
print("ERRORS:", errors or "none", "| FAILS:", fails or "none")
