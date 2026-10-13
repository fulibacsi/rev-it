# Phase 3 build plan: the overnight push to feature complete

A working prompt for Claude, written 13 Oct before the context was compressed. Read it, then `CLAUDE.md` and
`docs/design-notes.md` (the "Phase 3" section holds every decision), and start building.

## The goal and how to work

- **Feature complete by the morning.** The owner is asleep: **don't wait for answers and don't ask questions.** Where a
  detail is open, take the sensible reading, build it, and note the decision in the design notes ("Claude's call").
- After the build the owner tests everything and records bugs and feedback. Balancing comes after the bugs are fixed,
  so first guesses for prices and rates are fine now (keep them in the style of the existing ones).
- Grow it in layers: each step works end to end and is pushed before the next starts. A smaller working feature beats
  a bigger broken one.

## Rules (from `CLAUDE.md` and the owner)

- **Branches:** one per change, named for it: `feature/<change>` or `fix/<change>`, never the session's branch. Base
  each new branch on the previous unmerged one in the order below (the owner merges in the morning, in that order), so
  each PR shows only its own change once the one before is merged. Never push to `main` or merge into it.
- **Commits:** the owner as author, `git commit --author "fulibacsi <fulibacsi@gmail.com>"`, and a
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer (plus the session's `Claude-Session:` line).
- **Push each commit as soon as it is done** (`git push -u origin <branch>`): in cloud sessions there is no asking.
  Don't open pull requests: the owner does.
- **Tests:** in this cloud container the Python Playwright must match the installed browser (build 1194):
  `uv run --no-project --with playwright==1.56.0 python tests/run.py [names]`. Run the related tests while working and
  the full suite (about 12 minutes, in the background) before the last push of each branch. Every new behaviour gets
  a test with `ok`/`FAIL` checks. Look at screenshots of visual changes in both layouts, the phone one with the iPhone
  insets (`Emulation.setSafeAreaInsetsOverride` left 59, right 59, bottom 21).
- **Balance:** anything that feeds the economy or the race gets a run of `tests/balance/act2.py 60 <seed>` over a few
  seeds (11, 22, 33, 44): one seed alone moves P1 by up to 7 races. Report means and ranges.
- **Keep it diegetic** (devices on the car, not floating buttons) and **never hint at the hidden race** before the
  reveal. British spelling. Match the surrounding code's style.
- **Debug mode** (5 taps on the menu title) gives unlimited metres and points; extend it to miles and parts so the
  owner can test the new pages.
- Keep the design notes current: when a decided item is built, move it into the description of how the game plays.

## The order

1. `fix/iphone-overlaps`: on the iPhone (notch insets) the ignition key overlaps the rev counter and the menu button
   covers the G of GARAGE. Fix both; extend `buttons_layout` or `phone_test` to check them with the insets.
2. `fix/aids-yield-only-to-your-touch`: every automation keeps working unless you touch that control. Pushing the
   nitro pedal no longer counts as your foot on the gas: traction control and autocruise's braking carry on.
3. `fix/ecu-in-every-gear`: the ECU tune works in every gear with the aids driving, heat-aware like Reckless
   auto-drive's (the factory map from heat 0.6, the tune again below 0.4). Rework `ecu_test`'s "revs held at the
   factory redline" checks accordingly; it must still be no slower than untuned. Run act2.
4. `feature/hud-transparency`: the head-up display a bit more transparent, so traffic shows through.
5. `feature/flash-recharge`: a new upgrade after Headlight flash (needs it maxed): flashes come back over time, up to
   one every 2 s. Show the refill on the high-beam telltale.
6. `feature/auto-flash-chicken`: Auto flash plays chicken once Game of chicken is bought (flashes an oncoming car that
   can swerve when you're in its lane); Reckless auto-drive uses everything, Auto flash included.
7. `feature/fleet-miles`: the Fleet page (only once you've reached P1; never mentioned before), miles as a currency,
   the Exchange card (metres to miles one way, 1,609 m a mile, a slider, "all available", miles shown).
8. `feature/fleet-cars`: pay racers off to join your team; each takes its racer's place in the 100-car field, each costs
   more than the last. In a race fleet cars give way to you, block racers, and use their upgrades for you.
9. `feature/fleet-upgrades`: fleet-wide upgrades in miles (pace, flash, and what else makes sense).
10. `feature/fleet-sonar`: the A-pillar device in the top left corner showing your fleet cars behind you (keep it
    clear of the menu button and the island).
11. `feature/mad-max-targets`: the gang unlocks at 51 fleet cars in the field; the task "total a car"; the AR reticle
    and health bar on the target car, retargeting when you pass it; bumps damage the car hit; at 0 health it spins
    off and its parts are collected; wrecked racers are out of the race. The Mad Max page, paid in parts.
12. `feature/mad-max-upgrades`: bull bars (you lose less speed, they take more), illegal parts; the gang uses
    whatever offensive upgrades it has.
13. `feature/guns`: the last upgrades; the wheel's red marker becomes the trigger with FIRE on it; shots damage the
    target; the gang fires too.
14. `feature/police-heat`: a police scanner on the dash; heat rises slowly with totals and shots, stays between races,
    no bribes; police overtake you then brake, and floor it at you head-on in the oncoming lanes.
15. `feature/final-boss`: past the threshold the tank (or a more fitting armoured opponent) appears and shoots you; you
    and the gang outgun it; losing is a DNF and heat drops; winning is the ending, then play on.
16. `fix/autocruise-top-speed`: autocruise aims for top speed (it brakes a lot at 300+ km/h with both lanes blocked).
    Prove it with the simulations (act1 and act2) before keeping it.
17. Only once all of that works: the pricing pass is the owner's next step. Don't start it unless everything above is
    pushed and green, and then only as simulations and a proposal.

## When the night is over

End with a report for the owner: the branches in merge order, what each does, how it was verified (tests,
simulations), every "Claude's call" made, what's known to be missing or rough, and what to test first on the phone.
