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
    head-on's damage (50%, less the armour), and the mad car totalled for its double scrap ("HEAD-ON!"). With a sane
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
- On the left in both layouts (the owner, 23 Oct: on a desktop it was right of the wheel, under the key, "on the wrong
  side"). On a desktop it sits below the stereo, its right edge at 17vw, clear of the stereo and the light stalk at any
  window shape; the key stays right of the wheel.
  - The owner's reason: the left is much the better interface, and here that beats keeping it diegetic. The car
    drives on the right with the driver left of centre, a left-hand-drive car, whose lever would be on the right; don't
    move it back for realism.
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
- **The car stereo** (Workshop, 500 m, the owner's idea): recorded tapes, picked by the owner (18 Oct). It was
  synthwave made on the spot with Web Audio, eight songs written down as data; the owner found it "not really good",
  and making it kept 11-21% of a phone core busy while it played (the phone ran hot). The research (no music site
  was reachable from the build, only copies on GitHub) shortlisted CC0 and CC BY tracks; the owner listened and
  picked three of Kevin MacLeod's (CC BY 4.0) for synthwave and, finding none that suited the War Rig, made five with
  Suno on its free plan: two more for synthwave and three for the War Rig radio.

  | Radio | Tapes, in order |
  |---|---|
  | Synthwave | Neon Laser Horizon (the owner's favourite), Neon Outrun, Chill Wave, Chasing the Light (光の追跡), Newer Wave |
  | War Rig (War Rig page) | War Rigs Rolling (sung), Ember Charge (余烬冲锋), War Rigs of the Wasteland (sung) |

  Kevin MacLeod's alternate with the owner's on the synthwave radio, and the Suno songs' Chinese and Japanese titles
  are in English on the head unit (Claude's calls). Suno's free plan: Suno owns the songs and they may be used only
  non-commercially, so Rev It, free, plays them, but they are not under the repository's MIT licence and would have
  to go if the game ever earned money (`CREDITS.md`; the owner agreed, 18 Oct). `tools/make_music.py` makes
  `assets/music`: Kevin MacLeod's fetched (from incompetech, or a copy on GitHub that must match the original's
  SHA-256), the owner's from the folder they were downloaded to; each levelled to -16 LUFS, the bass under 70 Hz
  rolled off (the engine has the low end; Suno's songs were mastered loud, with much of it at 50-150 Hz) and encoded as
  a 96 kbps MP3 (the one format every iPhone plays): 2.1-3.8 MB a tape, 21 MB in all. A tape plays through an <audio>
  element into the audio graph, so the volume slider and the lights work as before, at the old tapes' level on
  average (about 6 dB under the engine at 4,000 rpm); at its end the next one plays, round to the first. Downloaded
  ahead, never all at once (the owner, 18 Oct: load the music in the main menu, so it doesn't stop the flow; 21 MB
  over a phone's data on every first visit was too much for tapes mostly not played): the save's tape while the main
  menu is up, the next one while a tape plays, so a tap changes tapes at once. An iPhone loads no media before it
  plays, whatever the page asks, so ahead means downloaded into memory. On an iPhone a tape plays only from a tap:
  the first tap while it should be playing starts it (untested on a phone: emulation only). The menu pauses it; a
  tutorial or an act's card popping up only hushes the car, and the tape plays on (the owner, 27 Oct). A row
  of lights in the cluster's hood jumps with the beat, now the kick drum heard in the music's bass (a jump over its
  recent level); on the phone that is all there is: the dash is full. On a desktop a head unit in the dash, left of
  the cluster, shows the tape (a name too long for it scrolls) and an 8-band equaliser. A tap on the lights or the
  head unit's TAPE button (or M) plays the next tape, and after the last it goes off: the lights and the head unit
  stay, greyed ("OFF"), and a tap plays the first tape again (the owner, 14 Oct: it used to vanish). The garage's
  ON/OFF is the same switch. Distance only. `stereo_test.py` serves the page over HTTP, as GitHub Pages does: a page
  opened from a file can't download the tapes, and Chromium won't let the audio graph hear one streamed from a file.
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
- **SETTINGS:** layout, the car's sounds and the music (each a volume; the music once the car has a stereo), HOW TO DRIVE, and RESET PROGRESS in red, bottom
  right, once a game has started (moved here from the main menu: one tap from wiping a game is too close).
- **STATS:** time played, runs, best run, distance driven; races and best place only after the reveal, the fleet and
  cars totalled only once their acts open, tanks beaten once one is; never a word of the race before the reveal.
  SHARE sends them (and the build: when the page was published) by the phone's share sheet, else the clipboard.
- **The itch.io release: feedback and gameplay data** (the owner, 22 Oct). One codebase, two releases: GitHub Pages
  serves `main` as it is (SHARE, nothing sent); itch.io gets what is pushed to `release/itchio`, built by
  `tools/build.py`, which fills in the gate's address, so only that build:
  - asks on the first visit: "A GAME IN PROGRESS", feedback welcome, and a box, unticked, "I accept to send
    anonymous gameplay data" (the owner's words), with what that is (runs, progress, upgrades, time played, touch or
    keys, the kind of device, the screen's size, errors) and that it is no personal data. SETTINGS changes it.
  - has FEEDBACK in SHARE's place (STATS, the ending): a free text box, ◀ BACK (as on every screen) and SEND. The
    player's stats always go with it; ticked, it needs a word (the stats are sent anyway), unticked it can go empty,
    and says so. Sent, the box clears and a thanks screen takes the form's place ("Thanks for your feedback!", ◀ BACK
    to where FEEDBACK came from: the owner, 22 Oct); a failed send stays on the form, the words kept.
  - The owner, 25 Oct, on an iPhone 14 Pro in Chrome inside itch.io's frame: after the keyboard the layout fell apart,
    SEND off the screen, until the phone was turned. The owner's screenshot showed why: the page zoomed in. iOS zooms
    in on a text box set smaller than 16px, and doesn't zoom back out; our viewport forbids zooming, but in itch.io's
    frame it is itch.io's page that rules. So the box's text is 16px. And typed on a phone, the form packs into the
    top of the screen (the title and the lines of text hidden, the box a little shorter), so the box and SEND stay
    above the keyboard, with nothing for iOS to scroll into view; once the keyboard is down the page and the menu are
    scrolled back anyway (recent iOS can leave the view offset: Apple's forum, thread 800125; WebKit bug 297779).
    Checked in emulation only.
  - sends, ticked, never during a run: a game of Distance starting, each run's end (the run, the save less the
    interface's lists: about 1 KB, about one a minute while playing), and the first five errors of a visit. A visit's
    random id, in memory only, groups them; nothing is kept on the device.
  - **Supabase closed to the web** (the owner wasn't comfortable with it open: a public key in the page could add
    rows to the tables directly). Everything goes to one Edge Function, the gate (`supabase/functions/report`): it
    takes only the shape the game sends, caps sizes, throttles a sender to 20 reports a minute (best effort, in an
    instance's memory) and writes with the project's secret key, kept on the server. The tables
    (`supabase/tables.sql`) grant the public keys nothing; the page holds no key, only the gate's address. Sent as
    plain text, so a browser sends it straight away (no preflight: one call a report). Google Analytics was
    considered and dropped: feedback can't go through it (100 characters a value, no personal data allowed), it keeps
    an ID in a cookie (so not "no personal data"), and ad blockers stop it.
  A failed send is dropped (the free plan pauses a project after a week of little use); the game never waits on one.
  Inside itch.io's frame the iPhone's "Add to Home Screen" tip is gone (it would keep itch.io's page). itch.io: no
  payments (the Suno tracks are non-commercial only). Claude's calls: the words, what goes in a report, errors capped
  at five a visit, a visit's id kept in memory, the gate's limits.
- **The ending** (the win screen) follows the tank's destruction, a modal in fire and rust (the owner, 20 Oct: the HUD's
  GAME OVER and a plain screen felt underwhelming; their pick of title and words): "WARLORD OF THE COAST ROAD. Steel,
  smoke and silence where the tank stood. A hundred engines howl your name. Nobody's chasing you any more. They're
  following." Then the stats, MAIN MENU, SHARE and BACK TO THE GARAGE (play on). Its NEW GAME went: a red "erase
  everything" doesn't belong on a win, and RESET PROGRESS in the settings does it.
- **The act cards** (the owner, 21 Oct: nobody read the words on top of the garage). A title card as each act starts,
  in the ending's look (the garage hidden behind it): a small "ACT II", the act's name, what it is about and what to
  do. DRIVE (on a new game, over the road, with a HOW TO DRIVE button into the Driving tutorial; its CONTINUE starts
  the first run, after the Driving tutorial on a first game), ACT II · RACE (the reveal),
  III · RECRUIT (the first win), IV · WAR (the first car totalled: it was the gang's 51st car, bought in the garage,
  and NO LAW OUT HERE a card of its own at the first total, until the owner moved act IV onto the road, 27 Oct); then,
  without a number, the last act's turn: THE ARMY SENDS A TANK. The first act has no number, nor does anything before the
  reveal (the owner, 21 Oct: "Act I" would say more is to come): the garage's title stays GARAGE and the pause
  menu's button reads WHAT TO DO, so ACT II is the first the game says of acts. The owner's picks: verbs for the names, the tank a turn in act 4
  rather than an act of its own. Each pops up once, before any tutorial that opens with it (they ride first in the
  tutorials' list). The pause menu's button with the act's name, and the garage's title ("ACT II · RACE ▸"), show the
  current one again (the owner's pick: both), with a line on where you stand (best place, fleet size, the heat and
  what it brings) and the last run in full. The garage keeps a line of the run's numbers (+metres, place and points,
  dues, nitro refill, totals and scrap, the heat): numbers get read, and a report after every run would be a tap
  every run (the owner's pick over a modal each run). Claude's call: the words.
- **How to drive:** the first act's card points to HOW TO DRIVE, in the pause menu and the settings: the Driving tutorial and
  the full controls. The key help that sat at the foot of a desktop screen went there too.
- **Tutorials** (the owner, 20 Oct, after Diablo IV's: a step a page, a system at a time). HOW TO DRIVE lists them,
  the controls cheat sheet under the list. A page is a step: its title, what to do (for a touch, or for keys and
  mouse, by the layout in use), and the real control lit up behind the menu, which goes clear and dims all else (the
  owner's pick over screenshots: always your own cockpit, phone or desktop, never stale as the cockpit changes). The
  card sits at the top or the bottom, out of the control's way, and beside it when it is off to one side (the
  phone's lever is tall). ◀ ▶, the arrow keys, Space or a swipe turn the pages, dots show where you are; DONE or Esc
  go back to the list. Over a run the run stays paused. Driving, always there: start the engine, clutch down, into
  1st, gas, clutch up, change up, change lanes, brake. It pops up by itself in a new game's first run, after the DRIVE
  card, the run paused, and DONE carries on into it (the owner, 23 Oct, who picked this over a coached run); not
  after RESET PROGRESS (you have driven before), nor once read (any tutorial opened counts as seen). Then one for each system, listed once it opens: Headlight
  flash, Driver aids (with the layers on top of Autocruise), Car stereo, The race (and how places pay), Reckless driving (with damage and
  chicken), ECU tune (and heat), Nitro, The Fleet (the sonar, the Hunting pack), The War Rig (the reticle, totals,
  scrap), Fuel madness, Police heat, Guns, The tank; a page about an upgrade shows once it is bought. A system's
  tutorial pops up once in the garage when it opens in play (bought, or come with a run: the race, the gang, the
  tank), never mid-run; several at once follow one another. Only in play: a save's systems from before the tutorials,
  or set up by a test, pop nothing up. Its ? sits on the cards of the upgrades it is for, once bought (the owner's
  picks); nothing of the race shows before the reveal, its systems being bought after it. While a tutorial is up the
  garage hides (it covers much of the cockpit), and a control the garage hides (the sonar, the scanner, the
  reticle, drawn in the windscreen's middle) shows for its page. `tutorial_test.py` checks every page on both
  layouts (lit round its control, the card clear of it, nothing over it), the pop-ups and the ?.
- **Nothing locked is named** (the owner, 22 Oct: "Locked features should not be discussed anywhere until
  unlocked"): the race's rule, for every system. A system is named once its garage page is open; a control once the
  car has it, as the cockpit already did (the stalk, the stereo's lights, the nitro pedal, the trigger): HOW TO
  DRIVE's keys (F flash, N nitro, G fire, M next tape) and the phone's line about the stalk, and SETTINGS' music (the
  stereo is all that plays it). A tutorial page about a later act's upgrade shows once it is bought (Hunter has its
  own page beside Reckless auto-drive's, which named it in act II), and the War Rig's page about the War Rig page's
  parts once that page is open (the tutorial pops up a car totalled earlier). Kept: a locked card on an open page
  shows its name (14 Oct); the credits name the music (CC BY needs it); ARCADE's engines are open from the start.
  `tutorial_test.py` checks a new game's controls and settings, and the two pages.
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
  **Black market** (the illegal and forbidden, paid in race points), the **Fleet** (miles) and the **War Rig** (scrap)
  later. The price is `base × growth^level`, rounded to tens of metres.
- **The upgrade graph** (the owner, 23 Oct): what needs what is the owner's graph, `docs/upgrade-graph.md`, the source
  of truth (keep it up to date). Every tab is bought, so everything has a parent: the Workshop (100 m), the Autopilot
  (500 m, after 2 km driven in all), the Black market (1 point, once the race is revealed), the Fleet (1 point, at P1),
  the War Rig (1 scrap, with the first car totalled); a tap on a tab for sale buys it. A new game goes straight onto
  the road, with no garage before its first run (the owner, 23 Oct: it held nothing to buy yet); after it the garage
  holds only the Workshop's tab. A card shows once one of its parents is bought (a count on the arrow once met: 5 flashes,
  maxed) and is bought with all of them; a tab waiting on a story moment stays out of sight till then. A save from
  before keeps its pages: a tab counts as bought once anything on its page is.
  - A locked upgrade (none of it bought, something else needed first) shows only its name and its whole rule, what
    is done ticked and a parent out of sight as ??? (Flash recharge's, in act I, a teaser: the owner's call), in a
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
  | Flash recharge | Workshop | 5 | 2500 | 1.5 | a used flash back every 10 s, down to 2 s; needs 5 flashes and Reckless driving |
  | Auto flash | Autopilot | 1 | 2000 | | needs 5 flashes |
  | Auto clutch | Autopilot | 1 | 700 | | centrifugal: can't stall or bog |
  | Auto gas | Autopilot | 1 | 800 | | launch revs, traction control |
  | Auto shift | Autopilot | 1 | 2500 | | needs Auto clutch |
  | Lane assist | Autopilot | 1 | 1500 | | last-moment swerve |
  | Autocruise | Autopilot | 1 | 6000 | | needs Lane assist, Auto gas, Auto shift |
  | Engine swap | Workshop | 2 | 4000 | 2.5 | Boxer → V8 (needs Power, Rev limit, Gearbox) → Turbo I6 (needs them maxed) |

- **The aids** work the same pedals and lever as the player, so you can watch them.
  - They leave a control to you only while you touch it: your foot on the gas (no auto brake, no lift), on the
    clutch or the brake, your hand on the wheel or the lever. The nitro pedal isn't the gas pedal: pushing it,
    traction control carries on, but autocruise neither brakes nor lifts (the owner, 14 Oct: with every aid on, NOS
    should go). Reckless auto-drive's own nitro leaves autocruise as it is.
  - Your foot on the brake also takes Auto gas off the gas while the car is moving (on the line it keeps the launch
    revs), and Reckless auto-drive off the nitro; your nitro pedal still floors the gas. Until 25 Oct Auto gas held
    the gas down while you braked, so braking by hand slowed the car less than half as hard (5.1 m/s² against the
    brakes' 11.8 on maxed tyres; found looking at pit stops for act 3). `aids_touch_test.py` checks it.
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
    - it pushes the nitro pedal when a racer is within 500 m ahead, the tyres grip, it is in 2nd or higher and
      neither it nor you is braking.
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
- **Stuck hints** (the owner, 22 Oct: a playtester never bought a grid slot, raced from the back to the same few
  points and couldn't farm enough). Stuck is the owner's definition: three races in a row without a Black market buy,
  before P1. Then a word on the wall in the way, at the end of the garage's line of numbers and on ACT II's card:
  "stuck? Bribe the starter: start further up" while a better grid slot is for sale; else "Reckless driving: the
  oncoming lanes" (the top 20 can't be caught in two lanes); else, in the top 20, "7th gear: the top 10 are beyond
  6th". Nothing further back with both bought: the rest is pace. A Black market buy ends it. Kept that short and only
  when stuck (the owner would rather not help the player too much); a card that popped up once for each was tried and
  dropped for the line. How places pay is the race tutorial's second page, POINTS: a place's big points only the
  first time, more nearer the front (P50 51, P1 100), then a little a race (P50 6, P1 10). Claude's calls: which wall
  when, and the words of the other two lines.

**Black market** (paid in race points, 5,761 in all):

| Upgrade | Levels | Base | Growth | Notes |
|---|---|---|---|---|
| Bribe the starter (grid) | up to 100 | 1 | 1.035 | slot N needs a finish ahead of #N |
| Reckless driving | 1 | 100 | | oncoming lanes; from now on collisions damage the car |
| Game of chicken | 1 | 75 | | flashes work on oncoming cars: they swerve, room permitting; needs Reckless driving, Flash recharge |
| Reckless auto-drive | 1 | 600 | | autocruise in the oncoming lanes too, with chicken, the tune and nitro; needs Autocruise and 7th gear (18 Oct: a playtester spent the points on it instead of 7th gear, which the top 10 need; it adds no pace; `act2.py`: P1 after 24, 22, 20, 20 races, unchanged, with 7th gear bought in the race P1 came) |
| Cooling | 3 | 60 | 2 | heat rises 15% slower a level; needs ECU: power |
| ECU: rev limit | 4 | 50 | 1.6 | +300 rpm past the factory redline a level; needs Reckless driving |
| ECU: power | 4 | 60 | 1.6 | +8% torque a level; needs ECU: rev limit |
| Nitro | 5 | 100 | 1.5 | tank of 2 s a level (to 10 s), +60% torque; needs ECU power |
| 7th gear | 1 | 600 | | needs Nitro and the Gearbox maxed (6 gears) |
| Daredevil | 1 | 200 | | the oncoming lanes refill nitro, 0.5 s a second; needs Nitro maxed (23 Oct: it was everything else maxed, not as strong as thought) |
| Jump the start (rolling start) | 6 | 5 | 2.3 | needs Bribe the starter; each level the gear it starts in |

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

The act as it was until 26 Oct, kept for its history. It was rebuilt as the crew (decided 26 Oct, built 26–27 Oct):
see [Act 3 redesign](#act-3-redesign-the-crew-decided-26-oct-built-2627-oct) below, the game as built. What carried
over: the tab and its price, paying off racers (the slowest first, 3.5% dearer each), giving way and blocking, team
places (in points now), Racing (Fleet dues) and Crew tuning (Fleet tuning), and the sonar.

**The Fleet** opens with your first win (P1), and never shows before it: its tab goes on sale then, for a point.
ACT III's card says so after that race: "the racers you beat are open to offers". It is a garage page paid in
**miles**.
- **The Mile converter** (the owner's name, 23 Oct; it was the Exchange), free with the tab, turns metres into miles,
  one way, a mile for 1,609 m: a slider for how many, an "all
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
  drives about 2.5 km a race. They pay metres, into the bank, for the Mile converter.
- **Team places** (the owner, 23 Oct: option A of three, after "there are no interaction with the fleet"): at the
  finish each fleet car's place in the field pays a tenth of a mile for each ten places it is from the back (P92 to
  P101 one step, P2 ten), straight into miles, so the more cars and the quicker they are, the more they pay. A tenth
  (`act3.py`, two seeds each, races to 51 fleet cars): none 14–16, a quarter 9, 0.15 10, a tenth 12; the target is
  10–15. By then the team pays about 15 miles a race, the dues about 35 through the converter. Claude's caveat, taken:
  the fleet starts behind you (the slowest go first) and you never meet it, so your driving can't change what it
  pays. It adds income, not interaction; the brainstorm of 25–26 Oct answered it (Act 3 redesign, below).
- **The sonar:** the mirror is the timer, so there is no rear view. A sonar bolted to the left A-pillar, under the menu
  button, shows the road from above, 250 m ahead of you and behind, ahead up, you an arrow in the middle: its four
  lanes and the double yellow drawn (the lane lines going by as fast as the road), every car on it as a blip coloured
  by what it is. The owner (20 Oct): the traffic yellow, your fleet green, the police flashing red and blue, the tank
  red (a square), the rivals white (Claude's pick, clear of the police and the tank). The lanes are to scale across
  (15 px apart, so a lane change shows), squeezed along (34 px for 250 m); faint lines at 100 m each way, and a sweep
  going round. It shows only with a fleet, and only on the road; it redraws 15 times a second. (Before, Claude's call:
  a fan behind you, your fleet cars only, to 500 m.)
- **Simulated** (`act3.py`, from P1 with act 2's car and 44k m, the tab bought first): 51 fleet cars after 12, 12,
  10, 12 races with team places (23 Oct, seeds 1 to 4), a few cars bought every race. (13 Oct, seed 11, 57k m, before
  the retune: 26 races buying dues first, 71 buying the cheapest first.)

### Act 3 redesign: the crew (decided 26 Oct, built 26–27 Oct)

The owner's brief (25 Oct): "there is no interaction with the fleet, nothing new to do, no exciting upgrade"; the
playtesters found the Fleet slow; act 1 is mechanical driving, act 2 lane control, act 4 hunting cars, and act 3
"nothing but buying the same upgrades 51 times". This is what the brainstorm of 25–26 Oct settled on, to build in
layers, a PR each. Built 26–27 Oct, with the numbers measured since (marked **as built**); still to build:
act 4's Hunter role.

**Measured first** (25 Oct, scratch runs in the page: act 2's car at P1, `act3.py`'s bot):
- The fleet starts in its own slots, 120 m apart behind you. The nearest fleet car was 8.2–8.5 km behind you all race
  (3 seeds), Fleet flash fired 0 times and no fleet car ever gave way to you. Only the top 31 racers cross the start
  line in a race, and none get 3 km up the road.
- Your own driving paid about 4% of the act's income by its end (`act3.py` seed 1, race 12: your 3.0 km, about 1.9 mi,
  against 33 mi of dues and 15 of team places).
- Started up the road ahead of you instead, you pass 19–20 fleet cars a race (with 30 or 51 of them), closing at a
  median 160 km/h (150–183): there is no sitting behind one, and the aids, which drive the whole race by act 3, pass
  them anyway.
- A pit stop (braking from 264–440 km/h to pass a point under 100 km/h) cost about 420 m of a 3,850 m run, P1 kept in
  6 races of 6. Measuring it found Auto gas holding the gas down under your brake (fixed 25 Oct: see the aids).

So act 3's new thing to do has to be something the aids don't do.

**The rounds that led here,** each turned down: gas stations to brake into ("could be good", but nothing to do with
the fleet); a convoy with a CB radio and orders (the owner: act 6 material); signing racers on the road by catching
and flashing them (too hard to do); a fuel gauge for the clock (the owner liked the fuel: it stayed, as the money); a
horn that calls the fleet into a wedge through the traffic (the fleet should look harmless, so act 4's reveal stays a
surprise). The owner's turn (25 Oct): a crew with duties, the incremental genre's own trope (A Dark Room, Kittens
Game), sent Pikmin-like to oil spots and refineries; then (26 Oct) the sonar at the centre of it.

**The fantasy:** act 1 you drive, act 2 you race, act 3 you run the crew while the robot drives, act 4 you make war. By
act 3 Auto shift has freed the left thumb (on a phone the shifter was all it did), and the sonar is the act's
instrument, as the lever is act 1's and the trigger act 4's. The economy is Fury Road's own (the Citadel, Gas Town's
refinery, the War Rig hauling fuel between them), so the act foreshadows the War Rig without a word.

**Resources:** metres (your driving) and points (your places), as before; **crude**, in a tank bolted to the right
A-pillar (the owner's: off the crowded cluster; under where the police scanner goes in act 4), kept between runs up to
the tank's size; and **fuel**, the Crew page's money in place of miles. The crew costs fuel and makes fuel, so the
loop compounds. The goal is unchanged: 51 crew make the gang (act 4).

**The crew** is the Fleet renamed (the owner, 26 Oct: the tab, the page, the cards and the words; the upgrade ids and
save keys stay): every racer you pay off. Each has a role, and only racers earn metres and places:
- **Racer:** in its slot on the grid, racing as the fleet does now. Team places pay points instead of miles, so what is
  left on the Black market stays in reach; Racing (Fleet dues renamed) pays a share of the metres racers drive.
- **Harvester:** rides with you and works oil spots.
- **Brewer** (the owner's name): rides with you and works refineries, turning crude into fuel.
- **Hunter,** in act 4: the Hunting pack as a role (the owner's idea), named only once the War Rig page is open.

The roles are split on a card in the garage, free to change between runs: since 27 Oct (the owner: the counts were
hard to take in) a wide card, the crew's split as a bar in the roles' colours (racers green, harvesters amber,
brewers blue), a slider for each role with − and + beside it, the racers the rest. All harvesters this run and all
brewers the next is a fair tactic (the owner's), since crude keeps.

**How it opens** (the owner, 26 Oct):
- Cars 1–4 have no role and race. Crew tuning is their only upgrade.
- The run after the 5th car is scripted, one run for both systems:
  - about 5 s in, a fixed oil puddle (0/3) comes up. The run pauses for its tutorial (puddles, roles, three of your
    racers made harvesters, how to send), then you have about 15 s to send three, and it fills the crude tank until
    you pass it;
  - about 15 s later, with crude in the tank, a refinery (0/2) comes up: your last two racers become brewers, its
    tutorial, about 15 s to send two, and it brews until you pass it;
  - the role card opens in the garage after the run.
- Claude's call: if the puddle goes by uncrewed, the scripted run comes again.
- **As built** (27 Oct): the puddle 1.4 km up the road (about 15 s after its tutorial at act 2's rolling start), the
  refinery 1.1 km past it. A run lasts 50 s, 2.2–4 km, so a refinery placed further on was often past the finish.
  The finish counts as passing whatever is still at work, so crude pumped or fuel brewed up to the bell counts; a run
  that ends before the refinery brings it about 5 s into the next.

**On the road:**
- **Spots** stand by the road on the right: oil spots (a nodding pumpjack) and refineries (towers and a flare). Each
  shows its crew and rate: `OIL 3/5 · 1.2/s`.
- A spot pays once it is **fully crewed**, until you **drive past it**; then its crew rejoins you, free for the next
  one. Each holds a reserve and pays until that runs dry too, so parking short of one to farm it only empties it
  faster (Claude's call). Crewing a spot far ahead pays most, and the cars sent there can't take the nearer ones
  meanwhile. A faster car shortens each spot's time but passes more of them; lifting off, or your foot on the brake,
  buys a rich one more seconds. With Overfill a spot takes more cars than its count, up to twice as many, each one
  past the count adding its share of the rate.
- **Sending** is one press of SEND for each car (the owner: "a bit of frantic button mash"), and `<` and `>` choose the
  spot; on the keyboard `,`, `.` and `S`. The car comes past you on the right shoulder, kicking up dust, and races off
  to the spot. It counts once it gets there, a second or two later, so sending early pays. Your crew's cars stand
  parked at a spot as you go by. Double up makes a press send two.
- **The sonar** stays as it is for cars, 250 m each way. A **tracker** on its right side (the owner's: on the far left
  your hand would hide it) shows the spots ahead on a log scale, near ones spread out and far ones packed close, their
  icons coming down as they near; its reach is Sonar range. Since 27 Oct (the owner's playtest: too hard to see
  what's ahead at that speed) it is three times as wide and a list: the next four spots, one a row, the farthest on
  top as on the sonar, each with its crew (3/5), what it pays when full (1.2/s) and how far it is (320m, 1.4k),
  coloured by state (short amber, crewed blue, pumping green), the one picked outlined; the rows follow the pick. `<` SEND `>` sit along the sonar's bottom edge, where the
  left thumb reaches up and covers only them. The chosen spot has a **tag on the windscreen** in the head-up display's
  look and the sonar's green (name, crew, rate, distance): not act 4's red gunsight, which stays new.
- **Refineries** take 2 litres of crude for a litre of fuel at first, towards 1:1 with Brewing.

**Spots are drawn ahead of each run** (the owner: semi-random, guaranteed, not evenly spread), on dice of their own so
the traffic stays the same in every game: oil spots in clusters and gaps, a rich one early, a refinery within reach
once there are brewers. The spots grow moderately with your crew (a first guess: from 0/3 to about 0/8 by the 51st).
A **check** keeps the income steady for sensible play, without godlike reactions or perfect planning: a model player
(your average speed over the last runs, 1 s to react once a spot shows, at most 4 presses a second, the best spot it
can fill) must earn within about 25% of the target for the size of your crew, and find about 1.3 places in reach for
each free car of the crew, or the run is drawn again, a few times at most, keeping the closest.

**As built** (27 Oct, `oil.js`; the numbers from `act3.py` and a quick model of it, in that order):
- A run at act 3 is 50 s and 2.2–4 km at about 60 m/s, so a spot 500 m off is only 8 s away: the first guesses left
  the crew at a spot 6–12% of the time, making 1–3 L a race, and the act would have taken well over 30 races. The
  tracker reaches **1 km** (Sonar range: 2 km, then 3 km), and the spots are closer together: the first oil spot
  300–500 m up the road, then 150–350 m (a cluster, 55% of the time) or 500–900 m (a gap); a refinery 600–900 m up,
  then every 1,000–1,600 m, nudged clear of the oil spots (it used to be dropped when it fell on one, which left most
  runs with none).
- Oil spots hold their count of cars, the biggest 3 + 5 × crew/51 (0/3 when the oil comes at the 5th car, 0/8 at
  the gang); a refinery 0.4–0.6 of that. A harvester pumps 0.1 L of crude a second (0.07 until the converter's
  retune, below), a brewer brews 0.3 L a second of it (0.2), 2:1 into fuel. An oil spot holds 10–20 s of
  its full crew's pumping.
- The check is simpler: each run is drawn five times, and the one whose yield for the model player sits in the
  middle is the one you get. The draw doesn't size the spots to your riders: you do, on the role card. A sensible split
  rides about as many cars as there are places in reach (1 for each 1.3 places), with enough harvesters for the
  biggest oil spot and enough brewers for the biggest refinery; the rest race.

**Scouting** (an upgrade) lists what is on the next run before it, "4 oil, 1 refinery", with no positions, sizes or
rates (the owner: so the garage doesn't turn into over-analysis); its levels cover more of the run.

**The Fuel converter** (the Mile converter renamed; free with the tab) turns metres into fuel, one way, at the pump
price: 1,609 m a litre at first (today's mile; the owner: thousands, not hundreds), climbing with the crew's size (a
first guess: three times as dear by the 51st). It buys the first cars, and the oil takes over. Miles in a save carry
over as litres, one for one. **Retuned** (the owner's playtest, 27 Oct: "4–5 cars are what a player should be able
to afford"): 7,500 m a litre at first, so act 2's 40–47k m (less a reserve for the nitro) buy 4 or 5 cars; at a
mile a litre they bought 19, and the oil came with spots already 0/5.

**The Crew page,** paid in fuel. First-guess prices, for `act3.py` to set:

| Upgrade | Levels | Base | Growth | Notes |
|---|---|---|---|---|
| Pay off a racer | up to 99 | 1 | 1.035 | as now: one more of the crew |
| Crew tuning | 5 | 3 | 3 | Fleet tuning renamed: racers 5% quicker a level, and crew cars reach their spot sooner |
| Racing | 5 | 5 | 3 | Fleet dues renamed: racers pay 10% a level of the metres they drive |
| Harvesting | 5 | 5 | 3 | harvesters pump 20% more a level |
| Brewing | 5 | 5 | 3 | brewers get more fuel from the crude: 2:1 towards 1:1 |
| Crude tank | 3 | 10 | 2.5 | a bigger tank |
| Sonar range | 2 | 10 | 3 | the tracker reaches 2 km, then 3 km (1 km before; the first guess was 500 m, 1 km, 2 km) |
| Scouting | 3 | 15 | 2.5 | lists the run's first 2 km, then 4 km, then all of it |
| Overfill | 4 | 20 | 2.5 | a spot takes 25% more cars than its count a level, up to twice as many; each one past the count adds its share of the rate |
| Deep wells | 4 | 15 | 2.5 | oil spots hold 25% more a level, up to twice as much |
| Double up | 1 | 25 | | a press of SEND sends two cars (60 until 27 Oct) |
| Foreman | 1 | 60 | | after Double up (and until 27 Oct Scouting and Sonar range maxed, 150 L: out of the act's reach; the owner wanted it earlier, to help reach 51): sends the crew for you (the biggest yield in reach it can fill), so you are hands-free by the end of the act; a switch; your own SEND still works |

The role upgrades and tuning grow steeply (the owner: "make their price grow steeply"). The names stay one or two
words, as every card's does (Claude's call: "efficiency" would wrap on a phone, and the card's line says what each
does). Fleet flash goes: it never fired at P1. What needs what: the upgrade graph.

**Room for the whole crew** (the owner, 26 Oct: would 51 cars be overkill?). A car works only while it is at a spot,
so the most that can work at once is the room in the spots in reach. With a spot about every 700 m, 2–6 places each
and 2 km of reach, about 3 spots are in reach at once: 10–15 cars, and from about the 15th each new car would mostly
wait (an estimate from the first guesses, not a simulation). So the room grows with the crew:
- the spots grow moderately with it (above);
- Overfill lets a spot take up to twice its count, and Deep wells make oil spots hold up to twice as much, so the
  extra cars don't just drain them sooner (the owner's): a 0/6 takes 12;
- Sonar range brings more spots into reach;
- the draw keeps about 1.3 places in reach for each free car, so there is always a choice and never a crowd (as
  built, the player keeps it, by how many ride: see the spots above);
- a car with no spot to work earns nothing (the owner, 26 Oct: the player should balance the roles). The role card is
  where a bad split gets fixed, and the room in reach keeps idle cars rare when the split is sensible. A share of the
  metres an idle car rides is kept in reserve, should idling feel harsh in play.

**How we make sure:** `act3.py` reports each race how much of the harvesters' and brewers' time is spent at a spot
(60–90% at every crew size from 5 to 51), the fuel a car makes in a run, and how many runs a car takes to pay for
itself (2–4 throughout: the incremental rule the balancing pass follows, prices growing and income with them; the 5th
car costs about 1.2 litres, the 51st about 5.8). Oil should make at least two-thirds of the fuel once the scripted
run is behind you: the racers' metres turn into fuel at the Fuel converter, and its climbing price is the brake. The
core loop doesn't merge until these are in their bands. As the spots grow, so does the mashing: Double up first, then
the Foreman (the owner, 26 Oct).

**Measured** (27 Oct, `act3.py`, seeds 1 and 2; the bot rides cars to fit the room, saves for Harvesting and Sonar
range, buys a bigger tank when it ends a run full, and otherwise the cheapest of the cars and upgrades):
- **51 crew after 12 races, both seeds** (the target 10–15): the first win's race, the scripted run, then 10 more.
  The converter buys 19 cars with act 2's metres; after the oil, 3–6 cars a race.
- **At a spot** 46–70% of the riders' time, about 57% on average: the bottom of the 60–90% band. What's left is the
  run's shape: a car is free again only as you pass its spot, and waits for the next one to come into reach.
- **Payback** 2.1–7.4 runs, rising through the act (about 3 early, 5–7 by the 40th car): above the 2–4 aimed for.
  The bot spends nearly everything on cars, and income per car stays at 0.7–1.1 L a race while a car's price
  triples. Bringing it down without shortening the act needs the upgrades to soak up more of the income (a player
  who buys them is slower to 51 than the bot); a question for the owner.
- **Oil's share** of the fuel 84–100% (the target at least two-thirds); the converter adds about a litre a race.
- **Upgrades bought** by the end: Harvesting 1, Sonar range 1, Crew tuning 1, Brewing 1. The bot gets nowhere near
  Double up (60 L) or the Foreman (150 L, after Scouting and Sonar range maxed, another 200 L or so): the act's
  whole income after the cars is about 40 L. As priced, "hands-free by the end of the act" doesn't happen; another
  question for the owner.
- **Act 4** (`act4.py` seed 1, after the change: team places pay points, not fuel): the tank beaten in race 13 (11–12
  before), at the first go.

**Retuned** (27 Oct, the owner's playtest: the converter 7,500 m a litre, the oil 0.1 L/s a harvester and 0.3 a brewer,
Double up 25 L, the Foreman 60 L after it alone; `act3.py` seeds 1 and 2, `act4.py` seed 1 with its bot now running
the crew, as the oil runs on through act 4):
- **Act 3:** the converter buys exactly 5 cars with act 2's metres (less a 3,000 m reserve), the oil comes in the next
  race, and **51 crew after 14 races** on both seeds (the target 10–15). The bot saves two or three races for
  Harvesting and Sonar range before buying more cars, then 4–8 a race.
- **At a spot** 40–80% of the riders' time (about 60%); **payback** 0.9–6.6 runs, 1–2 for the first 20 cars; **oil**
  84–100% of the fuel. The act earns about 194 L of fuel in all (seed 1).
- **The Foreman's path** (Harvesting, Brewing, Overfill, Double up, the Foreman: 115 L) is within that, for a player
  who wants it more than cars; the bot, which sends as the Foreman does, never buys it.
- **Act 4:** the tank beaten in race 13, at the first go, as before. The oil pays 20–40 L a race there, so the crew
  grows to 79, Racing and Crew tuning reach 3, and the Hunting pack (one level of Crew tuning lets you in, the
  owner's call of 27 Oct) comes in race 9.

**Foreshadowing,** without a word: the pump price climbs; stations that aren't yours show NO FUEL, then get boarded up;
a burnt-out shell; the first rusty car in the last races; then your crew rides out as the gang.
- **As built** (27 Oct, `oil.js` omens; where and when are Claude's calls): from your first crew car to the gang, two
  fuel stations stand by the road each run (900 m and 3.3 km up, moved off any spot), in the palms' silhouette with
  lamps under the canopy. Up to the 20th car (40% of the way to 51) their board shows the pump price, the
  converter's metres a litre, climbing (with the 19 cars or so act 2's metres buy, that is the act's first races);
  from the 21st NO FUEL in red; from the 36th (70%) boarded up, lamps out, planks across. From the 31st (60%) a
  burnt-out shell sits on the shoulder between them, smoking (act 4's wreck, a different car each run). From the
  44th (85%), one ordinary car in about 16 is rusty: act 4's mad paint (rust, a primer panel, holes, a light out),
  without its bars or spikes, and it drives like any other car.

**Still to settle:** what points buy in act 3 (the Black market is mostly bought by then); every number above; and act
4's Hunter role (its own layer, with `act4.py`; the owner, 27 Oct: one level of Crew tuning lets you in, as it does the
Hunting pack, and the oil runs on through act 4).

**Layers,** a PR each, the full suite before each merge, and every merge a working game (main is live):
1. These notes and the upgrade graph.
2. The Fleet renamed the Crew, in words only (built 26 Oct).
3. The core loop: spots on the road, the tracker, `<` SEND `>`, the windscreen tag, the roles, crude and its tank,
   refineries and brewers, fuel as the money, the Fuel converter's pump price, the role card, team places in points,
   the scripted run; `act3.py`'s bot learns to send, retuned to 10–15 races. Built 27 Oct, with layer 4 in the same PR,
   so the live game never has crude with nothing to spend it on.
4. Sonar range, Scouting, the Crude tank, Racing, Harvesting, Brewing, Overfill, Deep wells and Double up (built 27
   Oct).
5. The Foreman (built 27 Oct): it sends as `act3.py`'s bot does (`oil.js` `bestSpot`: a spot a second after it
   shows, four cars a second, the most to pay before you pass it that the free cars can fill), without a beep; SEND
   reads AUTO while it is on, as the trigger does with Auto gun.
6. The foreshadowing (built 27 Oct).
7. Act 4's Hunter role.

### Act 4: the War Rig

**The name** (the owner, 18 Oct; Mad Max before, a trademark): War Rig. It is the tanker in *Mad Max: Fury
Road*, and the nod is wanted: an apocalypse turning ordinary people into savages. The owner: it isn't a registered
trademark. The page opens with an outlaw's line: "No law out here any more. The gang is yours, and your
car becomes a war rig."

**The gang:** once 51 of the 100 race for you, your crew is a gang. Since 27 Oct (the owner: the roles vanishing in the
garage as the 51st was bought felt like a bug; it should happen on the road) nothing changes in the garage: about 5 s
into the next run the gang's moment comes, the oil still running, and the War Rig tutorial pops up over the road (once a
car is in the reticle) with its first job: total a car. The first car totalled leaves 3 s on the clock; then ACT IV ·
WAR's card in the garage (NO LAW OUT HERE's words, once a card of its own), the War Rig tab for sale, and your racers
ride as the gang. The oil runs on through act IV (the owner, 27 Oct: it shouldn't disappear; by then the Foreman runs
it, and the cars you go on paying off, up to 99, bring more). The windscreen gains an **AR layer** (red, like a
gunsight): a reticle round the nearest car ahead going your way, its health bar above it, and "TOTAL IT" until the first
job is done (a racer's number after). It stays on that car while it is within the guns' reach (200 m) until you pass it
or total it, then moves to the next; further up the road it takes the nearest car ahead. Each race starts afresh (14 Oct
fix: the reticle kept last race's car, out of sight on the horizon, and the guns would fire at nothing else).
- **Damage:** a ram is a hit, 34 off the car's health: 100 for traffic, 150 for a racer, 200 for the police, so 3, 5
  and 6 hits; with a full bull bar (3 times a hit) 1, 2 and 2 (the owner's numbers, 14 Oct). From behind, a bump
  closing at under 30 km/h is only a nudge, and one at over 200 km/h totals the car at once: "OHKO!" (the owner's
  idea). A side-swipe always counts. A head-on is still your DNF, not a total. Your fleet cars can't be hurt. (It used
  to be 0.4 of the closing speed in km/h a ram: the simulations rammed at 130–300 km/h, so one ram often did it.)
- **Totalled** at 0 health, a car skids onto the right shoulder, tipped and smoking, and stops; you collect its scrap
  (22 from traffic, 55 from a racer: see the balance results). A totalled rival is out of the race and you move up;
  results still pay by finishing position only, so wrecking can't be farmed for points.
- **The War Rig page**: its tab is for sale with the first total (1 scrap), and the page is paid in **scrap** (called
  parts until 23 Oct, the owner's rename: the records below from before keep the old word). It is to the Fleet what
  the Black market is to the Workshop.

  | Upgrade | Levels | Base | Growth | Notes |
  |---|---|---|---|---|
  | Bull bar | 3 | 20 | 2.5 | a hit counts 2/3 more a level (3 times at 3); you keep more speed (at 3, you carry on at the car's speed); the gang side-swipes rivals |
  | Armour plating | 3 | 30 | 2.5 | collisions do 25% less damage to your car a level |
  | Spiked hubs | 1 | 150 | | a side-swipe (into a car while moving over) costs you no speed and counts one more hit; the gang's 30 more damage |
  | Guns | 3 | 400 | 2 | needs Spiked hubs: 6 damage a shot a level, 4 shots a second, up to 200 m; the gang fires too |
  | Auto gun | 1 | 200 | | needs Guns: fires for you while the reticle's car is in reach and in sight; the marker reads AUTO; ON/OFF in the garage |
  | Fuel madness | 4 | 30 | 2.5 | 25% of ordinary drivers mad a level, 90% at the top: rusty, weaving, no mirror check or indicator, and each jumps in front of you once; ram one that cut in and it's totalled; a mad car pays double parts; ON/OFF in the garage |
  | War Rig radio | 1 | 100 | | needs the Car stereo: it plays the War Rig's own three tapes instead of synthwave; ON/OFF in the garage |
  | Hunter | 1 | 100 | | needs Autocruise: it hunts the car in the reticle, into its lane and into it (not the tank; it backs off past 60% damage); ON/OFF in the garage |
  | Hunting pack | 1 | 150 | | fleet cars hunt as you do: the nearest car ahead of each, within 150 m, into its lane and into it; their guns on it too |

- **Bad drivers** (the owner's idea, 18 Oct): the playtesters hated cars cutting in (fixed: traffic passes the way
  drivers do), but in the War Rig a car jumping in front of you is a ram, worth scrap and heat. Bought, ordinary
  traffic goes back to the old manners: no mirror check, no indicator, out whenever it is quicker than the car ahead
  (racers and your fleet keep theirs). A switch, like the aids. Through the game interface's `badDrivers()`, so the
  road stays the same for every other game.
  With a bull bar fitted, the aids take the ram of a car that has just cut in (for 3 s): lane assist doesn't swerve
  round it, autocruise doesn't brake for it or count it as a blocked lane (the owner, 18 Oct: as first built, the aids
  avoided the cut-ins, so it changed nothing in `act4.py`: the tank in races 25, 24, 23, 28 with it, 23, 24, 23, 23
  without). Taking those rams cost more than it paid (a ram costs speed and damage, and paid a third of a total: 26,
  27, 24, 25 with it), so a car that cut in and gets rammed is totalled on the spot, full scrap and heat: "HAD IT
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
  Rig page, paid in scrap, and hunting "like you: anything", both the owner's picks): each fleet car hunts the nearest
  car ahead of it going your way within 150 m, rivals and traffic alike (police too; not the tank, whose fight has the
  gang alongside it). It moves into that car's lane, room permitting, and drives into it without passing it or backing
  off: a ram is a hit as yours are (34, the bull bar counting), every 1.5 s at most, and it falls back 4 m/s. Its guns,
  if any, fire on its prey too. It never moves into your lane in front of you (it gives way first, as ever). The
  totals are yours: scrap (double for a mad driver) and the gang's heat, with "THE GANG TOTALLED A CAR" (or the
  racer's number, or A POLICE CAR) on the head-up display. A fleet car looks for prey twice a second, the whole road
  for half the field being a lot of looking. `pack_test.py` checks it. Price, `act4.py` (cheapest first): at 150
  parts it is bought in races 8-12 and the tank falls in races 14, 16, 12, 12 (14, 16, 13, 14 without it); the race
  after buying it pays two or three times the parts (10 cars for 462 parts on one seed, 5 for 132 without). At 300
  it came in races 11-14, a race or two before the tank (14.0 on average), and at 600 never before it (the guns,
  400, come first).
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
  damage a level): it lurches across, then drives back into its lane. What it totals pays you the scrap, and the rival
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

**The final boss, the tank.** At 100% heat a card (THE ARMY SENDS A TANK) warns that the army has sent one, and the
next race has it (not in limp mode). It waits until you have guns: rams alone can't beat it, so unarmed it was a sure
DNF that halved the heat. Till then the act's card says "the army has a tank ready for when you are armed".
- Its race is a boss fight from the line (the owner, 27 Oct, after it seemed to turn up mid-run): as you drive off,
  its card pops up over the road, and the tank waits 250 m up the road before the lights. The heat filling mid-race
  never sends one into that race: the next race has it.
- It holds the road about 80 m ahead of you, in your lane: you can't get away from it or past it. It is the AR target
  ("TANK"), with 1,000 health.
- It fires a shell at you every 2.5 s while you are within 250 m behind it: 8% damage a hit (armour takes a quarter
  off a level), with the shot, a jolt and the cracks to show it.
- You and the gang outgun it: your guns, and the fleet's, which race up to join the fight (40 m/s quicker until
  they are with it) and shoot it from within 200 m. A ram does a fifth of its usual damage.
- **Destroyed:** the ending. TANK DOWN on the head-up display ("the road is yours"; GAME OVER until 20 Oct, which read
  like losing) and the run stops there, the tank burning, held for 4 s (the owner, 14 Oct: that's the end state);
  then the ending's screen. The garage: "The tank is scrap: the road is yours", 300
  scrap, the heat back to 0. You can still play on, the next tank half as tough again (1,500, then 2,000 ...), until
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
- **The upgrade graph (23 Oct),** the tabs bought, the needs redrawn and team places added; the owner's targets: act 1
  15–25 runs, act 2 15–25, act 3 10–15, act 4 10–15 to the tank and 1–3 at it (51–83 in all, about 1 to 1.5 hours).
  The simulations buy each tab first.
  - Act 1: #100 first passed on run 19 (value) and 22 (cheapest first), both seeds; it was 17–19 and 21–23.
  - Act 2: P1 after 17 and 16 races (seeds 1 and 2), Flash recharge bought on the way for Game of chicken.
  - Act 3: 51 fleet cars after 12, 12, 10, 12 races (seeds 1 to 4); without team places 14–16.
  - Act 4: the heat at 100% after 10 to 11 races, the tank beaten at the first go (races 11 and 12, seeds 1 and 2;
    without team places 13 and 11; the game before this change 12 and 12): as it was, at the short end of the target.
    Left as it is unless the owner wants it longer.
  - In all about 56–63 races, inside the 51–83.
- **Simulation tools** live in `tests/balance/` and are run from the repo root:
  - `act1.py [cheapest|value] [head-start curve or -] [traffic]`: when #100 is first passed;
  - `act2.py [races] [seed]`: races from the reveal to P1, the bot driving like Reckless auto-drive (`aids.js`). The
    traffic seed alone moves the result by up to 7 races, so compare a few seeds;
  - `act3.py [races] [seed] [overrides]`: races from the first win to 51 crew, the bot sending the crew to the spots
    and buying the Crew page's upgrades; it reports the share of time at a spot, payback and oil's share of the fuel;
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
  - A CB radio on the dash giving the crew orders on the road (follow, block, flat out): the owner's "act 6" material
    (25 Oct), from the act 3 brainstorm (act 6 itself is the moving fortress since 27 Oct, below).
  - **Act 6, the owner's plan for the future (27 Oct; a note only, nothing to build yet):** inventory tetris with the
    parts collected from notable enemies (tanks, helicopters, any war rig), fitted together to build a real moving
    fortress. It grows into a moving city that takes over all four lanes; the ending is a final "animation" of the
    whole moving city going through the wasteland, with the crew following.
