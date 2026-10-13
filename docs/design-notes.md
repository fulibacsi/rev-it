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
  cluster (at least 48 px), and the garage's title moves clear of the menu button.
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
- The flashes left show on the head-up display as the blue high-beam telltale and a count.
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
  - With an ECU tune they keep the engine on its factory map (the limiter at the factory redline), unless you push
    the gas or use nitro.
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
    - it revs into the ECU tune while the engine is cool: the factory map from heat 0.6, the tune again below 0.4;
    - it pushes the nitro pedal when a racer is within 500 m ahead, the tyres grip, it is in 2nd or higher and isn't
      braking.
  - Auto flash only flashes a car that will move over, never a racer, and never plays chicken.

**The hidden race.**
- Traffic includes 100 numbered racers. Before the reveal only #100 is on the road: a white car with red stripes,
  some way ahead.
- Its head start shrinks as the car gets built: `HEAD_START` in `race.js` holds metres ahead against the share of car
  levels bought. Only Headlight flash's first level counts toward that share (`built: 1`).
- Getting past #100 reveals the race ("IT'S A RACE!"), with numbers on every racer.
- **Target:** a perfect player first passes #100 around run 20 (about 15 min of play), barely, in a run's last
  seconds, after some near misses.
- **Simulated:** first passed on run 18 (value-buying player) or run 24 (cheapest-first). Before flash charges it was
  16 and 22; the simulated player spends every metre, including on flashes that add no distance.
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
  - `race_test.py` and `race_seq.py`: grid slots and finishing places;
  - `progress.py` and `balance.py`: whole progressions played by a bot;
  - `accel.py`: stock acceleration;
  - `sim.js`: the in-page bot they share.

### Phase 3: the fleet, then Mad Max (decided 13 Oct, being built)

The owner's answers of 13 Oct. Where a detail is still open, Claude decides while building and notes it here. The
order of work is in [phase-3-build-plan.md](phase-3-build-plan.md).

**The fleet** unlocks once you reach P1: a garage page, **Fleet**, paid in miles.
- **Miles:** an Exchange card on the Fleet page turns metres into miles, one way, a mile for 1,609 m, with a slider, an
  "all available" button and the miles you have shown. The speedometer stays in km/h. No frequent-driver tiers.
- **Fleet cars:** you pay racers off to join your team. Each one takes its racer's place in the 100-car field, and
  each costs more than the last.
- **In a race** they give way to you, use their upgrades for you (a flash to move traffic out of your way, for one)
  and block racers.
- **Upgrades** are fleet-wide, not per car.
- **Sonar:** the mirror is the timer, so there is no rear view. A mechanical device fixed to the A-pillar, in the top
  left corner of the windscreen, shows where your fleet cars are behind you.

**The gang** unlocks once a race has more of your fleet cars than other racers (51 of the 100): a garage page, **Mad
Max**, paid in parts. It is to the fleet what the Black market is to the Workshop.
- **It starts with a task:** total a car. The windscreen gains an AR layer: a target reticle, and a health bar on the
  target car. Once you pass the target, the next car is targeted.
- **Damage:** bumps damage the car you hit; a bull bar means you lose less speed and they take more. At 0 health a car
  spins off the road and its parts are collected. Any car can be totalled, traffic or racer. A wrecked racer is out of
  the race and you move up; results pay by finishing position only, so wrecking can't be farmed for points.
- **Upgrades:** bull bars, illegal parts and, last, guns. With guns fitted, the red marker at the top of the steering
  wheel becomes the trigger, with FIRE written on it (by then you are mostly auto-cruising).
- **The gang** (your fleet cars) uses whatever offensive upgrades it has. No CB radio, no orders.
- **Police heat,** on a police scanner on the dash: it rises slowly with totalled cars and shots fired, so you have to
  push for the threshold. It stays between races and can't be bribed down. Police never come from behind (there is no
  rear view): they overtake you, then brake; in the oncoming lanes they floor it to hit you head-on.
- **The final boss:** past the threshold a tank appears (or a more fitting armoured opponent). It shoots at you, and
  you and the gang have to outgun it. Losing is a DNF, and the heat drops.

**Also decided (13 Oct), to build:**
- The ECU tune works in every gear, with the aids driving too ("ECU only works in 6th gear" was a bug report).
- Auto flash plays chicken once Game of chicken is bought. Reckless auto-drive uses everything you have, Auto flash
  included.
- **Flash recharge,** a new upgrade after Headlight flash: flashes come back over time, up to one every 2 s. The number
  of flashes stays a separate upgrade.
- The head-up display gets a bit more transparent, so traffic shows through; it stays where it is.
- Autocruise aims for top speed: it brakes a lot at 300+ km/h when both lanes are blocked.
- Dropped: reverse gear and a handbrake (we go fast and forward; there is no room left on the dash). Kept: the V8
  creeping off in 1st without gas.
- Balancing waits until everything is built and the bugs are fixed. Then the prices come from simulations that follow
  incremental-game practice. The Rev curve is right; Speed signs is too easy, but leave it for now.

**Open, for Claude to decide while building:** the tank or a more fitting opponent; what follows beating it (an
ending, then play on); how the sonar and the scanner look; the fleet's upgrades; the miles rate, car health, parts per
car and heat rates (first guesses, tuned in the balancing pass).

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

## Open questions

Waiting for the owner. Don't build these on a guess: ask.

- None right now: the answers of 13 Oct settled them (phase 3, above).
- **For the balancing pass, after the build:** the flash prices moved the simulated reveal about 2 runs later; the
  prices of Game of chicken and Reckless auto-drive; the miles rate, car health, parts per car and heat rates; Speed
  signs is too easy.

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
