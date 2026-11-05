"""Собирает закатные слои для шапки и карточки-портрета из спрайтов Craftpix.

python -I tools/make-backdrop.py [папка_спрайтов]
  ->  assets/build/  banner-sky.png, banner-far.png, banner-near.png, banner-castle.png,
                     card-sky.png, card-far.png, card-near.png, icons/*.png
Исходные спрайты в репозиторий не кладём — только готовую сборку.
"""
import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SPRITES = Path(sys.argv[1] if len(sys.argv) > 1 else r"D:\Спрайты")
OUT = ROOT / "assets" / "build"
OUT.mkdir(parents=True, exist_ok=True)

BW, BH = 960, 220  # шапка — 1:1 с SVG, пиксели чёткие
CW, CH = 240, 324  # карточка-портрет (высота = высота неба в спрайте)

HOUSE_CROP = (40, 0, 346, 214)  # мансарда из «Plan 2» (до цветочных ящиков)
HOUSE_X, HOUSE_Y = 600, 8  # где стоит мансарда в шапке
ROOF_STRIP = (490, 576)  # кусок слоя крыши — одна черепица, без дерева
TILES_Y = 150  # верх черепицы в шапке (ниже, чем в спрайте, — больше неба)


def save(im, name):
    path = OUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, optimize=True)
    print("ok:", name, im.size)


# ---------- небо: Clouds 7 (1 — фон, 2 — подсветка горизонта, 3 — дальние, 4 — ближние облака) ----------
sky_dir = SPRITES / "Облака" / "Clouds 7"
sky = [Image.open(sky_dir / f"{i}.png").convert("RGBA") for i in range(1, 5)]
TILE = sky[0].width  # 576, набор бесшовный по горизонтали


def band(layer, width, height, dx=0, dy=0, mirror=False):
    """Лента из повторов слоя: ширина width, сдвиг узора dx, вертикальный сдвиг dy.
    mirror=True — каждый второй повтор отражён: так стыкуется даже не бесшовный слой."""
    out = Image.new("RGBA", (width, height))
    flipped = layer.transpose(Image.FLIP_LEFT_RIGHT)
    for k, x in enumerate(range(-dx, width, TILE)):
        tile = flipped if mirror and k % 2 else layer
        if x >= 0:
            out.alpha_composite(tile, (x, dy))
        else:
            out.alpha_composite(tile.crop((-x, 0, TILE, tile.height)), (0, dy))
    return out


# шапка ниже неба (220 < 324): берём нижнюю, самую закатную часть
SKY_DY = BH - sky[0].height
# фон Clouds 7 по краям не бесшовный — кладём зеркально (он неподвижен, повтор не заметен)
base = band(sky[0], BW, BH, 120, SKY_DY, mirror=True)
base.alpha_composite(band(sky[1], BW, BH, 120, SKY_DY, mirror=True))
save(base, "banner-sky.png")
save(band(sky[2], BW + TILE, BH, 120, SKY_DY), "banner-far.png")
save(band(sky[3], BW + TILE, BH, 300, SKY_DY), "banner-near.png")

# карточка: полная высота неба
cbase = band(sky[0], CW, CH, 180)
cbase.alpha_composite(band(sky[1], CW, CH, 180))
save(cbase, "card-sky.png")
save(band(sky[2], CW + TILE, CH, 180), "card-far.png")
save(band(sky[3], CW + TILE, CH, 40), "card-near.png")

# ---------- замок в закатном свете ----------
GLASS = {(50, 62, 80): (255, 214, 140), (35, 48, 68): (240, 150, 90)}  # стекло → тёплый свет


def sunset(im, k=1.0):
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            if (r, g, b) in GLASS:
                px[x, y] = (*GLASS[(r, g, b)], a)
            else:  # сиреневые тени + розовый отсвет заката
                px[x, y] = (min(255, int((r * 0.62 + 38) * k)), int((g * 0.45 + 22) * k), int((b * 0.62 + 46) * k), a)
    return im


def is_tile(p):
    r, g, b, a = p
    return a and r > g * 1.12 and r > b * 1.02


bg = SPRITES / "Фон Замка" / "PNG" / "background 3"
roof = Image.open(bg / "Plan 2.png").convert("RGBA")

# мансарда без окружающей черепицы: заливка «черепичных» пикселей от краёв кадра
house = roof.crop(HOUSE_CROP)
px = house.load()
w, h = house.size
seen = set()
q = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
while q:
    x, y = q.popleft()
    if (x, y) in seen or not (0 <= x < w and 0 <= y < h):
        continue
    seen.add((x, y))
    p = px[x, y]
    if p[3] == 0 or is_tile(p):
        px[x, y] = (0, 0, 0, 0)
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
# остатки швов черепицы — мелкие островки; оставляем только самый большой кусок (саму мансарду)
comps, seen = [], set()
for sy in range(h):
    for sx in range(w):
        if (sx, sy) in seen or px[sx, sy][3] == 0:
            continue
        comp, q = [], deque([(sx, sy)])
        seen.add((sx, sy))
        while q:
            x, y = q.popleft()
            comp.append((x, y))
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and px[nx, ny][3]:
                    seen.add((nx, ny))
                    q.append((nx, ny))
        comps.append(comp)
for comp in sorted(comps, key=len)[:-1]:
    for x, y in comp:
        px[x, y] = (0, 0, 0, 0)
house = sunset(house)

strip = sunset(roof.crop((ROOF_STRIP[0], 70, ROOF_STRIP[1], 70 + BH - TILES_Y)), 0.72)  # черепица темнее мансарды
castle = Image.new("RGBA", (BW, BH))
for x in range(0, BW, strip.width):
    castle.alpha_composite(strip, (x, TILES_Y))
castle.alpha_composite(house, (HOUSE_X, HOUSE_Y))
save(castle, "banner-castle.png")

# ---------- пиксельные иконки из «Книги заклинаний» (32×32) ----------
icons = Image.open(SPRITES / "Книга Заклинаний" / "PNG" / "Icons.png").convert("RGBA")
ICONS = {  # имя: (колонка 0 — огонь/вода, 1 — земля/воздух; строка)
    "flames": (0, 0), "eye": (0, 1), "fireball": (0, 2), "hand": (0, 3), "wisps": (0, 4),
    "ice": (0, 5), "waves": (0, 6), "arrow": (0, 7), "spikes": (0, 8), "tornado": (0, 9),
    "rock": (1, 0), "vines": (1, 1), "roots": (1, 2), "cross": (1, 3), "clover": (1, 4),
    "clouds": (1, 5), "runner": (1, 6), "bolt": (1, 7), "wind": (1, 8), "wings": (1, 9),
}
for name, (col, row) in ICONS.items():
    save(icons.crop((col * 144, row * 32, col * 144 + 32, row * 32 + 32)), f"icons/{name}.png")
