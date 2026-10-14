# Design notes

What has been decided about Rev It and why, the balance targets, the playtest history and the questions still
open. The owner (fulibacsi) makes the design calls; this file records them so that work can carry on from any
machine or session. Keep it current: update a section when a decision changes, and move answered questions out of
[Open questions](#open-questions).

## How it plays

**Physics** is shared by every game.
- **Engines** (picked from the menu; Distance unlocks them in order):

  | Engine | Final drive | Stock 0–100 km/h |
  |---|---|---|
  | Boxer | 4.10 | 7.9 s |
  | V8 | 3.42 | 5.6 s |
  | Turbo I6 | 3.27 | 5.2 s |

- **Torque** is a flat curve, so power peaks near the redline. The rev limiter is a short fuel cut.
- **Drivetrain:** the clutch and tyres slip, with tyre sliding friction at 0.7 of grip.
- **Crashes:** hitting a slower car in your lane drops you to the lower of 35% of your speed and 40% of its speed.
  That's harsh on purpose, so you don't hit the same car again.

**Touch layout.**
- **Detection:** a coarse pointer plus `maxTouchPoints > 1`. The menu can force either layout.
- **Placement:** shifter on the left, pedals on the right. Everything keeps clear of the phone's swipe zones
  (`--edge-l/r/b`: the safe area plus a gap), because a swipe up from the home bar once switched apps mid-run.
- **Full screen:** add the page to the iPhone home screen.
- **The notch** pushes everything on the left inwards. The ignition key then shrinks into the room left of the
  cluster (at least 48 px), and the garage's title moves clear of the menu button. On the right it pushes the pedals
  in: the brake pedal, once wider than the others, is now the same width (8.5vw) and the gaps a little tighter, so the
  clutch's depth bar clears the speedometer (the owner's idea, 14 Oct).
- **Leaving the page:** hiding it pauses into the menu, and RESUME restarts the audio that iOS suspends.

**Pedals.**
- A finger floors a pedal where it lands and slides up to ease off; the pedal springs back when lifted. "Lower =
  deeper" was tried and rejected, because it pushed fingers to the screen's edge.
- With the mouse, a pedal stays where it is left; double-click releases it.
- The newest pointer always takes a control. A pointer the browser loses must never lock it: the gas pedal once
  stopped responding that way.

**Steering.**
- You grab the wheel's rim to steer; swiping on the road was removed ("you have to grab the wheel").
- A sideways drag turns it, and past 20° you change lanes.
- It springs back when let go and doesn't move when nobody holds it.
- Lane changes are discrete: four lanes, two of them oncoming.

**Gear lever.**
- An H gate, and every shift needs the clutch.
- With a finger, the lever forgives a sloppy route. Once the finger has come out through neutral, anywhere deep in
  the top or bottom row puts the lever in the nearest column's slot, and it follows the finger if it drifts.
- Between two columns, the revs tip the choice:
  - judged from the gear you grabbed it in;
  - the next gear up past 75% of the redline, the next one down under 40%;
  - from neutral, the lowest gear that won't over-rev.
- The owner rejected a semi-automatic version ("let's not overhelp ... don't let the user just flip it"). You still
  take the lever into the row yourself, and the gear is whatever it sits in when you let go.
- The mouse stays exact.

**Keeping it in the car (diegetic).**
- Headlight flash is a light stalk on the steering column, left of the wheel and fixed (it doesn't turn with the
  wheel). Its touch area is kept off the rim. F also flashes.
  - On phones it comes out further up the rim and is a little shorter: the shifter, pushed in by the iPhone's island,
    hid it.
