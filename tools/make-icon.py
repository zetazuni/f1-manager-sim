"""Draw the Zetrace app icon (1024 px master) in the "paddock at dusk" style.

    python tools/make-icon.py src/web-ui/src-tauri/app-icon.png

A dusk gradient rounded square, a soft lantern glow, the red rounded Z badge
with an amber halo, and a thin chequered strip along the bottom edge.
`npx tauri icon` then makes every size from this file.
"""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

S = 1024
out = sys.argv[1] if len(sys.argv) > 1 else 'app-icon.png'


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


# dusk gradient background
bg = Image.new('RGB', (S, S))
top, mid, bot = (0x24, 0x1c, 0x4a), (0x1a, 0x13, 0x2e), (0x3a, 0x1d, 0x2c)
px = bg.load()
for y in range(S):
    t = y / (S - 1)
    c = lerp(top, mid, t / 0.55) if t < 0.55 else lerp(mid, bot, (t - 0.55) / 0.45)
    for x in range(S):
        px[x, y] = c

# lantern glow low-left and rose glow right
glow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
g = ImageDraw.Draw(glow)
g.ellipse((-200, 560, 560, 1240), fill=(246, 178, 94, 120))
g.ellipse((560, 380, 1200, 1020), fill=(242, 122, 138, 80))
glow = glow.filter(ImageFilter.GaussianBlur(140))
bg = Image.alpha_composite(bg.convert('RGBA'), glow)

# rounded-square mask (squircle-ish)
mask = Image.new('L', (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, S - 1, S - 1), radius=230, fill=255)

# badge halo
halo = Image.new('RGBA', (S, S), (0, 0, 0, 0))
ImageDraw.Draw(halo).rounded_rectangle((230, 190, 794, 754), radius=150, fill=(225, 40, 20, 200))
halo = halo.filter(ImageFilter.GaussianBlur(70))
bg = Image.alpha_composite(bg, halo)

# red badge with a soft top highlight
badge = Image.new('RGBA', (S, S), (0, 0, 0, 0))
b = ImageDraw.Draw(badge)
b.rounded_rectangle((262, 222, 762, 722), radius=128, fill=(225, 6, 0, 255))
hl = Image.new('RGBA', (S, S), (0, 0, 0, 0))
ImageDraw.Draw(hl).rounded_rectangle((262, 222, 762, 470), radius=128, fill=(255, 255, 255, 40))
badge = Image.alpha_composite(badge, hl)
bg = Image.alpha_composite(bg, badge)

# the Z: a heavy geometric glyph drawn as a polygon (no font dependency)
d = ImageDraw.Draw(bg)
cx, cy, w, h, t = 512, 472, 300, 300, 74
x0, x1, y0, y1 = cx - w / 2, cx + w / 2, cy - h / 2, cy + h / 2
z = [
    (x0, y0), (x1, y0), (x1, y0 + t),
    (x0 + t * 1.25, y1 - t), (x1, y1 - t), (x1, y1),
    (x0, y1), (x0, y1 - t),
    (x1 - t * 1.25, y0 + t), (x0, y0 + t),
]
shadow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
ImageDraw.Draw(shadow).polygon([(x + 8, y + 12) for x, y in z], fill=(80, 0, 0, 150))
shadow = shadow.filter(ImageFilter.GaussianBlur(10))
bg = Image.alpha_composite(bg, shadow)
d = ImageDraw.Draw(bg)
d.polygon(z, fill=(255, 246, 236, 255))

# chequered strip near the bottom
sq, rows, y_top = 34, 2, 830
for r in range(rows):
    for i in range(0, S // sq + 1):
        if (i + r) % 2 == 0:
            d.rectangle((i * sq, y_top + r * sq, i * sq + sq - 1, y_top + r * sq + sq - 1), fill=(255, 246, 236, 210))
        else:
            d.rectangle((i * sq, y_top + r * sq, i * sq + sq - 1, y_top + r * sq + sq - 1), fill=(18, 14, 31, 210))

icon = Image.new('RGBA', (S, S), (0, 0, 0, 0))
icon.paste(bg, (0, 0), mask)
icon.save(out)
print('wrote', out)
