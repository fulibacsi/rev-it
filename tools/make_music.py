# /// script
# requires-python = ">=3.10"
# ///
"""Builds assets/music: the car stereo's tapes (js/stereo.js), an MP3 each.

    uv run tools/make_music.py "path/to/the Suno songs"

Kevin MacLeod's three (incompetech.com, CC BY 4.0) are fetched from incompetech, or from a copy in another game's
repository when incompetech is out of reach, and must match the original's SHA-256 either way. The other five are the
owner's, made with Suno on its free plan (18 Oct): Suno owns them and they may be used only non-commercially, so there
is nowhere to fetch them from. Point this at the folder that has them, under the file names TAPES gives.

Each tape is levelled to LUFS (ffmpeg's loudnorm, measured first, then one gain: the music keeps its dynamics), its
bass under CUT Hz rolled off (the engine has the low end), and encoded at 96 kbps and 44.1 kHz: MP3 plays on every
iPhone, Opus only from iOS 18.4. Needs ffmpeg.
"""
import hashlib
import json
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets" / "music"
LUFS, PEAK, CUT = -16, -1.5, 70
INCOMPETECH = "https://incompetech.com/music/royalty-free/mp3-royaltyfree/"
# file in assets/music: Kevin MacLeod's title, the original's SHA-256 (pinned by FavioVazquez/showtime's
# library_manifest.json, which fetched them from incompetech) and a copy of it on GitHub; or the Suno song's file name
TAPES = {
    "neon-laser-horizon": ("Neon Laser Horizon", "1921dce762a8589e1f50fe68f827701a129946884eccd33a36c9ac7e1c2c8005",
                           "https://raw.githubusercontent.com/kanobi/kacha/HEAD/sound/Neon%20Laser%20Horizon.mp3"),
    "neon-outrun": "Neon_Outrun.mp3",
    "chill-wave": ("Chill Wave", "7f07fbf89860959ff527f7b74606146dd0b0de263739989a70ce712c7c361614",
                   "https://raw.githubusercontent.com/2143-Labs/brickBreaker-reimagined/HEAD/assets/music/Chill%20Wave.mp3"),
    "chasing-the-light": "japanese_synthwave.mp3",  # 光の追跡
    "newer-wave": ("Newer Wave", "ef26589e066cc2f60f9523f8a3c17e543f57fc9e1145efc3bc46f7e5db92d0bc",
                   "https://raw.githubusercontent.com/kanobi/kacha/HEAD/sound/Newer%20Wave.mp3"),
    "war-rigs-rolling": "War_Rigs_Rolling.mp3",
    "ember-charge": "dark_synthwave.mp3",  # 余烬冲锋
    "war-rigs-of-the-wasteland": "War_Rigs_of_the_Wasteland.mp3",
}


def fetch(title, sha, mirror, into):
    """Kevin MacLeod's original, from incompetech or the copy, checked against its SHA-256."""
    for url in (INCOMPETECH + urllib.parse.quote(title) + ".mp3", mirror):
        try:
            data = urllib.request.urlopen(url, timeout=60).read()
        except OSError as e:
            print(f"  {url}: {e}")
            continue
        if hashlib.sha256(data).hexdigest() == sha:
            (into / f"{title}.mp3").write_bytes(data)
            return into / f"{title}.mp3"
        print(f"  {url}: not the original (SHA-256 differs)")
    sys.exit(f"{title}: no copy matches the original")


def build(src, out):
    """Levelled, the bass rolled off, as a 96 kbps MP3."""
    shape = f"highpass=f={CUT},loudnorm=I={LUFS}:TP={PEAK}:LRA=20"
    run = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-af", shape + ":print_format=json",
                          "-f", "null", "-"], capture_output=True, text=True, check=True).stderr
    m = json.loads(run[run.rindex("{"):])
    shape += (f":measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
              f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-map", "0:a", "-map_metadata", "-1", "-af", shape,
                    "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "96k", str(out)], check=True)


if __name__ == "__main__":
    suno = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for name, source in TAPES.items():
            src = suno / source if isinstance(source, str) else fetch(*source, Path(tmp))
            build(src, OUT / f"{name}.mp3")
            print(f"{name}.mp3: {(OUT / f'{name}.mp3').stat().st_size / 1e6:.1f} MB")
