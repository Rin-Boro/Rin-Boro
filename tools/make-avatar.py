"""Готовит портрет для сцены: убирает нарисованную «шахматку», обрезает и уменьшает.

python tools/make-avatar.py  ->  assets/avatar.png
"""
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art-src" / "rin-portrait.png"
OUT = ROOT / "assets" / "avatar.png"
HEIGHT = 560  # 2× от высоты в сцене (280px) — чётко на ретина-экранах


def is_checker(p):
    r, g, b = p[:3]
    return min(r, g, b) > 196 and max(r, g, b) - min(r, g, b) < 14


im = Image.open(SRC).convert("RGBA")
w, h = im.size
px = im.load()

# заливка от краёв: всё светло-серое, связанное с границей, — фон
seen = bytearray(w * h)
q = deque()
for x in range(w):
    q.extend([(x, 0), (x, h - 1)])
for y in range(h):
    q.extend([(0, y), (w - 1, y)])
while q:
    x, y = q.popleft()
    i = y * w + x
    if seen[i] or not is_checker(px[x, y]):
        continue
    seen[i] = 1
    px[x, y] = (0, 0, 0, 0)
    if x > 0: q.append((x - 1, y))
    if x < w - 1: q.append((x + 1, y))
    if y > 0: q.append((x, y - 1))
    if y < h - 1: q.append((x, y + 1))

# замкнутые островки шахматки (просветы между прядями и рукой):
# крупные светло-серые области тоже фон, мелкие блики (кулон, глаза) оставляем
MIN_ISLAND = 150
for sy in range(h):
    for sx in range(w):
        i0 = sy * w + sx
        if seen[i0] or not is_checker(px[sx, sy]):
            continue
        comp, stack = [], [(sx, sy)]
        seen[i0] = 1
        while stack:
            x, y = stack.pop()
            comp.append((x, y))
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < w and 0 <= ny < h:
                    j = ny * w + nx
                    if not seen[j] and is_checker(px[nx, ny]):
                        seen[j] = 1
                        stack.append((nx, ny))
        if len(comp) >= MIN_ISLAND:
            for x, y in comp:
                px[x, y] = (0, 0, 0, 0)

im = im.crop(im.getbbox())
scale = HEIGHT / im.height
im = im.convert("RGBa").resize((round(im.width * scale), HEIGHT), Image.LANCZOS).convert("RGBA")
OUT.parent.mkdir(exist_ok=True)
im.save(OUT, optimize=True)
print(f"ok: {OUT} {im.size} {OUT.stat().st_size // 1024} KB")
