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
- **The turbo I6 flutters** when you lift off on boost ("stu-tu-tu", a dozen puffs slowing over about 0.6 s, as loud as
  the blow-off valve's hiss it replaced): a playtester expected it of a JDM turbo (18 Oct).
- **Drivetrain:** the clutch and tyres slip, with tyre sliding friction at 0.7 of grip.
- **Brakes** stop as hard as the tyres grip, as with ABS: 0.8 g on stock tyres to 1.2 g with Tyres maxed (0.9 g in
  the other games), whatever the engine weighs. A fixed 11,000 N had the heavier engines braking worse (0.70 g in the
  V8) as the speeds went up; playtesters found the brakes weak (18 Oct). From 300 km/h, maxed tyres now stop in about
  270 m (it was 345–455 m); the stock boxer on stock tyres needs 48 m from 100 km/h (43 m before), back to 43 m with
  one level of Tyres. Not a new upgrade: the Tyres card says it covers braking. Autocruise still brakes at the firm
  deceleration it was tuned with (from 5.5 m/s², holding while 3.7), like adaptive cruise control: planned on 3/4 of
  the stronger brakes it braked later, got boxed in more, and Reckless auto-drive's head-ons went from 3 to 14 in
  `cruise.py`'s 24 runs. Simulated on top of the traffic fix, same seeds: act 1 #100 first passed on run 17, 18, 18,
  16 (value) and 22, 21, 21, 23 (cheapest-first); act 2 P1 after 15, 17, 15, 16 races (40–47k metres banked); act 3
  51 fleet cars after 25 every time; act 4 the tank in races 29, 31, 27, 28; `cruise.py` autocruise 2,954 m a run, 14
  crashes, 30% on the brake, Reckless auto-drive 2,891 m, 24 crashes (4 head-ons), 28%. Within the seeds' noise of
  the traffic fix alone.
- **The cars** (18 Oct, after the sprites research): Pay 'n' Sprite's "JDM 90s pack" (itch.io, free, chosen by the
  owner): five pixel-art cars from behind and in front, each a body with its glass, interior, bumpers and spoilers as
  layers. On our road they read as the same flat-colour style, only with more detail, so the road stays as it is (the
  owner's idea of pixelating the whole road was tried at half resolution: the sky and hills looked fine, but the thin
  lane lines broke up and would flicker in motion). `tools/make_cars.py` puts the cars together from a local copy of
  the pack and writes `assets/cars.js` (39 kB with every part a layer, 13 kB gzipped): the pack's terms allow it in games but not passed on as
  a pack, so the pack itself never goes in the repo (CREDITS.md). Drawn with hard pixels as they come close and
  smoothed far off (no shimmer), 1.9 m across with their height from the art; each shade of paint repainted keeping
  its lightness, so one car makes every colour:
  - traffic: the five cars in the eight traffic colours, each in a dozen fittings from the pack's parts (the owner, 18
    Oct: "spice up the cars with random varieties"): half as they came, a third with a wing, the rest with one of
    its bumpers or body kits, front and back alike. 480 looks, still one draw on the traffic's dice a car; oncoming
    ones flash their headlights where the art has them;
  - police: white down to the glass and black below, a light bar on the roof;
  - racers: always kitted, each number its own bumper and wing, white with two red stripes, and the number on a
    roundel in a 3x5 pixel font once the race is revealed; your fleet black with gold stripes;
  - Fuel madness: a mad driver's own car, morphed (the owner: "morph them to become mad cars"): the same model, bumper
    and wing, the paint mostly rust (a quarter of its old colour left, so mad cars differ), a primer panel, rust holes
    with orange edges, one tail light out, bars over the rear window, and a bolted pipe bar with steel spikes along
    it and on the roof, shaded the pack's way (a lit side, a dark side). Oncoming traffic goes mad too (the owner, 18
    Oct: it had none): its front view in rust, bars over the windscreen, a spiked bull bar, one headlight out, and
    its high beams flashed from the one it has left. While you drive on its side it comes at you, steering for you
    until 1.2 s out as the police do, and won't swerve for a game of chicken; back on your side it leaves you be. A
    head-on with one isn't the end of the run (the owner, 18 Oct): a hard crash, most of your speed gone and a
    head-on's damage (50%, less the armour), and the mad car totalled for its double parts ("HEAD-ON!"). With a sane
    driver a head-on still ends it. `oncoming_test.py` checks it; `act4.py` to the tank: 13, 17, 12, 15 races (14.25 on
    average, as before it: 15, 15, 13, 14), Reckless auto-drive taking the oncoming lanes;
  - the indicator blinks over the outer half of each car's own tail light.
  The tank, palms and signs stay as they were.
- **Crashes:** hitting a slower car in your lane drops you to the lower of 35% of your speed and 40% of its speed.
  That's harsh on purpose, so you don't hit the same car again.
