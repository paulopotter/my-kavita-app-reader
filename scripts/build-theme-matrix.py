#!/usr/bin/env python3
"""Build docs/external/screenshots/by-theme/overview.png — every theme against every main screen.

`make screenshots THEMES=1` puts the "themed" shots of each theme under by-theme/<theme>/. This lays
them out as one matrix (a row per theme, a column per screen) so a palette that fell out of step with
the others, or a screen that reads badly in one of them, shows at a glance.

Usage: python3 scripts/build-theme-matrix.py
"""

import importlib.util
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "docs" / "external" / "screenshots"
BY_THEME = SHOTS / "by-theme"
OUT = BY_THEME / "overview.png"

_spec = importlib.util.spec_from_file_location("take_screenshots", ROOT / "scripts" / "take-screenshots.py")
_take = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_take)

THUMB_W = 150
THUMB_H = round(THUMB_W * 2640 / 1080)
GAP = 8
PAD = 14
LABEL_W = 130
HEADER_H = 26
BG = (13, 17, 33)
FG = (232, 236, 245)


def font(size):
    for candidate in ("/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Helvetica.ttc",
                      "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def main():
    script = json.loads((ROOT / "scripts" / "screenshots" / "shots.json").read_text())
    columns = [s["name"] for s in script["shots"] if s.get("themed")]
    keys = _take.parse_theme_keys(text=_take.THEMES_INDEX.read_text())
    rows = [(k, BY_THEME / _take.theme_slug(key=k)) for k in keys if (BY_THEME / _take.theme_slug(key=k)).is_dir()]
    if not rows:
        raise SystemExit("no by-theme/ folders yet: run `make screenshots EMULATOR=1 THEMES=1`")

    width = PAD * 2 + LABEL_W + len(columns) * (THUMB_W + GAP)
    height = PAD * 2 + HEADER_H + len(rows) * (THUMB_H + GAP)
    canvas = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(canvas)
    small, label = font(11), font(14)

    for c, name in enumerate(columns):
        draw.text((PAD + LABEL_W + c * (THUMB_W + GAP), PAD), name, font=small, fill=FG)
    for r, (key, folder) in enumerate(rows):
        y = PAD + HEADER_H + r * (THUMB_H + GAP)
        draw.text((PAD, y + THUMB_H // 2 - 8), key, font=label, fill=FG)
        for c, name in enumerate(columns):
            path = folder / f"{name}.png"
            if not path.exists():
                continue
            thumb = Image.open(path).convert("RGB").resize((THUMB_W, THUMB_H), Image.LANCZOS)
            canvas.paste(thumb, (PAD + LABEL_W + c * (THUMB_W + GAP), y))

    canvas.save(OUT, optimize=True)
    print(f"{OUT.relative_to(ROOT)} — {canvas.width}x{canvas.height} ({len(rows)} themes x {len(columns)} screens)")


if __name__ == "__main__":
    main()
