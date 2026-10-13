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
- Nitro is a smaller red NOS pedal riding on top of the gas pedal (the owner's design), and pushing it floors the
  gas. N does the same. The tank shows as a NOS bar under TEMP on the cluster. It replaced a red NOS button, which
  floated over the oncoming lanes on phones.

## Distance

An incremental game. Each run is timed, every metre driven is banked, and metres buy upgrades in the garage between
runs. A hidden race is the second act.

### Act 1: build the car

- **Runs:** 20 s, plus 5 s per Time level (50 s at most).
- **Car tab** (paid in metres; the price is `base × growth^level`, rounded to tens):

  | Upgrade | Levels | Base | Growth | Notes |
  |---|---|---|---|---|
  | Power | 10 | 80 | 1.55 | +12% torque a level |
  | Rev limit | 4 | 150 | 2 | 600 rpm a level, up to the factory redline |
  | Gearbox | 3 | 250 | 2.5 | 3 to 6 gears |
  | Tyres | 4 | 400 | 1.8 | grip |
  | Time | 6 | 200 | 1.9 | +5 s a run |
  | Steering | 3 | 300 | 2 | lane changes 40% quicker a level |
  | Headlight flash | 10 | 300 | 1.25 | 1–10 flashes a run, refilled free; racers never yield |
  | Auto flash | 1 | 2000 | | needs 5 flashes |
  | Auto clutch | 1 | 700 | | centrifugal: can't stall or bog |
  | Auto gas | 1 | 800 | | launch revs, traction control |
  | Auto shift | 1 | 2500 | | needs Auto clutch |
  | Lane assist | 1 | 1500 | | last-moment swerve |
  | Autocruise | 1 | 6000 | | needs Lane assist, Auto gas, Auto shift |
  | Engine swap | 2 | 4000 | 2.5 | Boxer → V8 → Turbo I6 |

- **The aids** work the same pedals and lever as the player, so you can watch them.
  - Your own foot on the gas overrides them: no auto brake and no lift.
  - With an ECU tune they keep the engine on its factory map (the limiter at the factory redline), unless you push
    the gas or use nitro.
  - Autocruise:
    - picks the lane that goes further and keeps right;
    - brakes behind traffic it can't pass;
    - overtakes a racer by moving over behind an ordinary car that Auto flash can move out of the way;
    - never drives in the oncoming lanes.
  - Auto flash only flashes a car that will move over, never a racer.

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
- Grid: you start behind the field unless you buy grid slots. Slot N opens once you've finished a race ahead of
  racer N.
- Rolling start: an upgrade (50 km/h in 1st, 90 in 2nd ... 250 in 6th). Without it, races start standing.

**Scoring** (race points):
- Each finishing position pays once, the first time you reach it: 1 for 100th, 2 for 99th ... 100 for 1st, 5,050 in
  all.
- Every race also pays `ceil((101 − position) / 10)`: P61 4, P20 9, P1 10.
- A DNF pays nothing.
- Payment goes by finishing position, never by places gained. An earlier "points per place gained" rule was farmable:
  starting at the back on purpose, or swapping places with a racer, paid extra.

**Racing tab** (paid in race points, about 5,300 in all):

| Upgrade | Levels | Base | Growth | Notes |
|---|---|---|---|---|
| Grid | up to 100 | 1 | 1.035 | slot N needs a finish ahead of #N |
| Reckless driving | 1 | 100 | | oncoming lanes; from now on collisions damage the car |
| Cooling | 3 | 60 | 2 | heat rises 15% slower a level |
| ECU: rev limit | 4 | 50 | 1.6 | +300 rpm past the factory redline a level |
| ECU: power | 4 | 60 | 1.6 | +8% torque a level |
| Nitro | 5 | 100 | 1.5 | tank of 2 s a level (to 10 s), +60% torque; needs ECU power |
| 7th gear | 1 | 600 | | needs nitro and 6 gears |
| Daredevil | 1 | 200 | | the oncoming lanes refill nitro, 0.5 s a second; needs everything else maxed |
| Rolling start | 6 | 5 | 2.3 | each level needs the gear it starts in |

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
before each run at 100 m per second of nitro. The NOS pedal counts as your own foot on the gas, so the aids step aside
while it is pushed: no auto brake, and no traction control (the tyres can spin).

### Balance targets and results

- **First playtest (act 1 into act 2):** "fun, relatively quick", no excess currency, P76 after about 30 min.
- **Act 2, simulated:** P1 after 22 races (13 Oct; 23 with the old NOS button, which left the aids driving), which needs max nitro and 7th gear for the top 10. After P1 a race
  still pays 10.
- **Metres:** they pile up in act 2 (about 65–70k unspent by P1). Metre sinks and the fleet (below) are meant to soak
  them up.
- **Simulation tools** live in `tests/balance/` and are run from the repo root:
  - `act1.py [cheapest|value] [head-start curve]`: when #100 is first passed;
  - `act2.py`: races from the reveal to P1;
  - `race_test.py` and `race_seq.py`: grid slots and finishing places;
  - `progress.py` and `balance.py`: whole progressions played by a bot;
  - `accel.py`: stock acceleration;
  - `sim.js`: the in-page bot they share.

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
  - The NOS button became a NOS pedal on the gas pedal, with a gauge on the cluster.

## Open questions

Waiting for the owner. Don't build these on a guess: ask.

- What happens when you reach P1 / pass #1?
- Should Auto gas's traction control keep working while the NOS pedal is pushed? Without it, nitro spins the tyres
  in the middle gears: in `nitro_test`, 4th at about 170 km/h, nitro now adds 25 km/h in a second instead of 34.
- Should autocruise ever drive in the oncoming lanes?
- "ECU updates only works on 6th gear" was read as a bug report and fixed. Confirm it wasn't a request to restrict
  the ECU to 6th gear.
- The flash prices moved the simulated reveal about 2 runs later. Make flashes cheaper if the reveal should stay
  where it was.
- **Older questions, never answered:**
  - km/h or mph (the road is Californian)?
  - Is the V8 creeping off in 1st without gas fun?
  - A live rear view in the mirror (it now shows the timer)?
  - Reverse gear and a handbrake?
  - Are the Rev and Speed signs difficulty curves right?
- **Low priority:** retune autocruise for four lanes. It is crash-free but brakes a lot at 300+ km/h when both lanes
  are blocked.

## Brainstorm waiting for the owner's picks

The owner asked for ideas on the fleet, sinks for the surplus metres and future acts: keep the car theme and the
hands-on driving, and extreme ideas are welcome. These are the proposals; none is decided.

- **Fleet.**
  - Unlocks late in act 2, alongside autocruise, and is bought with metres.
  - Fleet cars race as your teammates. They earn only the per-race part of race points, and you can draft behind
    them.
  - A later act grows it into buying out the rivals you've beaten until you own the field.
  - It would get its own garage tab.
- **Metres sinks:**
  - repairs that scale with the car's value;
  - tyres as a per-race consumable;
  - the fleet;
  - cockpit cosmetics;
  - an escalating metres-to-points exchange.
- **Future acts:**
  - 3, Team and fleet: sponsors and money.
  - 4, Cannonball run across the country: miles, police heat.
  - 5, Manufacturer: the Rev game returns as dyno engine design, and the traffic becomes your cars.
  - 6, Extreme: land speed records, then a road off the planet.
  - Then a new game plus, with a legacy bonus.
