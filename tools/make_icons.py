# /// script
# dependencies = ["pillow"]
# ///
"""The home-screen icon: a rev counter, needle in the red. Writes assets/icon-180.png, -192.png, -512.png."""
import math
from pathlib import Path
from PIL import Image, ImageDraw
ASSETS = Path(__file__).resolve().parent.parent / "assets"
S = 1024  # draw big, scale down for smooth edges
img = Image.new("RGB", (S, S), "#0b0d16"); d = ImageDraw.Draw(img)
cx, cy, r = S / 2, S * 0.56, S * 0.36
d.ellipse([cx - r - 28, cy - r - 28, cx + r + 28, cy + r + 28], fill="#111", outline="#2c2c35", width=12)
for k in range(9):  # ticks from -135 to +135 degrees
    a = math.radians(-135 + k * 270 / 8)
    x1, y1 = cx + r * math.sin(a), cy - r * math.cos(a); x2, y2 = cx + (r - 70) * math.sin(a), cy - (r - 70) * math.cos(a)
    d.line([x1, y1, x2, y2], fill="#cccccc", width=22)
d.arc([cx - r + 10, cy - r + 10, cx + r - 10, cy + r - 10], start=-90 + 75, end=-90 + 135, fill="#cc2222", width=44)  # red zone
a = math.radians(100)  # the needle, in the red
d.line([cx, cy, cx + (r - 40) * math.sin(a), cy - (r - 40) * math.cos(a)], fill="#ff3333", width=34)
d.ellipse([cx - 52, cy - 52, cx + 52, cy + 52], fill="#333")
d.rounded_rectangle([cx - 150, S * 0.1, cx + 150, S * 0.1 + 26], radius=13, fill="#eecc44")  # a shift-light bar
for size in (180, 192, 512):
    img.resize((size, size), Image.LANCZOS).save(ASSETS / f"icon-{size}.png")
print("icons written")