- **Traffic passes the way drivers do** (after the playtests of 15–18 Oct, where cars cut in just as you got there
  and pairs drove side by side):
  - only when 10 km/h or more quicker than the car ahead; otherwise it follows;
  - after a mirror check for anything closing on it within 4 s, you included (it used to be 20 m, under a second when
    you come up 80 km/h quicker);
  - with its indicator on for a second first (amber, with a glow so it reads on a phone), checking again before it
    moves.
  - `lanes_test.py` checks it: a steering player at 160–220 km/h met 12 cut-ins in 38 km before, none after; cars
    now change lanes about an eighth as often.

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
- **The car stereo** (Workshop, 500 m, the owner's idea): synthwave made on the spot with Web Audio, on four tapes
  (Neon Coast, Night Drive, Sunset Grid, Chrome Heart), each a song of its own (the owner, 18 Oct: the first tapes
  sounded too alike; they shared every sound, the groove and a 16-bar loop, had no melody, and differed only in key,
  tempo and the order of the same few chords). Written down as data, each tape has its own tempo and key, four
  chords, drum kit and groove, bass line, lead sound and hook, and a form of 93–115 s that brings the parts in and
  out: intro, verse, chorus, break, with a drum fill and a rising sweep into each chorus, and the hook an octave up
  the second time round.

  | Tape | Tempo | Key and chords | Groove | Bass | Lead |
  |---|---|---|---|---|---|
  | Neon Coast | 100 | A minor, i VI III VII | four on the floor, big snare | eighths with octaves | two detuned saws |
  | Night Drive | 84 | F# minor, i iv VI V | half-time, gated snare | rolling sixteenths, dark | soft square, reverb |
  | Sunset Grid | 112 | D major, I V vi IV | disco open hats, clap | syncopated square pluck | bell |
  | Chrome Heart | 124 | E minor, i VII VI VII | sixteenth hats, tight snare | hard sixteenths | square in octaves |

  **The War Rig radio** (War Rig page; the owner's idea and pick, 18 Oct: both styles) swaps in four tapes of its own,
  original riffs written down the same way, with new sounds: a fuzz (a waveshaper and a speaker's top end) for guitars
  and darksynth's bass and leads, power chords (palm-muted chugs and chords let ring), war drums (low and high), and
  lead notes that slide up into themselves, a wail.

  | Tape | Tempo | Key and chords | What it is |
  |---|---|---|---|
  | War Drums | 90 | D minor with a flat second, i bII i VII | war drums, chugging fuzz guitar, a wailing lead |
  | Iron Convoy | 106 | E minor, i VI VII i | a galloping guitar riff, tom fills, a guitar-like lead |
  | No Law | 132 | C minor, i VI VII i | darksynth: fuzz bass in sixteenths, a harsh square lead, an arpeggio |
  | Black Sun | 118 | B minor, i VII VI V | darksynth: pumping offbeat fuzz bass, a wailing saw lead |

  Its switch off, the stereo plays synthwave again (the same slot). Rendered offline, the war choruses peak at 0.41 at
  most and sit about 2 dB above the synthwave ones (the fuzz and the war drums were turned down to get there).
  The echo on the arpeggio and lead is a dotted eighth at the tape's tempo (it had no delay time set, so it was a
  3 ms comb). Rendered offline, every chorus peaks at 0.39 at most and they sit within 3 dB of each other. Whether
  they sound good is the owner's ear: the tests can only show they differ. A row of lights in the cluster's
  hood jumps with the beat (on the phone that is all there is: the dash is full); on a desktop a head unit in the dash,
  left of the cluster, shows the tape and an 8-band equaliser. A tap on the lights or the head unit's TAPE button (or
  M) plays the next tape, and after the last it goes off: the lights and the head unit stay, greyed ("OFF"), and a tap
  plays the first tape again (the owner, 14 Oct: it used to vanish). The garage's ON/OFF is the same switch. Distance
  only. It
  plays about 6 dB under the engine at 4,000 rpm. (Claude's calls: generated rather than recorded, since no music
  site was reachable from the build; the tapes and the controls.)
- The run's time left is a bar draining across the widened rear-view mirror. It turns red and blinks under 5 s.
- Nitro is a smaller red NOS pedal bolted over the gas pedal's top right corner, like a side pedal (the owner's
  design). Pushing it floors the gas, and N does the same. The tank shows as a NOS bar under TEMP on the cluster. It
  replaced a red NOS button, which floated over the oncoming lanes on phones.
  - It sticks out past the gas pedal by no more than the gap kept clear of the screen's edge, and covers only the gas
    pedal's corner (4–8% of its touch area), so a thumb on the gas doesn't fire nitro by accident.