- The head-up display is see-through (its readouts at 0.65), so the traffic behind it shows; its messages (GO!,
  CRASH) come at full strength. It stays where it is. (Claude's call: 0.65 over 0.92, from screenshots over traffic.)
- The flashes left show on the head-up display as the blue high-beam telltale and a count. With Flash recharge a
  line fills under it while a used flash comes back (up to the run's full count); it shows in full even when the
  telltale is dimmed for none left. (Claude's call: 10, 8, 6, 4, 2 s over five levels, 2,500 m and up, on sale
  once the race is revealed; see the hidden race.)
- The run's time left is a bar draining across the widened rear-view mirror. It turns red and blinks under 5 s.
- Nitro is a smaller red NOS pedal bolted over the gas pedal's top right corner, like a side pedal (the owner's
  design). Pushing it floors the gas, and N does the same. The tank shows as a NOS bar under TEMP on the cluster. It
  replaced a red NOS button, which floated over the oncoming lanes on phones.
  - It sticks out past the gas pedal by no more than the gap kept clear of the screen's edge, and covers only the gas
    pedal's corner (4–8% of its touch area), so a thumb on the gas doesn't fire nitro by accident.

## Distance

An incremental game. Each run is timed, every metre driven is banked, and metres buy upgrades in the garage between
runs. A hidden race is the second act.

### Act 1: build the car

- **Runs:** 20 s, plus 5 s per Time level (50 s at most).
- **The garage's pages:** **Workshop** (the car itself) and **Autopilot** (the robot driver), paid in metres; the
  **Black market** (the illegal and forbidden, paid in race points) opens with the reveal. The price is
  `base × growth^level`, rounded to tens of metres.

  | Upgrade | Page | Levels | Base | Growth | Notes |
  |---|---|---|---|---|---|
  | Power | Workshop | 10 | 80 | 1.55 | +12% torque a level |
  | Rev limit | Workshop | 4 | 150 | 2 | 600 rpm a level, up to the factory redline |
  | Gearbox | Workshop | 3 | 250 | 2.5 | 3 to 6 gears |
  | Tyres | Workshop | 4 | 400 | 1.8 | grip |
  | Time | Workshop | 6 | 200 | 1.9 | +5 s a run |
  | Steering | Workshop | 3 | 300 | 2 | lane changes 40% quicker a level |
  | Headlight flash | Workshop | 10 | 300 | 1.25 | 1–10 flashes a run, refilled free; racers never yield |
  | Flash recharge | Workshop | 5 | 2500 | 1.5 | a used flash back every 10 s, down to 2 s; needs 10 flashes; from the reveal on |
  | Auto flash | Autopilot | 1 | 2000 | | needs 5 flashes |
  | Auto clutch | Autopilot | 1 | 700 | | centrifugal: can't stall or bog |
  | Auto gas | Autopilot | 1 | 800 | | launch revs, traction control |
  | Auto shift | Autopilot | 1 | 2500 | | needs Auto clutch |
  | Lane assist | Autopilot | 1 | 1500 | | last-moment swerve |
  | Autocruise | Autopilot | 1 | 6000 | | needs Lane assist, Auto gas, Auto shift |
  | Engine swap | Workshop | 2 | 4000 | 2.5 | Boxer → V8 → Turbo I6 |

- **The aids** work the same pedals and lever as the player, so you can watch them.
  - They leave a control to you only while you touch it: your foot on the gas (no auto brake, no lift), on the
    clutch or the brake, your hand on the wheel or the lever. The nitro pedal isn't the gas pedal: pushing it,
    traction control and autocruise's braking carry on.
  - With an ECU tune they rev into it in every gear while the engine is cool: the factory map from heat 0.6, until it
    has cooled below 0.4. Your foot on the gas, or nitro, take the tuned map whatever the heat.
  - Autocruise:
    - picks the lane that goes further and keeps right;
    - brakes behind traffic it can't pass;
    - overtakes a racer by moving over behind an ordinary car that Auto flash can move out of the way;
    - never drives in the oncoming lanes (Reckless auto-drive does).
  - Reckless auto-drive (Black market) is autocruise without manners:
    - boxed in on your side, it takes the near oncoming lane when nothing is coming for 6 s, or when whatever comes
      can be flashed away (Game of chicken and a flash left);
    - it goes home when something it can't flash away comes within 3.5 s, or when your side opens again. It cuts in
      beside a car only to escape a head-on under 2 s away: a bump beats a DNF;
    - it pushes the nitro pedal when a racer is within 500 m ahead, the tyres grip, it is in 2nd or higher and isn't
      braking.
  - Auto flash only flashes a car that will move over, never a racer. With Game of chicken it plays chicken too: in
    an oncoming lane it flashes the car coming at you once a flash would make it swerve (under 4.5 s away). Reckless
    auto-drive plays chicken with or without it, and Auto flash works alongside it when it is on. (Claude's call:
    "uses everything, even Auto flash" read as: everything you own and have switched on; the switch is still yours.)

**The hidden race.**
- Traffic includes 100 numbered racers. Before the reveal only #100 is on the road: a white car with red stripes,
  some way ahead.
- Its head start shrinks as the car gets built: `HEAD_START` in `race.js` holds metres ahead against the share of car
  levels bought. Only Headlight flash's first level counts toward that share (`built: 1`), and none of Flash
  recharge's (`built: 0`).
- Getting past #100 reveals the race ("IT'S A RACE!"), with numbers on every racer.
- **Target:** a perfect player first passes #100 around run 20 (about 15 min of play), barely, in a run's last
  seconds, after some near misses.
- **Simulated:** first passed on run 18 (value-buying player) or run 24 (cheapest-first). Before flash charges it was
  16 and 22; the simulated player spends every metre, including on flashes that add no distance. On 14 Oct the same
  simulation gives 22 and 33 (the same on every run). Flash recharge, on sale from the start, made it 32 and 36: it
  took the metres the car needed and counts nothing towards the head start. So it goes on sale with the reveal, and
  its card isn't shown before (Claude's call).
