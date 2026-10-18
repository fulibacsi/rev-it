# Credits

The code is released under the MIT license (see [LICENSE](LICENSE)). The engine sounds and the cars are not covered
by it: `assets/sounds.js` holds audio derived from the recordings below, and each keeps its own license;
`assets/cars.js` holds pixel art from the car pack below, under its own terms.

## Sounds

All six recordings come from [Freesound](https://freesound.org).

| Recording | Author | License | Used for |
|---|---|---|---|
| [Dynamometer Pulls 1700HP](https://freesound.org/s/213665/) | [Ears68](https://freesound.org/people/Ears68/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Muscle V8, revving |
| [Big Cam C6 Corvette](https://freesound.org/s/712593/) | [Angel_soto](https://freesound.org/people/Angel_soto/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Muscle V8, idle |
| [Import car revs on Chassis Dyno with Turbo](https://freesound.org/s/496171/) | [editboy23](https://freesound.org/people/editboy23/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | JDM Turbo I6 |
| [DynoJet Scion FR-S](https://freesound.org/s/183654/) | [dezoris](https://freesound.org/people/dezoris/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | JDM Boxer, revving |
| [subaru impreza start up-idle-launch limiter](https://freesound.org/s/369797/) | [t33kno](https://freesound.org/people/t33kno/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | JDM Boxer, idle |
| [Car Engine Start, Rev, Idle, Switch Off](https://freesound.org/s/643126/) | [iainmccurdy](https://freesound.org/people/iainmccurdy/) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Starter motor, all engines |

**Changes made.** [`tools/make_sounds.py`](tools/make_sounds.py) turns the recordings into short loops:

- **Basic processing (all six):**
  - Freesound's preview files are mixed to mono and resampled to 24 kHz.
  - Each loop is normalised to the same loudness.
- **Dyno recordings:**
  - The rpm is tracked through each pull and the audio cut at fixed rpms.
  - Each piece is resampled so its pitch stays constant, then looped on whole engine cycles.
- **Idle recordings:** cut and looped.
- **Starter motor:** a 1.2 s stretch of cranking, cut and looped.
- **Filtering:**
  - The Turbo I6 loops are low-pass filtered at 5.5 kHz to tame the turbo whine.
  - The Boxer's idle is high-pass filtered at 120 Hz so small speakers can play it.

## Cars

The traffic's cars come from [JDM 90s pack](https://patricio449.itch.io/car-pack-jdm-sprites-whit-tuning-parts) by
[Pay 'n' Sprite](https://patricio449.itch.io/): five cars, from behind and in front, with their glass, interiors,
bumpers and spoilers as layers. Its terms: "You are free to use these assets in commercial and non-commercial
projects, including free-to-play mobile games. However, reselling or redistributing the assets as standalone is not
allowed." So the pack itself is not in this repository, and the art in `assets/cars.js` is not for reuse outside
Rev It.

**Changes made.** [`tools/make_cars.py`](tools/make_cars.py), run on a copy of the pack, puts each car together
(tyres, the interior and glass over a dark cabin, the body, a bumper, and for the racers a body kit and a wing) and
writes it as a palette and runs of pixels. The game repaints each car in its traffic colours, the racers' and
police's liveries and the rust of Fuel madness, and draws on top the racers' stripes and numbers, the police light
bar, and the mad drivers' bars, spikes and dead tail light (`js/road.js`).

## Techniques

The code was written from scratch, following these write-ups:

- **The pseudo-3D road** (segments projected from the driver's seat, curves and hills): Jake Gordon's
  "How to build a racing game" articles on [codeincomplete.com](https://codeincomplete.com/).
- **The car physics** (engine torque through the gearbox against drag, rolling resistance and brakes): Marco Monster's
  "Car Physics for Games".