**Menus** (the owner's design, 14 Oct, for playtests): Rev It is an incremental game (Distance) with side gigs.
- **Main menu:** CONTINUE (NEW GAME without a save; a green tick once the tank is beaten, and it plays on), STATS (once
  a game has started), SETTINGS, ARCADE (the other games, with the engine pick and their bests), and a small credits
  link in a corner. On a phone the buttons sit two to a row, so every screen fits without scrolling.
- **Pause menu** (Esc, ☰, or leaving the app; the game is paused): RESUME, HOW TO DRIVE, END RUN (a Distance run, after
  "are you sure?": as if the time ran out, so it can't be farmed; in a tank race that is a lost fight), EXIT TO MAIN
  MENU (the game stays paused behind it, and CONTINUE goes back to it).
- **SETTINGS:** layout, the car's sounds and the music (each a volume), HOW TO DRIVE, and RESET PROGRESS in red, bottom
  right, once a game has started (moved here from the main menu: one tap from wiping a game is too close).
- **STATS:** time played, runs, best run, distance driven; races and best place only after the reveal, the fleet and
  cars totalled only once their acts open, tanks beaten once one is; never a word of the race before the reveal.
  SHARE sends them (and the build: when the page was published) by the phone's share sheet, else the clipboard.
- **The win screen** follows GAME OVER: congratulations, the stats, SHARE, NEW GAME (after "are you sure?") and EXIT TO
  MAIN MENU.
- **How to drive:** before the first run the garage says how to get going (start, clutch, 1st, gas); the full controls
  are under HOW TO DRIVE in the pause menu and the settings. The key help that sat at the foot of a desktop screen
  went there too.
- **Stuck at the line:** standing still for 1.5 s in a run, or stalled, the windscreen's read-out says the next step
  until the car moves, in the words of the layout: START THE ENGINE (the key, or Enter), CLUTCH DOWN, INTO 1ST, GAS,
  CLUTCH UP; nothing for a step an aid does. For the whole game, not just the first runs: it costs an expert nothing
  (18 Oct: one playtester couldn't get off the start line for three runs; another skipped the first run's text).
- **Credits:** a screen with the sound credits; CC BY 4.0 needs the credit given in a reasonable manner, not on screen
  all the time, so the credit line in play went.
- Claude's calls: the first-run help in the garage rather than a pop-up before it (DRIVE stays one tap away), the
  build in STATS, END RUN's rules, EXIT TO MAIN MENU keeping the run paused, and the stats themselves.

## Distance

An incremental game. Each run is timed, every metre driven is banked, and metres buy upgrades in the garage between
runs. A hidden race is the second act.

**Each act's fantasy** (the owner, 18 Oct): act 1 is driving a car by hand; act 2 is switching lanes and enjoying the
speed; act 3 is a collect-a-thon, the weakest fantasy; act 4 is the strongest switch, the war theme with the tank at
the end. So there is no reward for shifting well by hand (a perfect-shift bonus was proposed and turned down): manual
driving is act 1's game, and the robot takes over as the fantasy moves on.

### Act 1: build the car

- **Runs:** 20 s, plus 5 s per Time level (50 s at most).
- **The garage's pages:** **Workshop** (the car itself) and **Autopilot** (the robot driver), paid in metres; the
  **Black market** (the illegal and forbidden, paid in race points) opens with the reveal. The price is
  `base × growth^level`, rounded to tens of metres.
  - A locked upgrade (none of it bought, something else needed first) shows only its name and what it needs, in a
    dimmed, dashed card: what it does stays a surprise. A tab with an upgrade newly unlocked that you haven't looked at
    yet has a yellow ! until you open it (the owner's list, 14 Oct; what you've seen is kept in the save). Nothing on
    a page that isn't open yet counts, so neither gives the race away.

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
    traction control carries on, but autocruise neither brakes nor lifts (the owner, 14 Oct: with every aid on, NOS
    should go). Reckless auto-drive's own nitro leaves autocruise as it is.
  - With an ECU tune they rev into it in every gear while the engine is cool: the factory map from heat 0.6, until it
    has cooled below 0.4. Your foot on the gas, or nitro, take the tuned map whatever the heat.
  - Autocruise:
    - picks the lane that goes further and keeps right;
    - brakes behind traffic it can't pass: for the first car you would hit, not one already moving out of your lane,
      and nothing while that one is a car to ram (Hunter's, or a mad driver's cut-in with a bull bar: the ram slows
      you to its speed). It braked for the car beyond the one Hunter was ramming (the owner, 18 Oct: it "slowed down
      instead");
    - overtakes a racer by moving over behind an ordinary car that Auto flash can move out of the way;
    - never drives in the oncoming lanes (Reckless auto-drive does).
  - Reckless auto-drive (Black market) is autocruise without manners:
    - boxed in on your side, it takes the near oncoming lane when nothing is coming for 6 s, or when whatever comes
      can be flashed away (Game of chicken and a flash left);
    - it goes home when something it can't flash away comes within 3.5 s, or when your side opens again. It cuts in
      beside a car only to escape a head-on under 2 s away: a bump beats a DNF;
    - while the tank is on the road it keeps to your side and goes home as soon as it can: the tank can't be passed
      (the owner, 14 Oct, after the simulations lost tank fights to head-ons);
    - it pushes the nitro pedal when a racer is within 500 m ahead, the tyres grip, it is in 2nd or higher and isn't
      braking.
  - Auto flash only flashes a car that will move over, never a racer, nor the car in the War Rig's reticle (that one is
    to be rammed; the owner, 14 Oct: it flashed the targets away). It flashes under 4 s away, or as soon as autocruise
    starts braking for the car: closing at 150-190 km/h in act 4, autocruise braked from about 5 s out, and the gap it
    kept never came within 4 s (the owner, 18 Oct: it "stopped using the flash and slowed down instead"). An act 4
    run on Reckless auto-drive with Hunter and Fuel madness braked 3.6 s a race instead of 7.3 (6 races, same seeds),
    with as many rear-ends as before (3). The simulations, against the code before: `act2.py` P1 after 14, 20, 15,
    18, 13, 20, 16, 16 races (16.5 on average; before 16.0, two seeds slower by 3 and 1: the flashes go sooner, so
    fewer are left for the last pass on #1), `act3.py` the same, `act4.py` the tank in 14, 15, 12, 13 (before 13, 17,
    12, 15). With Game of chicken it plays chicken too: in
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
  16 and 22; the simulated player spends every metre, including on flashes that add no distance. Flash recharge, on
  sale from the start, made it later: it took the metres the car needed and counts nothing towards the head start. So
  it goes on sale with the reveal, and its card isn't shown before (Claude's call).
- **Rechecked in the balancing pass (14 Oct),** four traffic seeds each: run 18, 20, 19, 27 (value) and 28, 26, 26, 23
  (cheapest-first), on target, so the head start is unchanged. The 22 and 33 measured earlier that day were the
  simulation's fault: since the garage split into pages it had skipped the Autopilot page's aids, which are paid in
  metres and count towards the head start (the 12 Oct code gives 22 and 20 with the same bot).
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

**Black market** (paid in race points, 5,761 in all):

| Upgrade | Levels | Base | Growth | Notes |
|---|---|---|---|---|
| Bribe the starter (grid) | up to 100 | 1 | 1.035 | slot N needs a finish ahead of #N |
| Reckless driving | 1 | 100 | | oncoming lanes; from now on collisions damage the car |
| Game of chicken | 1 | 75 | | flashes work on oncoming cars: they swerve, room permitting; needs Headlight flash |
| Reckless auto-drive | 1 | 600 | | autocruise in the oncoming lanes too, with chicken, the tune and nitro; needs Autocruise, on sale once 7th gear is bought (18 Oct: a playtester spent the points on it instead of 7th gear, which the top 10 need; it adds no pace; `act2.py`: P1 after 24, 22, 20, 20 races, unchanged, with 7th gear bought in the race P1 came) |
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
before each run at 100 m per second of nitro. The NOS pedal floors the gas, and while you push it autocruise neither
brakes nor lifts; Auto gas's traction control still trims it, so nitro doesn't spin the tyres in the middle gears.

### Act 3: the fleet

**The Fleet** opens with your first win (P1), and never shows before it. The garage says so after that race: "the
racers you beat are open to offers". It is a garage page paid in **miles**.
- **The Exchange** card turns metres into miles, one way, a mile for 1,609 m: a slider for how many, an "all
  available" button, and the miles you have. Miles show in the garage's header too. The speedometer stays in km/h.
- **Pay off a racer:** each one you pay off joins your fleet. It keeps its number, its slot in the 100-car field and
  its pace, in your colours (black with gold stripes).
  - The slowest go first (#100, then #99 ...), from 1 mi, each 3.5% dearer: about 6 mi for the 51st, about 137 mi
    for the first 51 (6% dearer, 308 mi, until 18 Oct: the owner wanted the act down from about 25 races to 15).
    #1 won't sell.
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

### Act 4: the War Rig

**The name** (the owner, 18 Oct; Mad Max before, a trademark): War Rig. It is the tanker in *Mad Max: Fury
Road*, and the nod is wanted: an apocalypse turning ordinary people into savages. The owner: it isn't a registered
trademark. The page opens with an outlaw's line: "No law out here any more. The gang is yours, and your
car becomes a war rig."

**The gang:** once 51 of the 100 race for you, your fleet is a gang. The garage gives its first job: total a car. The
windscreen gains an **AR layer** (red, like a gunsight): a reticle round the nearest car ahead going your way, its
health bar above it, and "TOTAL IT" until the first job is done (a racer's number after). It stays on that car while
it is within the guns' reach (200 m) until you pass it or total it, then moves to the next; further up the road it
takes the nearest car ahead. Each race starts afresh (14 Oct fix: the reticle kept last race's car, out of sight
on the horizon, and the guns would fire at nothing else).
- **Damage:** a ram is a hit, 34 off the car's health: 100 for traffic, 150 for a racer, 200 for the police, so 3, 5
  and 6 hits; with a full bull bar (3 times a hit) 1, 2 and 2 (the owner's numbers, 14 Oct). From behind, a bump
  closing at under 30 km/h is only a nudge, and one at over 200 km/h totals the car at once: "OHKO!" (the owner's
  idea). A side-swipe always counts. A head-on is still your DNF, not a total. Your fleet cars can't be hurt. (It used
  to be 0.4 of the closing speed in km/h a ram: the simulations rammed at 130–300 km/h, so one ram often did it.)
- **Totalled** at 0 health, a car skids onto the right shoulder, tipped and smoking, and stops; you collect its parts
  (22 from traffic, 55 from a racer: see the balance results). A totalled rival is out of the race and you move up;
  results still pay by finishing position only, so wrecking can't be farmed for points.
- **The War Rig page** opens with the first total, paid in parts. It is to the Fleet what the Black market is to the
  Workshop.

  | Upgrade | Levels | Base | Growth | Notes |
  |---|---|---|---|---|
  | Bull bar | 3 | 20 | 2.5 | a hit counts 2/3 more a level (3 times at 3); you keep more speed (at 3, you carry on at the car's speed); the gang side-swipes rivals |
  | Armour plating | 3 | 30 | 2.5 | collisions do 25% less damage to your car a level |
  | Spiked hubs | 1 | 150 | | a side-swipe (into a car while moving over) costs you no speed and counts one more hit; the gang's 30 more damage |
  | Guns | 3 | 400 | 2 | needs Spiked hubs: 6 damage a shot a level, 4 shots a second, up to 200 m; the gang fires too |
  | Auto gun | 1 | 200 | | needs Guns: fires for you while the reticle's car is in reach and in sight; the marker reads AUTO; ON/OFF in the garage |
  | Fuel madness | 4 | 30 | 2.5 | 25% of ordinary drivers mad a level, 90% at the top: rusty, weaving, no mirror check or indicator, and each jumps in front of you once; ram one that cut in and it's totalled; a mad car pays double parts; ON/OFF in the garage |
  | War Rig radio | 1 | 100 | | needs the Car stereo: it plays the War Rig's own four tapes instead of synthwave; ON/OFF in the garage |
  | Hunter | 1 | 100 | | needs Autocruise: it hunts the car in the reticle, into its lane and into it (not the tank; it backs off past 60% damage); ON/OFF in the garage |
  | Hunting pack | 1 | 150 | | fleet cars hunt as you do: the nearest car ahead of each, within 150 m, into its lane and into it; their guns on it too |

- **Bad drivers** (the owner's idea, 18 Oct): the playtesters hated cars cutting in (fixed: traffic passes the way
  drivers do), but in the War Rig a car jumping in front of you is a ram, worth parts and heat. Bought, ordinary
  traffic goes back to the old manners: no mirror check, no indicator, out whenever it is quicker than the car ahead
  (racers and your fleet keep theirs). A switch, like the aids. Through the game interface's `badDrivers()`, so the
  road stays the same for every other game.
  With a bull bar fitted, the aids take the ram of a car that has just cut in (for 3 s): lane assist doesn't swerve
  round it, autocruise doesn't brake for it or count it as a blocked lane (the owner, 18 Oct: as first built, the aids
  avoided the cut-ins, so it changed nothing in `act4.py`: the tank in races 25, 24, 23, 28 with it, 23, 24, 23, 23
  without). Taking those rams cost more than it paid (a ram costs speed and damage, and paid a third of a total: 26,
  27, 24, 25 with it), so a car that cut in and gets rammed is totalled on the spot, full parts and heat: "HAD IT
  COMING!" (the owner's pick, 18 Oct). That changed nothing either (3.65 totals a race with it, 3.67 without): a bad
  driver only pulled out when stuck behind a slower car, and at act 4's speeds you were past before that lined up. So,
  in the owner's words, they now "jump in front of the player": a bad driver in your other lane, as you close on it
  from 0.8 to 2 s behind, swerves across into your lane, briskly, about one car in two, once each. `lanes_test.py`:
  11 cut-ins in 16 km at 160 km/h.
- **Fuel madness** (the owner, 18 Oct: Bad drivers renamed for the wasteland, "fuel psychosis" made "madness"; and a
  scale, so only some drivers go mad): 25% of ordinary drivers a level, picked by the order they came
  onto the road (golden-ratio steps of their serial: an even spread, and no draw on the traffic's seeded dice, so
  every other game's road is as it was). A mad driver drives as a bad driver did, without its indicator even as it
  swerves, and always jumps in front of you once when it lines up; the sane ones keep their manners, so the road
  reads. `lanes_test.py` at 160 km/h, 16 km: 3 cut-ins at 25%, 14 at 50% (about Bad drivers' 11), 14 at 75%, 22 at
  90%; no sane driver changes lanes without its indicator. Through the game interface's `madness()` (the share).
  The top level is 90%, not 100% (the owner: "there should be still an occasional sane person").
  - **The tell** (the owner left it to Claude): rust for paint (three shades), the right tail light dead, rust holes,
    and a weave in its lane (0.3 m, about every 1.6 s), drawn only: its place on the road stays put. And, the owner's
    addition, bars and spikes: bars welded over the rear window, a pipe bar across the back, and steel spikes on the
    roof and along the bar. The paint and the weave read from afar on a phone; the rest close up. The card shows the
    next level and, once bought, the switch beside it.
  - **Stolen fuel: double parts.** As first built (60 parts, 2.5 times a level), buying it made act 4 longer: mad
    drivers added about half a total a race (3.0 to 3.5), some 11 parts, while the levels cost hundreds and put the
    guns off. `act4.py`, four seeds each:

    | Variant | Tank beaten in race |
    |---|---|
    | never bought | 16, 16, 16, 16 |
    | 60 parts, ×2.5 (to 100%; capped at 75%: 18, 19, 18, 20) | 18, 19, 18, 21 |
    | 60 parts, ×2 | 17, 20, 19, 22 |
    | 30 parts, ×2 | 18, 19, 18, 20 |
    | 30 parts, ×2.5 | 16, 19, 16, 18 |
    | double parts for a mad car, 60 parts, ×2.5 | 17, 17, 16, 20 |
    | double parts, 30 parts, ×2 | 15, 17, 14, 15 |
    | **double parts, 30 parts, ×2.5** | **15, 16, 13, 15** |

    The owner's pick: a mad car carries stolen fuel and pays double parts when totalled (44, "+44 PARTS"), however it
    is totalled; the heat is a car's. 30 parts, 2.5 times a level (30, 75, 188, 469). Bought, act 4 is back at about
    15 races and quicker than without it, as an incremental game's purchases should be; and the rusty cars are the
    ones to hunt. The cap made no difference to the simulation: the top level costs more than the guns, so it comes
    after the tank. As built (90% at the top): the tank in races 15, 15, 13, 14, the bot at 75% by then.
- **Hunter** (the owner's idea, 18 Oct: "an auto driver that hunts down cars"): autocruise hunts the car in the
  reticle, going your way: it moves into that car's lane and drives into it, without braking or swerving for it
  (autocruise leaves the lanes to it meanwhile, or its keep-right habit pulled it off the prey's lane; Reckless
  auto-drive keeps to your side). From as far as the reticle takes it (300 m): it hunted within 150 m at first, so
  autocruise steered round the car before that and Hunter swung back into its lane (the owner, 18 Oct: it "changes
  lanes to avoid traffic"). Nor do the aids steer round or brake for a wreck, which can't be hit and skids off: they
  swerved round each car Hunter had just totalled; and the reticle moves on the moment its car is totalled (for a
  frame Hunter had nothing to hunt, and autocruise steered away from the car it would hunt next). An act 4 run on
  Reckless auto-drive (6 races, same seeds): lane changes other than Hunter's 0-3 a race (keep-right with nothing in
  reach, backing off past 60% damage), from 3-7; about as many cars totalled (60, 64 before), about a tenth less road
  a race (it stays behind its prey rather than passing in the oncoming lane: Hunter is a switch). `act4.py`: the tank
  in races 14, 16, 13, 14 (14, 15, 12, 13 before). Not the tank (the guns are for that), not an oncoming car, and not
  past 60% damage, so it doesn't wreck you; your hand on the wheel overrides it. It is what `act4.py`'s bot did by
  hand, so the simulation now leaves the hunting to the aid once it has it. `hunter_test.py` checks all of it.
- **Hunting pack** (the owner, 18 Oct: "Fleet should have an attack upgrade so they hunt just like you"; on the War
  Rig page, paid in parts, and hunting "like you: anything", both the owner's picks): each fleet car hunts the nearest
  car ahead of it going your way within 150 m, rivals and traffic alike (police too; not the tank, whose fight has the
  gang alongside it). It moves into that car's lane, room permitting, and drives into it without passing it or backing
  off: a ram is a hit as yours are (34, the bull bar counting), every 1.5 s at most, and it falls back 4 m/s. Its guns,
  if any, fire on its prey too. It never moves into your lane in front of you (it gives way first, as ever). The
  totals are yours: parts (double for a mad driver) and the gang's heat, with "THE GANG TOTALLED A CAR" (or the
  racer's number, or A POLICE CAR) on the head-up display. A fleet car looks for prey twice a second, the whole road
  for half the field being a lot of looking. `pack_test.py` checks it.
- **The kit shows on your car** (the owner, 18 Oct), drawn in the cockpit's frame as bought, each part from its level
  up: armour as riveted plates up the A-pillars, then a visor under the roof (clear of the mirror), then slats; the
  bull bar's hoop over the bonnet's front edge, then uprights, then spikes; twin guns on the bonnet aimed down the
  road (the tracers leave their muzzles), then cooling jackets, then a second barrel each side; red lamps on the guns
  while Auto gun is on. Spiked hubs can't be seen from the seat. Placed to show either side of the cluster and above
  the shifter on the phone (checked at 844x390 and 1440x900); Distance only.

- **Guns,** last: the red marker at the top of the steering wheel becomes the trigger, with FIRE written on it (G on
  the keyboard). Held, it fires 4 shots a second from twin guns on the bonnet at the car in the reticle, if it is
  within 200 m and in sight; yellow tracers and a muzzle flash show each shot, and a miss goes off into the distance.
  The gang fires too: a fleet car shoots a rival up to 80 m ahead of it (or beside it) once a second. Before guns the
  marker is just part of the rim.
- **Auto gun** (the owner's idea, 14 Oct; Claude's calls: the price, AUTO on the marker): it holds the trigger for
  you, only while the reticle's car is within reach and in sight, so no shot (and no heat) is wasted. On a phone your
  thumbs are busy. Your own trigger still works.

- **The gang uses whatever it has.** With a bull bar a fleet car side-swipes a rival beside it, every 3 s at most (20
  damage a level): it lurches across, then drives back into its lane. What it totals pays you the parts, and the rival
  is out of the race. Ramming hurts your own car (2–25% a bump), so armour is the "illegal part" that makes a
  campaign of it possible.

**Police heat** (`progress.wanted`, 0 to 100%) shows on a **police scanner** bolted to the right A-pillar, opposite
the sonar: an LCD ("HEAT 37%", "PURSUIT" while police are on the road), ten lights from green to red, and a red and blue
lamp. It shows from the War Rig act on, only on the road; the garage's report gives it too.
- **It rises** with every total: 2.2% for traffic, 3.3% for a racer, 8.8% for a police car, 1.1% for one the gang
  totals; and 0.025% a shot (see the balance results). Nothing brings it down: it stays between races and can't be
  bribed down.
- **Police come with it:** one every 30 s when barely wanted, down to every 6 s at the top (the first one a run after
  that wait), two on the road at most. They never come at you from behind (there is no rear view):
  - from behind they come past you in your other lane, 20 m/s quicker, cut into your lane 30 m ahead and brake hard
    for 2.5 s, then drive off up the road;
  - while you drive in the oncoming lanes one comes at you head-on, flat out (to 250 km/h), steering for you until 1.2 s
    out, so you can still get out of its way. A head-on is a DNF.
  - They don't move over for a flash, nor swerve for chicken. They can be totalled (8.8% heat).
- Claude's calls: the heat rates, the police numbers and moves, and the scanner on the right A-pillar instead of the
  dash (on a phone the dash is full: shifter, cluster and pedals).

**The final boss, the tank.** At 100% heat the garage warns that the army has sent a tank, and the next race has it
(not in limp mode). It waits until you have guns: rams alone can't beat it, so unarmed it was a sure DNF that halved
the heat. Till then the garage says "the army has a tank ready for when you are armed".
- It comes into view 250 m up the road and holds the road about 80 m ahead of you, in your lane: you can't get away
  from it or past it. It is the AR target ("TANK"), with 1,000 health.
- It fires a shell at you every 2.5 s while you are within 250 m behind it: 8% damage a hit (armour takes a quarter
  off a level), with the shot, a jolt and the cracks to show it.
- You and the gang outgun it: your guns, and the fleet's, which race up to join the fight (40 m/s quicker until
  they are with it) and shoot it from within 200 m. A ram does a fifth of its usual damage.
- **Destroyed:** the ending. GAME OVER on the head-up display ("the road is yours") and the run stops there, held for
  4 s (the owner, 14 Oct: that's the end state). The garage: "GAME OVER. You beat the tank: the road is yours", 300
  parts, the heat back to 0. You can still play on, the next tank half as tough again (1,500, then 2,000 ...), until
  the menus are talked about.
- **Lost** (wrecked, a head-on, or the bell with the tank still going): a DNF ("the tank held the road"), and the heat
  drops to half, so you have to push for it again.
- Claude's calls: the tank stayed (the owner's pick; it fits the army being called in when the police can't cope), its
  numbers, the ending as a garage message rather than a screen of its own, and play on with a tougher tank.
- Claude's calls: the AR look, the target rule, the hit (34) and the nudge (30 km/h), the parts numbers, the War Rig page opening
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
- **The balancing pass (14 Oct).** The owner's targets: about 25 races for each of acts 3 and 4. The method follows
  incremental-game practice ([the math of idle games](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i):
  prices grow geometrically, income grows as you buy; the first purchases come quickly and there are no long dry
  spells). Every simulation now draws each race's traffic from a seed of its own, set in the same call as the race
  (the page's own loop drew on it between calls, so results moved with the machine's load); four seeds each.
  - Act 1: on target, unchanged (see the hidden race). Act 2: P1 after 24, 22, 21, 23 races, unchanged.
  - Act 3: 51 fleet cars after 26, 28, 27, 26 races, a fleet car or two bought every race. Unchanged: within 10%.
  - Act 4 (`act4.py`): the first guesses took 31–36 races, mostly because the reticle stayed on last race's car (fixed
    the same day). Without that, they took 15–16, the heat sat at 100% for races before guns were affordable, and one
    level of guns could never beat the 2,000-health tank (854 short at the bell every time; at 1,200, 54 short).
    Chosen: War Rig prices 2–3 times the guesses, heat at half, the tank at 1,000 health and waiting for guns. Eight
    runs: the tank beaten after 22–34 races (median 24.5), at the first go in six. War Rig purchases every 1–4
    races up to the spiked hubs, then a 5–6 race save for the guns (fleet cars still bought every race); the heat
    reaches 100% about 3 races before the guns. The two runs that took longest lost tank fights to head-ons: boxed
    in behind the tank, Reckless auto-drive took the oncoming lane, though the tank can't be passed (it no longer
    does).
  - The bot fires all race long. A player who doesn't (no Auto gun) can lose the first fight and come back with
    the second level of guns.
  - Rams as hits, with OHKO (14 Oct, the owner's numbers): act 4 after 23, 21, 27, 25 races with the prices above,
    the tank beaten at the first go every time; act 2 after 24, 22, 20, 20 with Game of chicken at 75 points.
  - Reckless auto-drive: the owner asked for about Autocruise's price times 1.5 (1,200 points in effort), but that put
    the Black market at 6,360 points against the ~5,200 act 2 pays (10 a race after P1), so a buyer would go without
    nitro or 7th gear for about 115 races. 600 (the owner's pick): the dearest item with 7th gear, the market 5,761.
    Act 2 then: P1 after 24, 22, 21, 19 races, Reckless auto-drive bought along the way (races 12–22).
- **After the traffic fix (18 Oct),** same seeds: fewer crashes everywhere, so the first three acts went quicker and
  act 4 slower (traffic no longer cuts in front of the bot to be rammed: about 3 totals a race instead of 4, so the
  heat and the parts for guns come later).
  - Act 1: #100 first passed on run 17, 18, 18, 19 (value) and 22, 21, 21, 23 (cheapest-first): on target, and less
    spread. Act 2: P1 after 16, 17, 14, 17 races (was 19–24), with 43–47k metres in the bank (was 50–61k). Act 3:
    51 fleet cars after 26, 24, 25, 26. Act 4: the tank beaten in races 28, 30, 26, 29 (was 21–27).
  - `cruise.py`, 24 runs: autocruise 2,881 m a run (was 2,451), 20 crashes (was 35), 32% of the run on the brake
    (was 29%); Reckless auto-drive 2,975 m (was 2,577), 20 crashes (was 36), 32% (was 28%).
  - Acts 3 and 4 are retuned after the brakes change (act 3 to about 15 races, act 4 back to about 25). Act 2 has no
    target of its own; it is left shorter unless the owner wants it back.
- **Acts 3 and 4 retuned (18 Oct),** after the traffic and brakes fixes. The owner's targets: act 3 about 15 races
  (it was 25; the Fleet is the weakest act), act 4 still about 25. `act3.py` now starts from the 44k metres act 2
  leaves (40–47k; it was 57k) and takes overrides like `act4.py`.
  - Act 3, by how much dearer each racer is: 6% 27–28 races, 5% 22, 4% 16–18, 3.5% 16, 14, 16, 15, 3% 12–13. Chosen:
    3.5%; a race still buys two to five racers.
  - Act 4 took 28–30 races at 6% (traffic no longer cuts in front of the bot to be rammed: about 3.3 totals a race,
    was 3.8). Scaling the parts and heat a total up 10–30% gave 20–27 at 6%; but with the Fleet at 3.5%, act 4's
    fleet grows to its 99 cars and the bigger gang totals more, so the old numbers already give 24, 25, 23, 23 (10%
    more: 20–23). Parts and heat are unchanged.
- **Act 4 to about 15 races (18 Oct),** the owner's target for acts 3 and 4 alike. With Bad drivers and Hunter on the
  War Rig page (the bot buys both, cheapest first), the old numbers took 29, 30, 25, 28 races to beat the tank. Parts
  and heat a total scaled up together (a shot's heat unchanged), four seeds each:

  | Parts and heat | Tank beaten in race |
  |---|---|
  | as before (10 a car) | 29, 30, 25, 28 |
  | ×1.4 | 20, 21, 19, 21 |
  | ×1.6 | 20, 20, 19, 22 |
  | ×1.8 | 19, 16, 16, 19 |
  | ×2.0 | 16, 17, 15, 17 |
  | ×2.2 | 15, 15, 15, 17 |
  | ×2.4 | 15, 15, 14, 16 |

  Chosen: ×2.2, 22 parts a car and 55 a racer, the heat 2.2% a car. A War Rig upgrade every one to four races, the
  heat at 100% one to three races before the guns, and the tank beaten at the first go every time. The prices are as
  they were: income grows, so everything comes sooner, in the same order.
- **Simulation tools** live in `tests/balance/` and are run from the repo root:
  - `act1.py [cheapest|value] [head-start curve or -] [traffic]`: when #100 is first passed;
  - `act2.py [races] [seed]`: races from the reveal to P1, the bot driving like Reckless auto-drive (`aids.js`). The
    traffic seed alone moves the result by up to 7 races, so compare a few seeds;
  - `act3.py [races] [seed] [order|cheapest]`: races from the first win to 51 fleet cars, buying the Fleet's upgrades;
  - `act4.py [races] [seed] [overrides]`: races from the gang to beating the tank, the bot ramming the reticle's car
    and holding the trigger; the overrides are JavaScript to try other numbers (`"TANK.hp = 1200"`);
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
  - Not kept: not proven, and the owner dropped it (14 Oct).
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
- **14 Oct, desktop:** the guns locked on to something far on the horizon, so nothing else could be shot until it was
  reached: last race's car, kept in the reticle (fixed). With all the aids on, the NOS pedal didn't stop autocruise
  lifting off the gas. In Mad Max, Auto flash flashed the targets out of the way. Beating the tank should be GAME
  OVER and stop the run: the end state (menus to be talked about later).
- **15–18 Oct, the friends' playtest** (the 14 Oct build; six players from 29 min to 2 h, from act 2 to the tank,
  feedback through the menu's SHARE and in person):
  - Most failed runs were a car cutting in at the last moment, too fast to do anything about; two cars side by side
    ahead meant a crash (fixed: see "Traffic passes the way drivers do"). The brakes could do more; is the brake
    even worth using in a timed run?
  - Too complicated at first: one couldn't get off the start line for three runs, another skipped the first run's
    text. One asked for a tutorial for the hidden features; others named the surprises (the Black market, the acts
    that open later) as the best part.
  - One liked it more before buying the whole Autopilot; another's favourite upgrade was Auto shift. One regretted
    spending race points on Reckless auto-drive instead of 7th gear. Autocruise drives too timidly (nicknamed after a
    famous slow co-driver).
  - The Fleet felt slow: full races to push through before driving mattered again in Mad Max.
  - Liked: the synthwave mood, the boxer's sound, shifting as a skill ("TIL my gear shifting is not efficient"). One
    expected the turbo to flutter on lift-off ("stututu").
  - The owner: the stereo's tapes sound too alike; Mad Max needs a name of its own; guns and armour should show.
- **Decided (18 Oct), to build in this order, a PR each:** traffic (done above); brakes limited by tyre grip, not a
  new upgrade; act 3 down to about 15 races (from 25); prompts on the windscreen for getting off the line; Reckless
  auto-drive only after 7th gear; turbo flutter; tapes that differ in hook, groove, sounds, chords and form; the
  bonnet with the weapons on it in view; the fourth act's new name. Then a research round on nicer sprites (with
  what they add to the download). Not now: a perfect-shift reward (see each act's fantasy, under Distance), a
  tutorial beyond the first runs (the surprises are the point), a port to an engine such as Godot (the web build
  stays; Steam and the app stores take a wrapped web game, consoles would need an engine).

## Open questions

Waiting for the owner. Don't build these on a guess: ask.

- None right now.

## Known issues (won't fix)

Closed by the owner, so don't reopen them without asking.

- **Speed signs is too easy** (14 Oct: one game mode balanced at a time, and that is Distance; it stays as it is).

## Brainstorm waiting for the owner's picks

The owner asked for ideas on the fleet, sinks for the surplus metres and future acts: keep the car theme and the
hands-on driving, and extreme ideas are welcome. The fleet, miles and police heat are now decided (phase 3, above);
these proposals are still open.

- **Metres sinks** (the miles exchange is one now):
  - repairs that scale with the car's value;
  - tyres as a per-race consumable;
  - cockpit cosmetics;
  - an escalating metres-to-points exchange.
- **Acts after the War Rig:**
  - Cannonball run across the country (its police heat went into phase 3).
  - Manufacturer: the Rev game returns as dyno engine design, and the traffic becomes your cars.
  - Extreme: land speed records, then a road off the planet.
  - Then a new game plus, with a legacy bonus.
