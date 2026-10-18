# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow"]
# ///
"""Builds assets/cars.js: the traffic's cars, put together from Pay 'n' Sprite's "JDM 90s pack".

    uv run tools/make_cars.py "path/to/JDM 90s pack"

The pack (patricio449.itch.io, free) may be used in games but not passed on as a pack, so it isn't in the repo:
download it, unzip it and point this at its folder. Each of its five cars is a body with its glass, interior,
bumpers and spoilers as layers, seen from behind and in front, 128 px square. This puts each together (tyres,
a dark cabin behind the glass, the interior, the glass, the body, a bumper and a spoiler), crops it, and writes it
as a palette and runs of it a row at a time, which the page turns into pixels at once (no image to wait for).
Per view it notes which colours are the paint (the page repaints them), and where the glass, the body, the tail
lights and the headlights are, for what the game draws on top (road.js).
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


def layer(car, *keys, no=()):
    """The car's first layer whose file name has all the keys and none of the no's (the pack's names vary)."""
    for f in sorted((PACK / car).iterdir()):
        n = f.name.lower()
        if all(k in n for k in keys) and not any(x in n for x in no):
            return Image.open(f).convert("RGBA")


def solid_box(im):
    """The bounding box of rows and columns with more than two pixels: a stray pixel doesn't count (ZX-7's front
    has one in its corner)."""
    a = im.getchannel("A").load()
    rows = [y for y in range(im.height) if sum(1 for x in range(im.width) if a[x, y]) > 2]
    cols = [x for x in range(im.width) if sum(1 for y in range(im.height) if a[x, y]) > 2]
    return min(cols), min(rows), max(cols) + 1, max(rows) + 1


def build(car, view, tuned=False):
    rear = view == "rear"
    if rear:
        body = layer(car, "rear", no=("interior", "window", "bumper", "kit"))
        glass, inner = layer(car, "window", "rear"), layer(car, "interior", "rear") or layer(car, "rear", "interior")
        kit = [layer(car, "rear bumper", str(n)) for n in range(6, 0, -1)] + [layer(car, "rear bumper")]
        extras = [next(b for b in kit if b), layer(car, "spoiler")] if tuned else []  # the boldest bumper, a wing
    else:
        body = layer(car, "front", no=("interior", "window", "bumper", "kit", "dash", "ligth", "light"))
        glass, inner = layer(car, "window", "front"), layer(car, "interior", "front") or layer(car, "dash")
        extras = []
    x0, y0, x1, y1 = solid_box(body)
    clean = Image.new("RGBA", body.size); clean.paste(body.crop((x0, y0, x1, y1)), (x0, y0)); body = clean
    bw, bh = x1 - x0, y1 - y0
    c = Image.new("RGBA", body.size)
    tyre = WHEEL.resize((round(bw * 0.15), round(bh * 0.34)), Image.NEAREST)  # behind the body, peeping out below
    for tx in (x0 + round(bw * 0.07), x1 - round(bw * 0.07) - tyre.width):
        c.alpha_composite(tyre, (tx, y1 - tyre.height + 4))
    gx0, gy0, gx1, gy1 = glass.getbbox()
    cabin = Image.new("RGBA", body.size); cabin.paste(CABIN, (0, 0, *body.size), glass.getchannel("A").point(lambda v: 255 if v else 0))
    for part in (cabin, inner, glass, body, *extras):
        if part:
            c.alpha_composite(part)
    box = c.getbbox(); c = c.crop(box)
    at = lambda b: [b[0] - box[0], b[1] - box[1], b[2] - box[0], b[3] - box[1]]
    paint = paint_colours(body, *extras)
    hue = lambda p: colorsys.rgb_to_hsv(*(v / 255 for v in p[:3]))
    lamp = (lambda h, s, v: (h < 0.07 or h > 0.93) and s > 0.45 and v > 0.45) if rear else (lambda h, s, v: s < 0.4 and v > 0.8)
    spots = [(x, y) for y in range(c.height) for x in range(c.width) if c.getpixel((x, y))[3] and lamp(*hue(c.getpixel((x, y))))
             and c.getpixel((x, y))[:3] not in paint]
    halves = [[p for p in spots if p[0] < c.width / 2], [p for p in spots if p[0] >= c.width / 2]]
    lamps = [[min(x for x, _ in h), min(y for _, y in h), max(x for x, _ in h) + 1, max(y for _, y in h) + 1] if h else None for h in halves]
    return c, {"glass": at((gx0, gy0, gx1, gy1)), "body": at((x0, y0, x1, y1)), "lamps" if rear else "lights": lamps}, paint


def paint_colours(*layers):
    """The body's paint: the colours near the most common one in hue (its shades), not the lights' or the trim's."""
    count = {}
    for im in layers:
        if im:
            for p in pixels(im):
                if p[3] == 255:
                    count[p[:3]] = count.get(p[:3], 0) + 1
    hsv = {p: colorsys.rgb_to_hsv(*(v / 255 for v in p)) for p in count}
    base = max((p for p in count if hsv[p][2] > 0.2), key=count.get)
    h0, s0, _ = hsv[base]
    near = lambda h: min(abs(h - h0), 1 - abs(h - h0)) < 0.05
    return {p for p in count if near(hsv[p][0]) and abs(hsv[p][1] - s0) < 0.3 and hsv[p][2] > 0.15}


def encode(im, paint):
    """A palette of #rrggbb (the paint first, its most used shade first of all) and the rows as runs: "3a" is
    three of colour a, a lone pixel is just its letter, "." see-through, rows end in "/"."""
    use = {}
    for p in pixels(im):
        if p[3]:
            use[p[:3]] = use.get(p[:3], 0) + 1
    order = sorted(use, key=lambda p: (p not in paint, -use[p]))
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
    return {"w": im.width, "h": im.height, "pal": ["#%02x%02x%02x" % p for p in order],
            "paint": sum(1 for p in order if p in paint), "rows": "/".join(rows)}


if __name__ == "__main__":
    PACK = Path(sys.argv[1])
    WHEEL = Image.open(PACK / "Wheel Sprites" / "Frame 0.png").convert("RGBA").crop((9, 8, 55, 92))
    art = {}
    for car in CARS:
        art[car] = {}
        for name, view, tuned in (("rear", "rear", False), ("front", "front", False), ("tuned", "rear", True)):
            im, where, paint = build(car, view, tuned)
            art[car][name] = {**encode(im, paint), **where}
    js = ("// Generated by tools/make_cars.py from \"JDM 90s pack\" by Pay 'n' Sprite (patricio449.itch.io), used under its\n"
          "// licence: free in games, not to be passed on or sold as assets. Not covered by this repository's MIT licence\n"
          "// (CREDITS.md). Per car: rear, front and tuned (rear, with a body kit and a wing); see make_cars.py\n"
          "const CAR_ART = " + json.dumps(art, separators=(",", ":")) + ";\n")
    OUT.write_text(js)
    print(f"{OUT}: {len(js) / 1000:.1f} kB")