- **Never hint** at the white car in the garage ("a clear giveaway").

### Act 2: the race

**The field and the start.**
- From the reveal on, every run is a race.
- Racers can overtake you, and your result is your position when the clock runs out.
- Racer pace: #100 cruises at 140 km/h, +2 km/h a place to #20 at 300, then +8 a place to #1 at 452. The top 20 need
  the reckless kit; #1 is beyond 6th gear's reach.
- Grid: you start behind the field unless you buy grid slots (Bribe the starter). Slot N opens once you've finished a race ahead of
  racer N.
- Rolling start: an upgrade, Jump the start (50 km/h in 1st, 90 in 2nd ... 250 in 6th). Without it, races start standing.

**Scoring** (race points):
- Each finishing position pays once, the first time you reach it: 1 for 100th, 2 for 99th ... 100 for 1st, 5,050 in
  all.
- Every race also pays `ceil((101 − position) / 10)`: P61 4, P20 9, P1 10.
- A DNF pays nothing.
- Payment goes by finishing position, never by places gained. An earlier "points per place gained" rule was farmable:
  starting at the back on purpose, or swapping places with a racer, paid extra.

**Black market** (paid in race points, 5,536 in all):

| Upgrade | Levels | Base | Growth | Notes |
|---|---|---|---|---|
| Bribe the starter (grid) | up to 100 | 1 | 1.035 | slot N needs a finish ahead of #N |
| Reckless driving | 1 | 100 | | oncoming lanes; from now on collisions damage the car |
| Game of chicken | 1 | 150 | | flashes work on oncoming cars: they swerve, room permitting; needs Headlight flash |
| Reckless auto-drive | 1 | 300 | | autocruise in the oncoming lanes too, with chicken, the tune and nitro; needs Autocruise |
| Cooling | 3 | 60 | 2 | heat rises 15% slower a level |
| ECU: rev limit | 4 | 50 | 1.6 | +300 rpm past the factory redline a level |
| ECU: power | 4 | 60 | 1.6 | +8% torque a level |
| Nitro | 5 | 100 | 1.5 | tank of 2 s a level (to 10 s), +60% torque; needs ECU power |
| 7th gear | 1 | 600 | | needs nitro and 6 gears |
| Daredevil | 1 | 200 | | the oncoming lanes refill nitro, 0.5 s a second; needs everything else maxed |
| Jump the start (rolling start) | 6 | 5 | 2.3 | each level needs the gear it starts in |

**Damage.** It starts with Reckless driving, and any collision causes it from then on. It is never cosmetic only.
- **Rev limit:** −30 rpm per % of damage from the first hit (3,000 rpm lost at 100%), but never below idle + 1,500.
- **Gearbox:** a gear breaks at 50% and another at 70%. Broken gears show as a red cross in the gate and are skipped.
- **Pop-outs:** past 80% the car jumps out of gear into N under load, and the GEAR lamp lights.
- **Head-on crash:** ends the run (DNF), with cracks on the windscreen.
- **Repairs:** 40 m per %.
- **At 100% (wrecked):** there's no fail state. Limp mode gives 30% power, the run ends after 40 m, and those metres
  pay for 1% of repairs.

