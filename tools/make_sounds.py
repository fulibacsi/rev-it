# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy", "soundfile"]
# ///
"""Builds assets/sounds.js: seamless constant-RPM engine loops cut from Freesound recordings; and assets/rig-sounds.js,
the heavy engines Distance's war rig can carry (act 5: loaded only once it needs them).

    uv run tools/make_sounds.py [folder]

folder: local copies of the previews, each named <anything>_<freesound id>.mp3, for a machine Freesound won't serve (it
turns away the cloud sessions: 30 Oct). Without it they are downloaded.

Dyno sweeps are pitch-tracked, cut at target RPMs, resampled so the pitch inside each
loop is constant, and looped on whole engine cycles. Idle loops come from idle recordings.
"""
import base64
import io
import json
import sys
import urllib.request
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal

OUT = Path(__file__).resolve().parent.parent / "assets" / "sounds.js"  # next to the page that loads it
RIG_OUT = OUT.with_name("rig-sounds.js")

SR = 24000  # output sample rate
SOURCES = {  # key: (preview url, credit)
    "hotrod": ("https://cdn.freesound.org/previews/213/213665_2214631-hq.mp3",
               "Dynamometer Pulls 1700HP by Ears68 (CC0) freesound.org/s/213665"),
    "vette": ("https://cdn.freesound.org/previews/712/712593_15419248-hq.mp3",
              "Big Cam C6 Corvette by Angel_soto (CC0) freesound.org/s/712593"),
    "supra": ("https://cdn.freesound.org/previews/496/496171_1784475-hq.mp3",
              "Import car revs on Chassis Dyno with Turbo by editboy23 (CC0) freesound.org/s/496171"),
    "frs": ("https://cdn.freesound.org/previews/183/183654_89652-hq.mp3",
            "DynoJet Scion FR-S by dezoris (CC0) freesound.org/s/183654"),
    "impreza": ("https://cdn.freesound.org/previews/369/369797_6850406-hq.mp3",
                "subaru impreza start up-idle-launch limiter by t33kno (CC0) freesound.org/s/369797"),
    "justy": ("https://cdn.freesound.org/previews/643/643126_3655844-hq.mp3",
              "Car Engine Start, Rev, Idle, Switch Off by iainmccurdy (CC BY 4.0) freesound.org/s/643126"),
    # the war rig's heavy engines (30 Oct; found by the owner's local session, its manifest's windows checked here)
    "mack": ("https://cdn.freesound.org/previews/451/451935_612689-hq.mp3",
             "truck mack transport semi trailer idle at red light and pull away slow long diesel rev by kyles (CC0) "
             "freesound.org/s/451935"),
    "ltl": ("https://cdn.freesound.org/previews/435/435656_2347916-hq.mp3",
            "FORD LTL 9000_engine start and idle by YellowJacketStudios (CC0) freesound.org/s/435656"),
    "leopard": ("https://cdn.freesound.org/previews/161/161897_2826383-hq.mp3",
                "WAR-TANK, LEOPARD-ENGINE STAND BY-Leopard 2A4 48000 cc diesel engine close by-0003 by JoniHeinonen "
                "(CC BY 3.0) freesound.org/s/161897"),
    "sand": ("https://cdn.freesound.org/previews/386/386590_4415905-hq.mp3",
             "Panssarivaunu ohi / Tank passing by and reversing back on sand, tracks creaking by YleArkisto (CC BY 4.0) "
             "freesound.org/s/386590"),
    "abrams": ("https://cdn.freesound.org/previews/542/542582_10366986-hq.mp3",
               "Start-up Sound - U.S. Army M1A1 Tank - Gas Turbine Engine by adr1911 (CC0) freesound.org/s/542582"),
}
# starter motor cranking, shared by all engines: (source, start s, length s, chug period s from envelope autocorrelation)
STARTER = ("justy", 2.08, 1.2, 0.243)
ENGINES = {
    # idle: (source, start s, length s, rpm); sweep: (source, start s, end s); loops: target rpms
    "v8": {"idle": ("vette", 11.5, 4.0, 825), "sweep": ("hotrod", 1.0, 13.4),
           "loops": [3300, 4200, 5100, 6000, 6800]},
    # the dyno recording has a loud turbo whine (7-12 kHz) at high rpm: cut it down so it doesn't pierce
    "supra": {"sweep": ("supra", 11.6, 25.4), "loops": [3300, 4200, 5200, 6200, 7200, 7900], "lowpass": 5500},
    # this idle is almost all sub-bass, which laptop speakers can't play: cut it before normalizing
    "boxer": {"idle": ("impreza", 6.5, 4.5, 855), "idle_highpass": 120, "sweep": ("frs", 8.4, 22.9),
              "loops": [3300, 4200, 5100, 6000, 6800, 7300]},
    # the war rig's (RIG_OUT). They turn too slowly for track_rpm (its range, and a 0.3 s window can't resolve their
    # harmonics), so one strong harmonic line is followed instead: line (band Hz, start Hz, rpm per Hz, window s).
    # Their rpms are a scale of their own, from that line: the truck an inline 6 (its idle line, 3 a turn, at 650 rpm),
    # the tank's V12 idling at 670, the turbine's in Hz of its whine. A truck diesel: a Mack semi pulling away in 1st,
    # the idle a Ford LTL 9000's (the Mack's own is 3 s)
    "truck": {"idle": ("ltl", 40.0, 4.5, 608), "sweep": ("mack", 3.1, 5.8), "line": ((38, 110), 42.5, 20, 0.25),
              "loops": [900, 1150, 1400, 1650, 1900]},
    # a tank's V12 diesel: a Leopard 2A4 idling, and a tank reversing on sand (tracks creaking)
    "tank": {"idle": ("leopard", 20.0, 4.5, 670), "sweep": ("sand", 41.0, 45.5), "line": ((40, 90), 45.8, 15, 0.4),
             "loops": [760, 880, 1000, 1120]},
    # the M1A1's gas turbine spooling up to speed: its whine rises steadily for 8 s, then wanders, so no idle loop
    "turbine": {"sweep": ("abrams", 3.0, 11.0), "line": ((2800, 6800), 3276, 1, 0.4),
                "loops": [3500, 4100, 4700, 5300, 5900, 6300]},
}
RIG = {"truck", "tank", "turbine"}  # written to RIG_OUT
LOOP_SECONDS, SEAM_SECONDS = 0.8, 0.1


