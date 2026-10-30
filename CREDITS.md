# Credits

The code is released under the MIT license (see [LICENSE](LICENSE)). The engine sounds, the cars and the music are not
covered by it: `assets/sounds.js` and `assets/rig-sounds.js` hold audio derived from the recordings below, and each
keeps its own license;
`assets/cars.js` holds pixel art from the car pack below, under its own terms; `assets/music` holds the car stereo's
tapes, each under its own license or terms (below).

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
  - Each loop is normalized to the same loudness.
- **Dyno recordings:**
  - The rpm is tracked through each pull and the audio cut at fixed rpms.
  - Each piece is resampled so its pitch stays constant, then looped on whole engine cycles.
- **Idle recordings:** cut and looped.
- **Starter motor:** a 1.2 s stretch of cranking, cut and looped.
- **Filtering:**
  - The Turbo I6 loops are low-pass filtered at 5.5 kHz to tame the turbo whine.
  - The Boxer's idle is high-pass filtered at 120 Hz so small speakers can play it.

### The war rig's engines

Five more recordings from [Freesound](https://freesound.org), in `assets/rig-sounds.js`: the heavy engines act 5's war
rig will carry as parts (the game doesn't play them yet).

| Recording | Author | License | Used for |
|---|---|---|---|
| [truck mack transport semi trailer idle at red light and pull away slow long diesel rev](https://freesound.org/s/451935/) | [kyles](https://freesound.org/people/kyles/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Truck diesel, revving |
| [FORD LTL 9000_engine start and idle](https://freesound.org/s/435656/) | [YellowJacketStudios](https://freesound.org/people/YellowJacketStudios/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Truck diesel, idle |
| [WAR-TANK, LEOPARD-ENGINE STAND BY-Leopard 2A4 48000 cc diesel engine close by-0003](https://freesound.org/s/161897/) | [JoniHeinonen](https://freesound.org/people/JoniHeinonen/) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | Tank V12 diesel, idle |
| [Panssarivaunu ohi / Tank passing by and reversing back on sand, tracks creaking](https://freesound.org/s/386590/) | [YleArkisto](https://freesound.org/people/YleArkisto/) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Tank V12 diesel, revving |
| [Start-up Sound - U.S. Army M1A1 Tank - Gas Turbine Engine](https://freesound.org/s/542582/) | [adr1911](https://freesound.org/people/adr1911/) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | Gas turbine |

**Changes made,** by the same tool and in the same way as above (mono, 24 kHz, the same loudness; idles cut and looped;
the revs cut at fixed points, each piece resampled to a constant pitch and looped), with these differences:

- **Pitch:** these engines turn too slowly for the rpm tracker, so one strong harmonic is followed through each rev
  instead.
- **Truck diesel:** the revs are a Mack semi pulling away in first gear; the idle is a Ford LTL 9000's.
- **Tank:** the revs are a tank reversing on sand, track creak and all; the idle is a Leopard 2A4's.
- **Gas turbine:** cut from the turbine spooling up, with no idle loop of its own.

## Cars

The traffic's cars come from [JDM 90s pack](https://patricio449.itch.io/car-pack-jdm-sprites-whit-tuning-parts) by
[Pay 'n' Sprite](https://patricio449.itch.io/): five cars, from behind and in front, with their glass, interiors,
bumpers and spoilers as layers. Its terms: "You are free to use these assets in commercial and non-commercial
projects, including free-to-play mobile games. However, reselling or redistributing the assets as standalone is not
allowed." So the pack itself is not in this repository, and the art in `assets/cars.js` is not for reuse outside
Rev It.

**Changes made.** [`tools/make_cars.py`](tools/make_cars.py), run on a copy of the pack, puts each car together
(tires, the interior and glass over a dark cabin, the body) and keeps its bumpers, body kits and spoilers as layers,
written as palettes and runs of pixels. The game fits the parts at random, repaints each car in its traffic colors,
the racers' and police's liveries and the rust of Fuel madness, and draws on top the racers' stripes and numbers,
the police light bar, and the mad drivers' primer, rust holes, bars, pipe bar, spikes and dead tail light
(`js/road.js`).

## Music

The car stereo's tapes (`assets/music`), in the order they play:

| Tape | Author | License or terms | Radio |
|---|---|---|---|
| "Neon Laser Horizon" | Kevin MacLeod ([incompetech.com](https://incompetech.com)) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | synthwave |
| "Neon Outrun" | fulibacsi, made with [Suno](https://suno.com) | Suno's, see below | synthwave |
| "Chill Wave" | Kevin MacLeod ([incompetech.com](https://incompetech.com)) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | synthwave |
| "Chasing the Light" (光の追跡) | fulibacsi, made with [Suno](https://suno.com) | Suno's, see below | synthwave |
| "Newer Wave" | Kevin MacLeod ([incompetech.com](https://incompetech.com)) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | synthwave |
| "War Rigs Rolling" | fulibacsi, made with [Suno](https://suno.com) | Suno's, see below | War Rig |
| "Ember Charge" (余烬冲锋) | fulibacsi, made with [Suno](https://suno.com) | Suno's, see below | War Rig |
| "War Rigs of the Wasteland" | fulibacsi, made with [Suno](https://suno.com) | Suno's, see below | War Rig |

Kevin MacLeod's, as he asks to be credited: "Neon Laser Horizon", "Chill Wave" and "Newer Wave" Kevin MacLeod
(incompetech.com), Licensed under Creative Commons: By Attribution 4.0 License, http://creativecommons.org/licenses/by/4.0/

The five made with Suno were made on Suno's free plan. Under
[Suno's terms](https://help.suno.com/en/articles/9601601) Suno owns them and they may be used only for non-commercial
purposes, so Rev It, a free game, plays them, but they are not for reuse, and they would have to go if the game ever
earned money.

**Changes made.** [`tools/make_music.py`](tools/make_music.py) levels every tape to the same loudness (-16 LUFS),
rolls off the bass under 70 Hz (the engine has the low end) and encodes it as a 96 kbps MP3.

## Techniques

The code was written from scratch, following these write-ups:

- **The pseudo-3D road** (segments projected from the driver's seat, curves and hills): Jake Gordon's
  "How to build a racing game" articles on [codeincomplete.com](https://codeincomplete.com/).
- **The car physics** (engine torque through the transmission against drag, rolling resistance and brakes): Marco
  Monster's "Car Physics for Games".
