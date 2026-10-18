# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow"]
# ///
"""Builds assets/cars.js: the traffic's cars, from Pay 'n' Sprite's "JDM 90s pack".

    uv run tools/make_cars.py "path/to/JDM 90s pack"

The pack (patricio449.itch.io, free) may be used in games but not passed on as a pack, so it isn't in the repo:
download it, unzip it and point this at its folder. Each of its five cars is a body with its glass, interior,
bumpers, body kits and spoilers as layers, seen from behind and in front, 128 px square ("fully compatible with
each other", the artist says). This writes, for each car and view, the car put together (tyres, a dark cabin
behind the glass, the interior, the glass, the body) and each bumper and spoiler as a layer of its own, all placed
in one frame, so the page can fit any of them (road.js). A layer is a palette and runs of it a row at a time, which
the page turns into pixels at once (no image to wait for); its first colours are the paint, which the page repaints
against the view's main paint colour. Each view also notes where the glass, the body, the tail lights and the
headlights are, for what the game draws on top.
"""
import colorsys
import json
import sys
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "assets" / "cars.js"
CARS = ["Eclize", "JTR-34", "MS-X", "ZPA MKIV", "ZX-7"]
CABIN = (27, 24, 40, 255)  # behind the glass (the pack's glass is half see-through): a dark cabin at dusk
CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"  # palette entries; "." is see-through


def pixels(im):
    """Its RGBA pixels, row by row."""
    return list(zip(*[iter(im.tobytes())] * 4))


def layers(car, *keys, no=()):
    """The car's layers whose file names have all the keys and none of the no's (the pack's names vary), in order."""
    return [Image.open(f).convert("RGBA") for f in sorted((PACK / car).iterdir())
            if all(k in f.name.lower() for k in keys) and not any(x in f.name.lower() for x in no)]


def solid_box(im):
    """The bounding box of rows and columns with more than two pixels: a stray pixel doesn't count (ZX-7's front
    has one in its corner)."""
    a = im.getchannel("A").load()
    rows = [y for y in range(im.height) if sum(1 for x in range(im.width) if a[x, y]) > 2]
    cols = [x for x in range(im.width) if sum(1 for y in range(im.height) if a[x, y]) > 2]
    return min(cols), min(rows), max(cols) + 1, max(rows) + 1


def view(car, rear):
    """The car put together, its bumpers (body kits too) and spoilers, all in one frame, and where things are."""
    side = "rear" if rear else "front"
    body = next(iter(layers(car, side, no=("interior", "window", "bumper", "kit", "dash", "ligth", "light"))))
    glass = layers(car, "window", side)[0]
    inner = (layers(car, "interior", side) or layers(car, side, "interior") or layers(car, "dash") or [None])[0]
    bumpers = layers(car, f"{side} bumper") + layers(car, "kit", side)
    spoilers = layers(car, "spoiler") if rear else []
    x0, y0, x1, y1 = solid_box(body)
    clean = Image.new("RGBA", body.size); clean.paste(body.crop((x0, y0, x1, y1)), (x0, y0)); body = clean
    bw, bh = x1 - x0, y1 - y0
    car_im = Image.new("RGBA", body.size)
    tyre = WHEEL.resize((round(bw * 0.15), round(bh * 0.34)), Image.NEAREST)  # behind the body, peeping out below
    for tx in (x0 + round(bw * 0.07), x1 - round(bw * 0.07) - tyre.width):
        car_im.alpha_composite(tyre, (tx, y1 - tyre.height + 4))
    cabin = Image.new("RGBA", body.size)
    cabin.paste(CABIN, (0, 0, *body.size), glass.getchannel("A").point(lambda v: 255 if v else 0))
    for part in (cabin, inner, glass, body):
        if part:
            car_im.alpha_composite(part)
    boxes = [im.getbbox() for im in (car_im, *bumpers, *spoilers)]
    frame = min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)
    at = lambda b: [b[0] - frame[0], b[1] - frame[1], b[2] - frame[0], b[3] - frame[1]]
    base, paint = paint_colours(body)
    hsv = lambda p: colorsys.rgb_to_hsv(*(v / 255 for v in p[:3]))
    lamp = (lambda h, s, v: (h < 0.07 or h > 0.93) and s > 0.45 and v > 0.45) if rear else (lambda h, s, v: s < 0.4 and v > 0.8)
    im = car_im.crop(frame)
    spots = [(x, y) for y in range(im.height) for x in range(im.width) if im.getpixel((x, y))[3]
             and lamp(*hsv(im.getpixel((x, y)))) and not paint(im.getpixel((x, y)))]
    halves = [[p for p in spots if p[0] < im.width / 2], [p for p in spots if p[0] >= im.width / 2]]
    lights = [[min(x for x, _ in h), min(y for _, y in h), max(x for x, _ in h) + 1, max(y for _, y in h) + 1] if h else None
              for h in halves]
    return {"w": frame[2] - frame[0], "h": frame[3] - frame[1], "base": "#%02x%02x%02x" % base,
            "glass": at(glass.getbbox()), "body": at((x0, y0, x1, y1)), "lamps" if rear else "lights": lights,
            "car": encode(car_im, frame, paint), "bumpers": [encode(b, frame, paint) for b in bumpers],
            "spoilers": [encode(s, frame, paint) for s in spoilers]}