def load(key, folder=None):
    if folder:
        data = next(Path(folder).glob(f"*_{SOURCES[key][0].rsplit('/', 1)[1].split('_')[0]}.mp3")).read_bytes()
    else:
        with urllib.request.urlopen(SOURCES[key][0]) as r:
            data = r.read()
    x, sr = sf.read(io.BytesIO(data), always_2d=True)
    x = signal.resample_poly(x.mean(axis=1), SR, sr)
    return signal.sosfiltfilt(signal.butter(2, 25, "highpass", fs=SR, output="sos"), x)


def track_rpm(x, rpm_min=2800, rpm_max=8600, win=0.3, hop=0.025, fmax=1200):
    """RPM over time: harmonic comb contrast at half-order spacing, smoothed with Viterbi."""
    f, t, Z = signal.stft(x, SR, nperseg=int(win * SR), noverlap=int((win - hop) * SR), nfft=1 << 15)
    S = 20 * np.log10(np.abs(Z[f < fmax + 200]) + 1e-9)
    S -= signal.medfilt2d(S, (31, 1))
    H = np.geomspace(rpm_min / 120, rpm_max / 120, 400)  # half-order spacing = rpm / 120
    score = np.empty((len(H), S.shape[1]))
    for i, h in enumerate(H):
        k = np.arange(1, int(fmax / h) + 1)
        score[i] = S[np.round(k * h / f[1]).astype(int)].mean(0) - S[np.round((k + 0.5) * h / f[1]).astype(int)].mean(0)
    maxj = int(np.ceil(np.log(1.03) / np.log(H[1] / H[0])))
    acc, back = score[:, 0].copy(), np.zeros(score.shape, int)
    for j in range(1, score.shape[1]):
        cand = np.full((2 * maxj + 1, len(H)), -np.inf)
        for n, d in enumerate(range(-maxj, maxj + 1)):
            lo, hi = max(0, d), len(H) + min(0, d)
            cand[n, lo:hi] = acc[lo - d:hi - d] - 0.5 * abs(d)
        best = cand.argmax(0)
        acc, back[:, j] = cand[best, np.arange(len(H))] + score[:, j], np.arange(len(H)) - (best - maxj)
    idx = [int(acc.argmax())]
    for j in range(score.shape[1] - 1, 0, -1):
        idx.append(back[idx[-1], j])
    return t, H[idx[::-1]] * 120


def follow_line(x, band, start, win, hop=0.02, step=0.04):
    """One harmonic line's Hz over time: from `start`, the strongest peak within `step` of the last, inside `band`."""
    f, t, Z = signal.stft(x, SR, nperseg=int(win * SR), noverlap=int((win - hop) * SR), nfft=1 << 16)
    A, (lo, hi), cur, out = np.abs(Z), np.searchsorted(f, band), start, []
    for j in range(A.shape[1]):
        a, b = np.searchsorted(f, [cur * (1 - step), cur * (1 + step)])
        a, b = max(a, lo), min(max(b, a + 1), hi)
        cur = f[a + np.argmax(A[a:b, j])]
        out.append(cur)
    return t, signal.medfilt(np.array(out), 5)


