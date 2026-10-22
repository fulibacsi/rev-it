# Rev It

A stick-shift toy for the browser with real engine sounds, played at https://fulibacsi.github.io/rev-it/ (GitHub
Pages serves `main` from the repo root). One page and one physics model behind a menu of games: **Rev** (hold the
revs in a band, parked), **Speed signs**, **Distance** (an incremental game with a hidden race inside it) and **Free
drive**. Keyboard, mouse and touch all work at once; phones get their own layout.

Design decisions, balance targets, the playtest history and the open questions are in
[docs/design-notes.md](docs/design-notes.md). Read it before changing how Distance plays or pays.

## Working with the owner (fulibacsi)

- **`main` is live.** Never push to `main` or merge into it. In a local session, commit and let the owner push: ask
  before any push. In a cloud session, push each commit to its branch as soon as it is done; the owner reviews and
  merges.
- **Branch names** describe the change, one branch per change: `feature/<change>` for features, `fix/<change>` for
  bug fixes (`feature/nos-pedal`, `fix/stalk-behind-shifter`). In a cloud session this replaces the branch name the
  session was given: create the named branch, and work and push there.
- **Two releases from one codebase.** GitHub Pages serves `main` as it is (the owner's playtest build). itch.io gets
  only what is pushed to `release/itchio`: push to it only to release, `main`'s commit, never work in progress. The
  push runs `.github/workflows/itch.yml`: `tools/build.py` builds the itch.io copy (the game's own files, with the
  gate's address filled in, so that build alone asks for consent, has FEEDBACK and sends gameplay data) and butler
  uploads it. It needs, in the repository's Actions settings, the secret `BUTLER_API_KEY` and the variables
  `ITCH_GAME` (user/game) and `REPORT_URL` (the gate's address).
- **Supabase stays closed to the web** (the owner, 22 Oct). The itch.io build sends to one Edge Function, the gate
  (`supabase/functions/report`): it checks each report, throttles each sender and writes with the project's secret
  key, kept on the server. The tables (`supabase/tables.sql`) grant the public keys nothing, and the page holds no
  key. Never put a Supabase key in the game.
- **Commits credit you both:** the owner as author, as on their own commits
  (`git commit --author "fulibacsi <fulibacsi@gmail.com>"`), and Claude as co-author in a `Co-Authored-By:` trailer.
  Leave the committer as git has it: a cloud session signs commits for that identity.
- The owner designs the game. Ideas they throw out are proposals to discuss, not orders. When feedback can be read
  two ways that lead to different work, say which reading you took, or ask.
- They playtest on an iPhone 14 Pro held sideways (Safari, added to the home screen). Phone feel matters most.
- Keep the game **diegetic**: controls and readouts belong to the car (the light stalk, the mirror's timer, the
  windscreen head-up display, the cluster's lamps). A floating button was called out; nitro is a pedal on the gas pedal.
- Never hint at the hidden race before it is revealed: no garage text about the white car ("a clear giveaway").
  The same for everything locked (the owner, 22 Oct): a system is named only once its garage page is open, and a
  control (its keys, its setting) only once the car has it.
- Report what you verified and how. Balance claims come from the simulations in `tests/balance/`, not guesses.

## Code

- No build step and no dependencies: classic `<script>` files sharing globals, loaded in the order set at the bottom
  of `index.html`. A file can use another's globals at load time only if that one loads earlier; at call time
  anything goes.
- `js/engine.js` engine model and Web Audio (recorded loops crossfaded by rpm) · `js/car.js` drivetrain, clutch slip,
  lanes, crashes · `js/road.js` pseudo-3D road, traffic AI, sprites · `js/controls.js` all input (key, pedals, H-gate
  lever, wheel, light stalk, nitro, stereo) · `js/stereo.js` the car stereo's tapes and lights · `js/reporting.js` feedback and gameplay data (the itch.io
  build only: the gate's address is empty in the repository) · `js/tutorial.js` the
  tutorials under HOW TO DRIVE (a step a page, the real control lit up behind the menu) · `js/main.js` the
  menus (main, pause, arcade, settings, stats, how to drive, credits, win), cluster, head-up display, main loop.
  **The interface a game implements is documented at the top of `main.js`.**
- `js/games/`: `levels.js` (adaptive levels for Rev and Speed signs), `rev.js`, `signs.js`, `distance.js` (garage,
  upgrades, runs, save, the act cards), `race.js` (the hidden race, the Black market's upgrades, scoring), `fleet.js` (the Fleet:
  paid-off racers and their teamwork), `gang.js` (War Rig: the AR target, totals, parts, guns), `police.js` (police
  heat, the scanner, police cars), `boss.js` (the tank, the ending), `damage.js` (damage, heat, nitro), `aids.js`
  (Distance's driver aids: robot feet and hands working the same pedals and lever as the player).
- Saves: `localStorage` keys `car-rev-settings` and `car-rev-incremental` (Distance progress). Keep these names so
  players keep their saves. Debug mode plays `car-rev-incremental-debug` and never writes the real save.
- `assets/sounds.js` is generated by `tools/make_sounds.py`; the icons by `tools/make_icons.py` (both `uv run` scripts).
  `assets/cars.js` is generated by `tools/make_cars.py` from a local copy of Pay 'n' Sprite's "JDM 90s pack" (itch.io):
  its terms forbid passing the pack on as assets, so the pack never goes in the repo, only what the game uses.
  `assets/music` (the stereo's tapes, MP3s) is generated by `tools/make_music.py`: Kevin MacLeod's three (CC BY 4.0)
  it fetches, the owner's five, made with Suno on its free plan, it takes from a local folder. Suno owns those and
  allows only non-commercial use: they are outside the MIT licence, and must go if the game ever earns money. Sound,
  car and music credits live in `CREDITS.md` and the menu's credits screen, reached from a small link in the main
  menu's corner. CC BY 4.0 lets the credit be given in any reasonable manner for the medium (its section 3(a)(2)), so
  it needn't be on screen all the time; but the credits screen must stay reachable and keep each CC BY work's title,
  author, licence (with links) and the change made (the recording cut and looped; the music levelled and
  re-encoded). `menus_test` checks that every menu screen fits a phone without scrolling.
- Style: match the surrounding code. Short functions, terse names, comments in plain English that say why (the
  physics and balance numbers say where they come from). British spelling in text and comments: metres, tyres,
  windscreen.
- Element ids share one namespace: check before adding one (`#flash` is the head-up display's message line; a button
  that reused it once hid every message).

## Testing

Browser tests are Playwright scripts that drive the real page in headless Chromium, many with in-page bots.

```bash
uv run --no-project --with playwright python tests/run.py                 # all of them (about 10 minutes)
uv run --no-project --with playwright python tests/run.py touch_test      # some of them
uv run --no-project --with playwright playwright install chromium         # once, where Chrome isn't installed
```

- Each test prints what it saw. Checks print `ok` or `FAIL`; the runner fails a test on a `FAIL` line, page errors
  (`ERRORS:` not `none`) or a crash. Screenshots go to `tests/out/` (gitignored): look at them after visual changes,
  in both layouts (phone 844x390 with touch, desktop 1440x900).
- Touch is emulated with CDP: `Emulation.setTouchEmulationEnabled` (`maxTouchPoints: 5`) and
  `Input.dispatchTouchEvent` (a `touchEnd` lists the finger that lifts). `Emulation.setSafeAreaInsetsOverride` fakes
  the iPhone's notch and home bar. Force a layout with `settings.layout = 'touch'; applyLayout()`.
- After changing anything that feeds Distance's economy or the race, run the simulations in `tests/balance/`
  (`act1.py [cheapest|value]`, `act2.py`, `act3.py` for the Fleet, `act4.py` for the War Rig, to the tank) and compare
  with the targets in the design notes.
- Testing is emulation only. Say so when a change depends on how a real phone behaves.
- Tests never send anything: the repository's build has no gate address. `reporting_test` builds the itch.io copy
  with `tools/build.py`, serves it over HTTP and answers its calls to the gate itself; `gate_test` runs the gate in the
  browser, with Deno and the database stood in for.
- The menu: the main game starts from `[data-play="distance"]` (NEW GAME, or CONTINUE with a save); the other games
  are behind ARCADE (`[data-show="arcade"]`, then `[data-play="free"]` etc.). Esc over a game opens the pause menu;
  `#to-main` goes on to the main menu.
- A system's tutorial, and an act's card, pops up over the garage the first time it opens in play (bought, or
  reached in a run, and that includes levels a test sets between runs); the first act's on a new game (no runs yet). Tests not
  about them mark them all seen in their setup: `toured: TUTORIALS.map(t => t.id)` in `progress` (the cards are in
  that list).
- **Debug mode**, for playtesting: tap the menu's REV IT title 5 times (then OK). Distance plays a separate save,
  copied from the game the first time, with unlimited metres, points, miles and parts (shown as ∞), every grid slot
  for sale and police heat rising ten times quicker, so the later acts are quick to reach; the same again switches it
  off and the real game comes back as it was. In a test: `settings.debug = true; applyDebug()`.