def paint_colours(body):
    """The body's main paint colour, and a test for its shades: near it in hue and saturation (not the lights')."""
    count = {}
    for p in pixels(body):
        if p[3] == 255:
            count[p[:3]] = count.get(p[:3], 0) + 1
    hsv = lambda p: colorsys.rgb_to_hsv(*(v / 255 for v in p[:3]))
    base = max((p for p in count if hsv(p)[2] > 0.2), key=count.get)
    h0, s0, _ = hsv(base)
    def paint(p):
        h, s, v = hsv(p)
        return min(abs(h - h0), 1 - abs(h - h0)) < 0.05 and abs(s - s0) < 0.3 and v > 0.15
    return base, paint


def encode(im, frame, paint):
    """A layer: where it sits in the frame, a palette of #rrggbb (the paint first) and the rows as runs: "3a" is
    three of colour a, a lone pixel is just its letter, "." see-through, rows end in "/"."""
    box = im.getbbox(); im = im.crop(box)
    use = {}
    for p in pixels(im):
        if p[3]:
            use[p[:3]] = use.get(p[:3], 0) + 1
    order = sorted(use, key=lambda p: (not paint(p), -use[p]))
    assert len(order) <= len(CHARS), len(order)
    key = {p: CHARS[i] for i, p in enumerate(order)}
    rows = []
    for y in range(im.height):
        row, run, last = "", 0, None
        for x in range(im.width + 1):
            p = im.getpixel((x, y)) if x < im.width else None
            ch = None if p is None else "." if p[3] == 0 else key[p[:3]]
            if ch == last:
                run += 1
                continue
            if last is not None:
                row += (str(run) if run > 1 else "") + last
            last, run = ch, 1
        rows.append(row.rstrip("."))
    return {"x": box[0] - frame[0], "y": box[1] - frame[1], "w": im.width, "pal": ["#%02x%02x%02x" % p for p in order],
            "paint": sum(1 for p in order if paint(p)), "rows": "/".join(rows)}


if __name__ == "__main__":
    PACK = Path(sys.argv[1])
    WHEEL = Image.open(PACK / "Wheel Sprites" / "Frame 0.png").convert("RGBA").crop((9, 8, 55, 92))
    art = {car: {"rear": view(car, True), "front": view(car, False)} for car in CARS}
    js = ("// Generated by tools/make_cars.py from \"JDM 90s pack\" by Pay 'n' Sprite (patricio449.itch.io), used under its\n"
          "// licence: free in games, not to be passed on or sold as assets. Not covered by this repository's MIT licence\n"
          "// (CREDITS.md). Per car, from behind and in front: the car, and its bumpers and spoilers as layers; see make_cars.py\n"
          "const CAR_ART = " + json.dumps(art, separators=(",", ":")) + ";\n")
    OUT.write_text(js)
    print(f"{OUT}: {len(js) / 1000:.1f} kB; parts: " + ", ".join(
        f"{c} {len(a['rear']['bumpers'])}+{len(a['rear']['spoilers'])}/{len(a['front']['bumpers'])}" for c, a in art.items()))