def make_loop(x, period):
    """Loop on as many whole periods (seconds) as fit, with a linear seam crossfade."""
    cycle = period * SR
    xf = int(SEAM_SECONDS * SR)
    n = int(round(int((len(x) - xf) / cycle) * cycle))
    ramp = np.linspace(0, 1, xf)
    loop = x[:n].copy()
    loop[:xf] = x[:xf] * ramp + x[n:n + xf] * (1 - ramp)
    return loop


def flatten(x, t, rpm, target):
    """Resample so the tracked pitch becomes constant at `target` rpm."""
    tau = np.arange(len(x)) / SR
    u = np.cumsum(np.interp(tau, t, rpm) / target) / SR  # output time for each input sample
    out_t = np.arange(0, u[-1], 1 / SR)
    return np.interp(np.interp(out_t, u, tau), tau, x)


def loop_filter(sos, x):  # filter a loop as if it repeats forever, so the seam stays seamless
    return signal.sosfiltfilt(sos, np.tile(x, 3))[len(x):2 * len(x)]


def unwav(b64):
    return sf.read(io.BytesIO(base64.b64decode(b64)))[0]


def wav_b64(x):
    x = x / np.sqrt(np.mean(x ** 2)) * 10 ** (-18 / 20)  # -18 dBFS RMS
    buf = io.BytesIO()
    sf.write(buf, np.clip(x, -1, 1), SR, format="WAV", subtype="PCM_16")
    return base64.b64encode(buf.getvalue()).decode()


def main(folder=None):
    audio = {k: load(k, folder) for k in SOURCES}
    out = {}
    for name, cfg in ENGINES.items():
        loops = []
        if "idle" in cfg:
            src, start, length, rpm = cfg["idle"]
            seg = audio[src][int(start * SR):int((start + length) * SR)]
            if "idle_highpass" in cfg:
                seg = signal.sosfiltfilt(signal.butter(2, cfg["idle_highpass"], "highpass", fs=SR, output="sos"), seg)
            loops.append([rpm, wav_b64(make_loop(seg, 120 / rpm))])  # engine cycle = 2 crank turns
        src, a, b = cfg["sweep"]
        sweep = audio[src][int(a * SR):int(b * SR)]
        if "line" in cfg:
            band, start, per_hz, win = cfg["line"]
            t, line = follow_line(sweep, band, start, win)
            rpm = line * per_hz
        else:
            t, rpm = track_rpm(sweep)
        size = int((LOOP_SECONDS + SEAM_SECONDS) * SR)
        for target in cfg["loops"]:
            mid = t[np.argmin(np.abs(rpm - target))]
            i0 = max(0, int(mid * SR) - size)
            seg = flatten(sweep[i0:i0 + 2 * size], t - i0 / SR, rpm, target)
            off = max(0, (len(seg) - size) // 2)
            loops.append([target, wav_b64(make_loop(seg[off:off + size], 120 / target))])
            print(f"{name:6s} {target:5d} rpm  from {src} @ {a + mid:5.2f}s (tracked {np.interp(mid, t, rpm):5.0f})")
        if "lowpass" in cfg:
            sos = signal.butter(4, cfg["lowpass"], "lowpass", fs=SR, output="sos")
            loops = [[rpm, wav_b64(loop_filter(sos, unwav(b64)))] for rpm, b64 in loops]
        out[name] = loops
    src, start, length, period = STARTER
    out["starter"] = wav_b64(make_loop(audio[src][int(start * SR):int((start + length) * SR)], period))
    rig = {name: out.pop(name) for name in ENGINES if name in RIG}  # in ENGINES order, so a rebuild writes the same file
    used = lambda names: {k for n in names for k in (ENGINES[n].get("idle", [None])[0], ENGINES[n]["sweep"][0])}
    for path, const, sounds, keys in [(OUT, "SOUNDS", out, used(set(ENGINES) - RIG) | {STARTER[0]}),
                                      (RIG_OUT, "RIG_SOUNDS", rig, used(RIG))]:
        credits = "\n".join(f"//   {c}" for k, (_, c) in SOURCES.items() if k in keys)
        with open(path, "w") as fh:
            fh.write(f"// Generated by tools/make_sounds.py. Engine loops as [rpm, base64 WAV]. Sources (Freesound):\n{credits}\n")
            fh.write(f"const {const} = {json.dumps(sounds)};\n")
        print(f"wrote {path}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
