#!/usr/bin/env python3
"""Build docs/external/screenshots/themes/<theme>.png — one card per colour identity.

Each card is the same mock library screen the docs show as a grid, drawn on its own so a single
theme can be pointed at: a cover row with progress, a second row mid-read, the two buttons, and
the name. The palettes are parsed out of the token files, so a theme repainted in code is
repainted here on the next run and the images cannot drift from the app.

Usage: python3 scripts/build-theme-cards.py
"""

import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
THEMES = ROOT / "frontend" / "src" / "shared" / "theme" / "themes"
OUT = ROOT / "docs" / "external" / "screenshots" / "themes"

# Display names live in i18n for the app; spelled out here because an image has no language
# toggle. The OLED suffix marks what a palette IS — onyx carries it without having a lighter twin.
NAMES = {
    "teal": "Petróleo", "tealOled": "Petróleo - OLED",
    "crimson": "Carmim", "crimsonOled": "Carmim - OLED",
    "onyx": "Ônix - OLED",
    "amber": "Âmbar",
    "sepia": "Sépia",
    "steel": "Aço",
    "wine": "Vinho", "wineOled": "Vinho - OLED",
    "forest": "Floresta", "forestOled": "Floresta - OLED",
}

W, H = 560, 468
PAD = 24
TITLE_H = 46
SCALE = 2  # drawn at 2x and downsampled, so the text and the rounded corners are not jagged


def font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    for candidate in (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ):
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def rgb(token: str) -> tuple[int, int, int]:
    r, g, b = (int(n) for n in re.findall(r"\d+", token)[:3])
    return r, g, b


def read_palettes() -> dict[str, dict]:
    """Pull each identity's tokens out of its own source file.

    An OLED variant is a spread over its parent that overrides three surfaces, so it is resolved
    from the parent rather than parsed as a whole palette.
    """
    out: dict[str, dict] = {}
    pending: list[tuple[str, str, str]] = []
    for folder in sorted(THEMES.iterdir()):
        source = folder / "colors.tokens.ts"
        if not source.is_file():
            continue
        text = source.read_text()
        for block in re.finditer(r"export const (\w+)Colors: ThemeColors = \{(.*?)\n\};", text, re.S):
            name, body = block.group(1), block.group(2)
            if body.lstrip().startswith("..."):
                pending.append((name, re.search(r"\.\.\.(\w+)Colors,", body).group(1), body))
                continue
            section = lambda key: re.search(rf"\n  {key}: \{{(.*?)\n  \}},", body, re.S).group(1)  # noqa: E731
            field = lambda key, name_: rgb(re.search(rf"{name_}: '([^']+)'", section(key)).group(1))  # noqa: E731
            surface = section("surface")
            out[name] = {
                "bg": rgb(re.search(r"primary: '([^']+)'", surface).group(1)),
                "sheet": rgb(re.search(r"secondary: '([^']+)'", surface).group(1)),
                "raised": rgb(re.search(r"tertiary: '([^']+)'", surface).group(1)),
                "text": field("text", "primary"),
                "muted": field("text", "secondary"),
                "accent": field("button", "primary"),
                "onAccent": rgb(re.search(r"button: \{\n      primary: '([^']+)'", body).group(1)),
                "read": rgb(re.search(r"reading: \{\n      primary: '([^']+)'", body).group(1)),
            }

    for name, parent, body in pending:
        surfaces = re.search(r"surface: \{(.*?)\n  \},", body, re.S).group(1)
        palette = dict(out[parent])
        for token, key in (("primary", "bg"), ("secondary", "sheet"), ("tertiary", "raised")):
            palette[key] = rgb(re.search(rf"{token}: '([^']+)'", surfaces).group(1))
        out[name] = palette
    return out


