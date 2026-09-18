#!/usr/bin/env python3
"""Build docs/external/screenshots/grid_preview.png — the single image the README shows.

The grid was hand-assembled before; this script replaces that so adding a screen is an edit to
SECTIONS below plus a re-run, not an image-editing session. Every shot is scaled to the same
width, laid out in rows of COLUMNS, and captioned with the label given here (never derived from
the filename — the caption is user-facing Portuguese, the filename is not).

Usage: python3 scripts/build-screenshot-grid.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "docs" / "external" / "screenshots"
OUT = SHOTS / "grid_preview.png"

# Layout
COLUMNS = 5
THUMB_W = 200
GAP = 12
CAPTION_H = 22
# 1080x2501 is what the device actually produces; every thumb is padded/cropped to this ratio.
THUMB_ASPECT = 2501 / 1080
PAD = 16
BG = (13, 17, 33)
FG = (232, 236, 245)
SECTION_FG = (233, 69, 96)
SECTION_H = 34

# (section title, [(file, caption), …]). A section always starts on a new row.
SECTIONS = [
    ("Splash e boas-vindas", [
        ("splash.png", "Splash"),
        ("config-welcome-empty.png", "Bem-vindo (vazio)"),
        ("config-welcome-setup.png", "Bem-vindo (configurando)"),
        ("config-welcome.png", "Bem-vindo (configurado)"),
    ]),
    ("Biblioteca", [
        ("library-grid-recent.png", "Grade · recente"),
        ("library-grid-alphabetical.png", "Grade · A–Z"),
        ("library-list-recent.png", "Lista · recente"),
        ("library-list-alphabetical.png", "Lista · A–Z"),
        ("following-grid-recent.png", "Seguindo · grade"),
    ]),
    ("Série e leitura", [
        ("series-detail-full.jpeg", "Detalhe da série"),
        ("series-detail-scrolled.jpeg", "Lista de capítulos"),
        ("series-detail-selection-mode.jpeg", "Seleção múltipla"),
        ("series-detail-sort-modal.jpeg", "Modal de ordenação"),
    ]),
    ("Busca", [
        ("search-history.png", "Abertas recentemente"),
        ("search-results.png", "Resultados da busca"),
    ]),
    ("Notificações", [
        ("notifications-list.png", "Lista de notificações"),
        ("notifications-selection-mode.png", "Seleção múltipla"),
        ("notifications-detail-modal.png", "Detalhes"),
    ]),
    ("Configurações", [
        ("config-main.png", "Ajustes"),
        ("config-server.png", "Servidores"),
        ("config-reading-prefs.png", "Preferências de leitura"),
        ("config-notifications.png", "Notificações"),
        ("settings-chapter-sort-fixed.jpeg", "Ordenação de capítulos"),
    ]),
]


def font(size: int) -> ImageFont.ImageFont:
    for candidate in (
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ):
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def scaled(path: Path) -> Image.Image:
    """Scale to THUMB_W, then pad (never stretch) to the canonical phone aspect.

    The shots come from different capture sessions at different resolutions; scaling each to a
    common width alone would leave a short one visibly squatter than its neighbours. Padding to
    one aspect keeps every frame the same size without distorting any of them.
    """
    im = Image.open(path).convert("RGB")
    im = im.resize((THUMB_W, round(im.height * THUMB_W / im.width)), Image.LANCZOS)
    target_h = round(THUMB_W * THUMB_ASPECT)
    if im.height == target_h:
        return im
    if im.height > target_h:
        # Taller than the canonical frame: crop the bottom, which is dead space on these shots.
        return im.crop((0, 0, THUMB_W, target_h))
    frame = Image.new("RGB", (THUMB_W, target_h), BG)
    frame.paste(im, (0, 0))
    return frame


def main() -> None:
    missing = [f for _, shots in SECTIONS for f, _ in shots if not (SHOTS / f).exists()]
    if missing:
        raise SystemExit(f"missing screenshots: {', '.join(missing)}")

    caption_font, section_font = font(13), font(17)

    # Measure first: each section's rows are as tall as their tallest shot.
    plan, total_h = [], PAD
    for title, shots in SECTIONS:
        total_h += SECTION_H
        rows = [shots[i:i + COLUMNS] for i in range(0, len(shots), COLUMNS)]
        row_plan = []
        for row in rows:
            images = [scaled(SHOTS / f) for f, _ in row]
            height = max(im.height for im in images)
            row_plan.append((images, [c for _, c in row], height))
            total_h += height + CAPTION_H + GAP
        plan.append((title, row_plan))
    total_h += PAD

    total_w = PAD * 2 + COLUMNS * THUMB_W + (COLUMNS - 1) * GAP
    canvas = Image.new("RGB", (total_w, total_h), BG)
    draw = ImageDraw.Draw(canvas)

    y = PAD
    for title, row_plan in plan:
        draw.text((PAD, y + 8), title, font=section_font, fill=SECTION_FG)
        y += SECTION_H
        for images, captions, height in row_plan:
            x = PAD
            for im, caption in zip(images, captions):
                draw.text((x, y), caption, font=caption_font, fill=FG)
                canvas.paste(im, (x, y + CAPTION_H))
                x += THUMB_W + GAP
            y += height + CAPTION_H + GAP

    canvas.save(OUT, optimize=True)
    print(f"{OUT.relative_to(ROOT)} — {canvas.width}x{canvas.height}")


if __name__ == "__main__":
    main()