**Heat** shows on the cluster's TEMP gauge once the engine is tuned.
- Revving past the factory redline heats fast (held there, the red in about 6 s). ECU power heats slowly while it
  burns fuel (floored, about 40 s), but not while the limiter cuts it. Easing off cools.
- In the red it damages the engine, up to 2% a second.

**Nitro** pushes the heat into the red, so it does direct damage, but the top places need it. Tanks are refilled
before each run at 100 m per second of nitro. The NOS pedal floors the gas, but the aids stay on while it is pushed:
Auto gas's traction control trims it, and autocruise still brakes.

### Act 3: the fleet

**The Fleet** opens with your first win (P1), and never shows before it. The garage says so after that race: "the
racers you beat are open to offers". It is a garage page paid in **miles**.
- **The Exchange** card turns metres into miles, one way, a mile for 1,609 m: a slider for how many, an "all
  available" button, and the miles you have. Miles show in the garage's header too. The speedometer stays in km/h.
- **Pay off a racer:** each one you pay off joins your fleet. It keeps its number, its slot in the 100-car field and
  its pace, in your colours (black with gold stripes).
  - The slowest go first (#100, then #99 ...), from 1 mi, each 6% dearer: 18 mi for the 51st, about 308 mi for the
    first 51. #1 won't sell.
  - Your position counts the rivals only, so a fleet car ahead of you doesn't cost you a place; the head-up display's
    gaps are to rivals too.
  - Claude's calls: the order (the slowest first, so a fleet car is one you have already beaten) and the prices (first
    guesses; see the simulation below).
- **In a race** a fleet car gives way when you come up behind it in its lane (from 250 m, briskly, as for a flash). It
  blocks a rival closing on it from behind: when one within 60 m heads for its other lane, it moves across in front of
  it. It waits 2 s between moves and a racer 5 s, so a blocked rival rarely gets past. It never moves into your path.