def draw_card(label: str, p: dict) -> Image.Image:
    image = Image.new("RGB", (W * SCALE, H * SCALE), p["bg"])
    canvas = ImageDraw.Draw(image)
    s = SCALE

    f_name, f_title, f_meta, f_btn = font(22 * s, True), font(19 * s, True), font(15 * s), font(16 * s, True)

    canvas.text((PAD * s, PAD * s), label, font=f_name, fill=p["text"])

    # the top bar
    y = (PAD + TITLE_H) * s
    canvas.rounded_rectangle([PAD * s, y, (W - PAD) * s, y + 52 * s], 10 * s, fill=p["sheet"])
    canvas.text(((PAD + 16) * s, y + 16 * s), "Biblioteca", font=f_meta, fill=p["text"])

    # a finished series: cover, title, progress at 98%
    y += 70 * s
    canvas.rounded_rectangle([PAD * s, y, (W - PAD) * s, y + 132 * s], 12 * s, fill=p["sheet"])
    canvas.rounded_rectangle([(PAD + 16) * s, y + 16 * s, (PAD + 88) * s, y + 116 * s], 6 * s, fill=p["raised"])
    tx = (PAD + 104) * s
    canvas.text((tx, y + 20 * s), "O Cavaleiro em Eterna Regressão", font=f_title, fill=p["text"])
    bar_w = (W - PAD - 16) * s - tx
    by = y + 58 * s
    canvas.rounded_rectangle([tx, by, tx + bar_w, by + 8 * s], 4 * s, fill=p["raised"])
    canvas.rounded_rectangle([tx, by, tx + int(bar_w * 0.98), by + 8 * s], 4 * s, fill=p["accent"])
    canvas.text((tx, by + 22 * s), "112/114 caps.", font=f_meta, fill=p["muted"])
    right = canvas.textlength("98%", font=f_meta)
    canvas.text((tx + bar_w - right, by + 22 * s), "98%", font=f_meta, fill=p["muted"])

    # one being read now — the amber progress every identity shares
    y += 148 * s
    canvas.rounded_rectangle([PAD * s, y, (W - PAD) * s, y + 92 * s], 12 * s, fill=p["sheet"])
    canvas.rounded_rectangle([(PAD + 16) * s, y + 14 * s, (PAD + 68) * s, y + 78 * s], 6 * s, fill=p["raised"])
    tx = (PAD + 84) * s
    canvas.text((tx, y + 18 * s), "As Aventuras de Greed", font=f_title, fill=p["text"])
    bar_w = (W - PAD - 16) * s - tx
    by = y + 52 * s
    canvas.rounded_rectangle([tx, by, tx + bar_w, by + 8 * s], 4 * s, fill=p["raised"])
    canvas.rounded_rectangle([tx, by, tx + int(bar_w * 0.12), by + 8 * s], 4 * s, fill=p["read"])
    canvas.text((tx, by + 20 * s), "lendo agora", font=f_meta, fill=p["muted"])

    # the buttons
    y += 110 * s
    canvas.rounded_rectangle([PAD * s, y, (PAD + 150) * s, y + 46 * s], 8 * s, fill=p["accent"])
    w = canvas.textlength("Continuar", font=f_btn)
    canvas.text(((PAD + 75) * s - w / 2, y + 13 * s), "Continuar", font=f_btn, fill=p["onAccent"])
    canvas.rounded_rectangle(
        [(PAD + 166) * s, y, (PAD + 302) * s, y + 46 * s], 8 * s, outline=p["muted"], width=max(1, s)
    )
    w = canvas.textlength("Detalhes", font=f_btn)
    canvas.text(((PAD + 234) * s - w / 2, y + 13 * s), "Detalhes", font=f_btn, fill=p["text"])

    return image.resize((W, H), Image.LANCZOS)


def main() -> None:
    palettes = read_palettes()
    missing = [key for key in NAMES if key not in palettes]
    if missing:
        raise SystemExit(f"named here but absent from the token files: {', '.join(missing)}")
    unnamed = [key for key in palettes if key not in NAMES]
    if unnamed:
        raise SystemExit(f"registered but unnamed here: {', '.join(unnamed)}")

    OUT.mkdir(parents=True, exist_ok=True)
    for key, label in NAMES.items():
        # kebab-case, so the filename reads the way the rest of the screenshots do
        stem = re.sub(r"(?<!^)(?=[A-Z])", "-", key).lower()
        path = OUT / f"{stem}.png"
        draw_card(label, palettes[key]).save(path)
        print(f"wrote {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
