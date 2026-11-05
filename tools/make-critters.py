"""Вырезает кадры зверей для шапки: котик, драконы (из превью Craftpix на сплошном фоне), кролик.

python -I tools/make-critters.py [папка_спрайтов]
  ->  assets/build/critters/<имя>-<n>.png  (все кадры одного зверя — одного размера и выровнены)
Нужны Pillow, numpy и opencv-python.
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SPRITES = Path(sys.argv[1] if len(sys.argv) > 1 else r"D:\Спрайты")
OUT = ROOT / "assets" / "build" / "critters"
OUT.mkdir(parents=True, exist_ok=True)


def cut_frames(sheet, box, bg, min_bottom, tol=30):
    """Кадры одной строки превью: ключ по цвету фона + связные компоненты."""
    rgb = np.asarray(Image.open(sheet).convert("RGB")).astype(int)
    x0, y0, x1, y1 = box
    a = rgb[y0:y1, x0:x1]
    fg = (np.abs(a - np.array(bg)).sum(2) > tol).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(fg, 8)
    frames = []
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if area < 400 or y + h < min_bottom - y0:
            continue
        m = lab[y : y + h, x : x + w] == i
        rgba = np.zeros((h, w, 4), np.uint8)
        rgba[..., :3] = a[y : y + h, x : x + w]
        rgba[..., 3] = m * 255
        frames.append((x, rgba))
    return [f for _, f in sorted(frames, key=lambda t: t[0])]


def body_mask(rgba, kind):
    m = rgba[..., 3] > 0
    r, g, b = (rgba[..., i].astype(int) for i in range(3))
    if kind == "dragon":  # крылья тёмные/лиловые — по ним не выравниваем
        m &= (r + g + b > 260) & (r > b)
    return m.astype(np.float32)


def align(frames, kind, search=24):
    """Сдвигаем каждый кадр так, чтобы «тело» лучше всего совпало с первым кадром."""
    H = max(f.shape[0] for f in frames) + search * 2
    W = max(f.shape[1] for f in frames) + search * 2
    ref = np.zeros((H, W), np.float32)
    m0 = body_mask(frames[0], kind)
    ref[search : search + m0.shape[0], search : search + m0.shape[1]] = m0
    placed = []
    for f in frames:
        m = body_mask(f, kind)
        score = cv2.matchTemplate(ref, m, cv2.TM_CCORR)  # перебор всех сдвигов разом
        _, _, _, pos = cv2.minMaxLoc(score)
        placed.append((pos, f))
    canvas = [np.zeros((H, W, 4), np.uint8) for _ in frames]
    for c, ((dx, dy), f) in zip(canvas, placed):
        c[dy : dy + f.shape[0], dx : dx + f.shape[1]] = f
    # общая обрезка по всем кадрам
    alpha = np.max([c[..., 3] for c in canvas], axis=0)
    ys, xs = np.nonzero(alpha)
    return [c[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1] for c in canvas]


def align_head(frames, cols=14):
    """Летящий дракон смотрит вправо: совмещаем морду (самые правые пиксели тела)."""
    anchors = []
    for f in frames:
        m = body_mask(f, "dragon") > 0
        xs = np.nonzero(m.any(0))[0]
        xr = xs.max()
        ys = np.nonzero(m[:, xr - cols : xr + 1].any(1))[0]
        anchors.append((xr, ys.mean()))
    ax = max(a[0] for a in anchors)
    ay = max(a[1] for a in anchors)
    placed = [(int(round(ax - x)), int(round(ay - y)), f) for (x, y), f in zip(anchors, frames)]
    W = max(dx + f.shape[1] for dx, _, f in placed)
    H = max(dy + f.shape[0] for _, dy, f in placed)
    canvas = []
    for dx, dy, f in placed:
        c = np.zeros((H, W, 4), np.uint8)
        c[dy : dy + f.shape[0], dx : dx + f.shape[1]] = f
        canvas.append(c)
    alpha = np.max([c[..., 3] for c in canvas], axis=0)
    ys, xs = np.nonzero(alpha)
    return [c[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1] for c in canvas]


def shrink(frames, height):
    """Уменьшаем до нужной высоты, альфу делаем чёткой — как у пиксель-арта."""
    out = []
    for f in frames:
        im = Image.fromarray(f, "RGBA")
        w = round(im.width * height / im.height)
        # премультипликация, чтобы фон не «протекал» в края
        small = im.resize((w, height), Image.LANCZOS, reducing_gap=None)
        px = np.asarray(small).copy()
        px[..., 3] = np.where(px[..., 3] > 110, 255, 0)
        out.append(Image.fromarray(px, "RGBA"))
    return out


def save(name, frames):
    for old in OUT.glob(f"{name}-*.png"):
        old.unlink()
    for i, im in enumerate(frames):
        im.save(OUT / f"{name}-{i}.png", optimize=True)
    print(f"ok: {name} x{len(frames)} {frames[0].size}")


GRAY = (162, 162, 162)
FLIGHT = (200, 630, 1800, 885)
pets = SPRITES / "Фамильяры"
drag = SPRITES / "Древнейший"

# котик: строки «сидит», «идёт», «выгнулся». Внутри строки кадры выравниваем по силуэту,
# между строками — по лапам (низ) и мордочке (правый край), чтобы переходы не прыгали.
CAT_SHEET = pets / "Urban-Animals-Sprite-Sheet-Pixel-Art-Pack3.webp"
CAT_BG = (94, 107, 100)
rows = {
    "idle": align(cut_frames(CAT_SHEET, (200, 120, 1800, 215), CAT_BG, 180), "cat", 10),
    "walk": align(cut_frames(CAT_SHEET, (200, 330, 1800, 460), CAT_BG, 400), "cat", 10),
    "arch": align(cut_frames(CAT_SHEET, (200, 960, 1800, 1110), CAT_BG, 1050), "cat", 10),
}
CH = max(f[0].shape[0] for f in rows.values())
CW = max(f[0].shape[1] for f in rows.values())
for name, frames in rows.items():
    placed = []
    for f in frames:
        c = np.zeros((CH, CW, 4), np.uint8)
        c[CH - f.shape[0] :, CW - f.shape[1] :] = f
        placed.append(c)
    save(f"cat-{name}", shrink(placed, round(CH * 0.5)))

red = cut_frames(drag / "Dragon-Pixel-Art-Character-Sprite-Sheets-Pack6.webp", FLIGHT, GRAY, 780)
save("dragon-red", shrink(align_head(red), 110))

beige = cut_frames(drag / "Dragon-Pixel-Art-Character-Sprite-Sheets-Pack4.webp", FLIGHT, GRAY, 780)
save("dragon-beige", shrink(align_head(beige), 70))

# кролик — настоящий прозрачный лист 4×8, клетка 72px; строка 5 — сидит боком
rab = Image.open(pets / "rabbit.png").convert("RGBA")
cells = [np.asarray(rab.crop((c * 72, 5 * 72, c * 72 + 72, 6 * 72))) for c in range(4)]
alpha = np.max([c[..., 3] for c in cells], axis=0)
ys, xs = np.nonzero(alpha)
save("rabbit", [Image.fromarray(c[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1].copy(), "RGBA") for c in cells])