- **Fleet upgrades** are fleet-wide, paid in miles (Claude's calls, first-guess prices):

  | Upgrade | Levels | Base | Growth | Notes |
  |---|---|---|---|---|
  | Pay off a racer | up to 99 | 1 | 1.06 | the slowest first; #1 won't sell |
  | Fleet dues | 5 | 5 | 2 | each fleet car pays you 10% a level of the metres it drove, at the finish |
  | Fleet tuning | 5 | 3 | 2 | fleet cars 5% quicker a level |
  | Fleet flash | 1 | 15 | | a fleet car flashes a slower ordinary car up to 100 m ahead of it out of your lane (every 3 s at most; none of your flashes) |

  Dues are the act's income: a race nets you only about 1 mile after the nitro refill and repairs, while a fleet car
  drives about 2.5 km a race. They pay metres, into the bank, so the Exchange stays the one way to miles.
- **The sonar:** the mirror is the timer, so there is no rear view. A sonar bolted to the left A-pillar, under the menu
  button, shows your fleet cars up to 500 m behind you: gold blips on a green phosphor fan, further out the further
  back, angled by how far across the road they are, with range rings at 100, 250 and 500 m and a sweeping line. It
  shows only with a fleet, and only on the road. (Claude's call: the look, the range, and fleet cars only.)
- **Simulated** (`act3.py`, seed 11, from P1 with act 2's car and 57k m): 51 fleet cars after 26 races buying dues
  first, 71 buying the cheapest first (dues came only at race 46).

### Act 4: Mad Max

**The gang:** once 51 of the 100 race for you, your fleet is a gang. The garage gives its first job: total a car. The
windscreen gains an **AR layer** (red, like a gunsight): a reticle round the nearest car ahead going your way, its
health bar above it, and "TOTAL IT" until the first job is done (a racer's number after). It stays on that car until
you pass it or total it, then moves to the next.
- **Damage:** a bump takes 0.4 of the speed you hit at (km/h) off the car's health: 100 for traffic, 150 for a racer,
  so two or three rams, or three or four. A head-on is still your DNF, not a total. Your fleet cars can't be hurt.
- **Totalled** at 0 health, a car skids onto the right shoulder, tipped and smoking, and stops; you collect its parts
  (10 from traffic, 25 from a racer). A totalled rival is out of the race and you move up; results still pay by
  finishing position only, so wrecking can't be farmed for points.
- **The Mad Max page** opens with the first total, paid in parts. It is to the Fleet what the Black market is to the
  Workshop.

  | Upgrade | Levels | Base | Growth | Notes |
  |---|---|---|---|---|
  | Bull bar | 3 | 10 | 2.5 | bumps hurt them 50% more a level; you keep more speed (at 3, you carry on at the car's speed); the gang side-swipes rivals |
  | Armour plating | 3 | 15 | 2.5 | collisions do 25% less damage to your car a level |
  | Spiked hubs | 1 | 60 | | a side-swipe (into a car while moving over) costs you no speed and does 50 more damage; the gang's 30 more |
  | Guns | 3 | 120 | 2 | needs Spiked hubs: 6 damage a shot a level, 4 shots a second, up to 200 m; the gang fires too |

- **Guns,** last: the red marker at the top of the steering wheel becomes the trigger, with FIRE written on it (G on
  the keyboard). Held, it fires 4 shots a second from twin guns on the bonnet at the car in the reticle, if it is
  within 200 m and in sight; yellow tracers and a muzzle flash show each shot, and a miss goes off into the distance.
  The gang fires too: a fleet car shoots a rival up to 80 m ahead of it (or beside it) once a second. Before guns the
  marker is just part of the rim.

- **The gang uses whatever it has.** With a bull bar a fleet car side-swipes a rival beside it, every 3 s at most (20
  damage a level): it lurches across, then drives back into its lane. What it totals pays you the parts, and the rival
  is out of the race. Ramming hurts your own car (2–25% a bump), so armour is the "illegal part" that makes a
  campaign of it possible.

**Police heat** (`progress.wanted`, 0 to 100%) shows on a **police scanner** bolted to the right A-pillar, opposite
the sonar: an LCD ("HEAT 37%", "PURSUIT" while police are on the road), ten lights from green to red, and a red and blue
lamp. It shows from Mad Max on, only on the road; the garage's report gives it too.
- **It rises** with every total: 2% for traffic, 3% for a racer, 8% for a police car, 1% for one the gang totals;
  and 0.05% a shot. Nothing brings it down: it stays between races and can't be bribed down.
- **Police come with it:** one every 30 s when barely wanted, down to every 6 s at the top (the first one a run after
  that wait), two on the road at most. They never come at you from behind (there is no rear view):
  - from behind they come past you in your other lane, 20 m/s quicker, cut into your lane 30 m ahead and brake hard
    for 2.5 s, then drive off up the road;
  - while you drive in the oncoming lanes one comes at you head-on, flat out (to 250 km/h), steering for you until 1.2 s
    out, so you can still get out of its way. A head-on is a DNF.
  - They don't move over for a flash, nor swerve for chicken. They can be totalled (8% heat).
- Claude's calls: the heat rates, the police numbers and moves, and the scanner on the right A-pillar instead of the
  dash (on a phone the dash is full: shifter, cluster and pedals).

**The final boss, the tank.** At 100% heat the garage warns that the army has sent a tank, and the next race has it
(not in limp mode).
- It comes into view 250 m up the road and holds the road about 80 m ahead of you, in your lane: you can't get away
  from it or past it. It is the AR target ("TANK"), with 2,000 health.
- It fires a shell at you every 2.5 s while you are within 250 m behind it: 8% damage a hit (armour takes a quarter
  off a level), with the shot, a jolt and the cracks to show it.
- You and the gang outgun it: your guns, and the fleet's, which race up to join the fight (40 m/s quicker until
  they are with it) and shoot it from within 200 m. A ram does a fifth of its usual damage.
- **Destroyed:** the ending. "THE END. You beat the tank: the road is yours", 300 parts, the heat back to 0. Then you
  play on; the next tank is half as tough again (3,000, then 4,000 ...).
- **Lost** (wrecked, a head-on, or the bell with the tank still going): a DNF ("the tank held the road"), and the heat
  drops to half, so you have to push for it again.
- Claude's calls: the tank stayed (the owner's pick; it fits the army being called in when the police can't cope), its
  numbers, the ending as a garage message rather than a screen of its own, and play on with a tougher tank.
- Claude's calls: the AR look, the target rule, 0.4 per km/h, the health and parts numbers, the Mad Max page opening
  with the first total (the job is the way in), the illegal parts (armour and spiked hubs), how the gang uses its
  gear, and the guns' numbers (they aim themselves at the reticle: on a phone your thumbs are busy). All first
  guesses for the balancing pass.

### Balance targets and results

- **First playtest (act 1 into act 2):** "fun, relatively quick", no excess currency, P76 after about 30 min.
- **Act 2, simulated** (13 Oct, four traffic seeds each): the bot drives with Reckless auto-drive's habits and buys it
  after Game of chicken: P1 after 20–26 races (mean about 22). Never buying it (so no ECU revs outside nitro): 16–23
  (about 21). Neither upgrade makes a measurable difference to the pace. The top 10 need max nitro and 7th gear.
  After P1 a race still pays 10.
- **Metres:** they pile up in act 2 (about 65–70k unspent by P1). Metre sinks and the fleet (below) are meant to soak
  them up.
- **Simulation tools** live in `tests/balance/` and are run from the repo root:
  - `act1.py [cheapest|value] [head-start curve]`: when #100 is first passed;
  - `act2.py [races] [seed]`: races from the reveal to P1, the bot driving like Reckless auto-drive (`aids.js`). The
    traffic seed alone moves the result by up to 7 races, so compare a few seeds;
  - `act3.py [races] [seed] [order|cheapest]`: races from the first win to 51 fleet cars, buying the Fleet's upgrades;
  - `cruise.py [runs] [plain|reckless]`: autocruise at speed through traffic: metres a run, time on the brake, crashes;
  - `race_test.py` and `race_seq.py`: grid slots and finishing places;
  - `progress.py` and `balance.py`: whole progressions played by a bot;
  - `accel.py`: stock acceleration;
  - `sim.js`: the in-page bot they share.

### Phase 3: the fleet, then Mad Max (decided 13 Oct, built overnight 13–14 Oct)

The owner's answers of 13 Oct. Where a detail is still open, Claude decides while building and notes it here. The
order of work is in [phase-3-build-plan.md](phase-3-build-plan.md).

**The fleet** unlocks once you reach P1: a garage page, **Fleet**, paid in miles (built: see Act 3). No
frequent-driver tiers.
- **Fleet cars** and their upgrades: built, see Act 3.

**The gang** unlocks once a race has more of your fleet cars than other racers (51 of the 100): built, with its
upgrades and the guns (see Act 4). The gang uses whatever offensive upgrades it has. No CB radio, no orders.
- **Police heat** and the scanner: built (see Act 4).
- **The final boss,** the tank: built (see Act 4).

**Also decided (13 Oct), to build:**
- Autocruise aims for top speed: it brakes a lot at 300+ km/h when both lanes are blocked. **Looked into, not changed
  yet** (14 Oct, `cruise.py`, 24 traffic seeds each, the car act 2 ends with):
  - It spends 28–30% of a run on the brake, plain or reckless. At speed it starts braking for a car 300+ m ahead in
    its lane because the other lane has a slower car nearer; it never plans to pass that one and move over before
    reaching its own. The following itself is not the problem (gentler following changed nothing).
  - Weaving instead of braking (move over once past the nearer car, if that lane is clearer beyond): 2,481 → 2,605 m a
    run plain, 2,577 → 2,753 reckless (+5–7%, about one standard error each), but crashes up from 32 → 44 and
    36 → 48. The simulations don't charge crash damage; play does.
  - The same weave only when full braking could still stop you behind your own car: crashes as before, and no
    measurable gain (2,491 and 2,654 m).
  - Not kept: not proven. The owner's call whether the faster, crashier weave is worth it.
- Dropped: reverse gear and a handbrake (we go fast and forward; there is no room left on the dash). Kept: the V8
  creeping off in 1st without gas.
- Balancing waits until everything is built and the bugs are fixed. Then the prices come from simulations that follow
  incremental-game practice. The Rev curve is right; Speed signs is too easy, but leave it for now.

**Open, for Claude to decide while building:** car health, parts per car and heat rates (first guesses,
tuned in the balancing pass).

## Playtest log

All dates are 2026.

- **10–12 Oct, early builds:**
  - The prototypes (the rev page, a cockpit view, H-gate "kinetic" controls, the incremental game) merged into one
    app with a menu.
  - Touch pedals spring back.
  - Lanes and overtaking were added; a crash costs speed and doesn't end the game.
- **12 Oct, first Distance playtest:**
  - The wheel moves only while held.
  - The wheel got a bigger handle and a wide grip band.
  - The Steering upgrade was added.
  - Your foot on the gas overrides autocruise and uses the ECU's over-rev.
  - Headlight flash and Auto flash were added.
  - Racers change lanes at most every 5 s, traffic every 2 s.
- **12 Oct, phone:**
  - The layout keeps clear of the iPhone's swipe zones.
  - The page installs to the home screen.
  - Leaving the page pauses the game.
  - Sound now resumes after switching apps.
  - The menu got Continue / New game.
- **12 Oct, second playtest** ("gearshifting is awesome. steering is awesome"):
  - The finger shift assist.
  - The fix for the stuck gas pedal.
  - "ECU only works in 6th gear" was taken as a bug report. Any tune had made the hands-off aids slower; they now keep
    to the factory map.
  - Flash charges.
  - Auto flash leaves racers alone.
- **12 Oct, diegetic pass:** the light stalk replaced the FLASH button, and the timer moved into the mirror.
- **13 Oct, phone:**
  - The light stalk was partly hidden behind the gear shifter. It now comes out further up the rim.
  - The NOS button became a NOS pedal on the gas pedal, with a gauge on the cluster. Then it was bolted to the gas
    pedal's corner, as it seemed to hover.
  - Game of chicken (the owner's idea): a Racing upgrade that makes a flash work on oncoming traffic.
  - Reckless auto-drive (the owner's idea): autocruise that uses the oncoming lanes, chicken, the tune and nitro.
  - The garage split into pages: Workshop, Autopilot and the Black market (the owner's picks of the proposed names),
    with the illegal automation (Reckless auto-drive) on the Black market. Grid and Rolling start became Bribe the
    starter and Jump the start. Time keeps its name: a fuel tank would have to burn more in a faster car.
- **13–14 Oct, the overnight build** (Claude, while the owner slept, from the answers of 13 Oct; every open detail is
  marked "Claude's call" above):
  - Fixes: the iPhone overlaps (key over the rev counter, menu button over GARAGE); the aids leave a control only
    while you touch it (nitro is not the gas pedal); the ECU tune in every gear.
  - The head-up display see-through; Flash recharge; Auto flash plays chicken.
  - Act 3, the Fleet: miles and the Exchange, paying racers off, their teamwork, the fleet's upgrades, the sonar.
  - Act 4, Mad Max: the AR target, totals and parts, bull bars, armour, spiked hubs, guns on the wheel's marker, the
    gang at work, police heat with the scanner and the police, and the tank.
  - Autocruise's top speed was measured, not changed (see "Also decided").

## Open questions

Waiting for the owner. Don't build these on a guess: ask.

- **Autocruise's weave** (see "Also decided"): about 5–7% further a run, but about a third more crashes. Worth it?
- **For the balancing pass, after the build:** the flash prices moved the simulated reveal about 2 runs later; the
  prices of Game of chicken and Reckless auto-drive; Speed signs is too easy. All of phase 3's numbers are first
  guesses: the miles prices and dues (`act3.py`), car health and damage per bump, parts per car and the Mad Max
  prices, the heat rates and the police, the tank's health and shells.

## Brainstorm waiting for the owner's picks

The owner asked for ideas on the fleet, sinks for the surplus metres and future acts: keep the car theme and the
hands-on driving, and extreme ideas are welcome. The fleet, miles and police heat are now decided (phase 3, above);
these proposals are still open.

- **Metres sinks** (the miles exchange is one now):
  - repairs that scale with the car's value;
  - tyres as a per-race consumable;
  - cockpit cosmetics;
  - an escalating metres-to-points exchange.
- **Acts after Mad Max:**
  - Cannonball run across the country (its police heat went into phase 3).
  - Manufacturer: the Rev game returns as dyno engine design, and the traffic becomes your cars.
  - Extreme: land speed records, then a road off the planet.
  - Then a new game plus, with a legacy bonus.
