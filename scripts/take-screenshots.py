#!/usr/bin/env python3
"""Take the app's documentation screenshots from a physical device over ADB.

Run it when a theme, a screen or a big layout change lands, so docs/external/screenshots/ is
rebuilt from the app instead of hand-captured. It follows the script in
scripts/screenshots/shots.json: each step opens the app, taps an element or takes a shot.

Elements are found through `uiautomator dump` (text, content-desc, resource-id, bounds), never
by fixed coordinates, so a layout change does not break the script — only a renamed element does.
Selectors match the app's own labels, so run it with the app in the language the script was
written in (pt-BR).

Nothing from the device or from the user's library reaches the docs:
  - Do Not Disturb is on while it runs (restored afterwards), so no notification pops over a shot;
  - the status bar (clock, battery, notification icons) is painted over with the colour just below it;
  - every library item's cover is replaced by a default image and its title by "Lorem ipsum",
    placed from the same dump's bounds; a shot can also list extra regions under "blur".

Usage: python3 scripts/take-screenshots.py [--only NAME ...] [--out DIR] [--serial SERIAL | --emulator]
       [--display ID] [--list]

With a phone and an emulator attached, name the one to use (--serial, --emulator or ANDROID_SERIAL);
otherwise the first attached device is taken.
"""

import argparse
import io
import json
import os
import re
import shutil
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "scripts" / "screenshots" / "shots.json"
DEFAULT_OUT = ROOT / "docs" / "external" / "screenshots"
APP_PACKAGE = "com.mymangareader"
APP_ACTIVITY = ".MainActivity"
EMULATOR_SERIAL = "emulator-5554"

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
BOUNDS = re.compile(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]")
DISPLAY_ID = re.compile(r"^Display (\d+) \(HWC display \d+\)", re.MULTILINE)
ZEN_OFF, ZEN_NO_INTERRUPTIONS = "0", "2"

# How long a screen gets to settle after the app reacts, before it is dumped or captured.
PLACEHOLDER_COVER = ROOT / "scripts" / "screenshots" / "placeholder-cover.png"
LOREM = ("Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor "
         "incididunt ut labore et dolore magna aliqua")
TITLE_LINE_PX = 52  # one line of an item title, as the app lays it out at 1080 px wide
FONT_BOLD = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]
FONT_REGULAR = [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]
FONT_SERIF = [
    "/System/Library/Fonts/Supplemental/Georgia.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
]
FONT_SERIF_BOLD = [
    "/System/Library/Fonts/Supplemental/Georgia Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
]
SETTLE_SECONDS = 1.0
WAIT_FOR_SECONDS = 20
BLUR_RADIUS = 28


class SkipShot(Exception):
    """The screen this shot needs is not available on this device (say, a tab that depends on a
    server this install does not have). Not a failure: the shot is left out."""


class ScriptError(Exception):
    """The shots script or the device is not in a state the run can continue from."""


# ── pure helpers (covered by take-screenshots.tests.py) ──────────────────────────────────────


def parse_bounds(*, text):
    m = BOUNDS.fullmatch(text or "")
    if not m:
        return None
    left, top, right, bottom = (int(g) for g in m.groups())
    return (left, top, right, bottom)


def parse_nodes(*, xml):
    """Flatten a `uiautomator dump` into dicts, in document order, skipping unboundable nodes."""
    nodes = []
    for el in ET.fromstring(xml).iter("node"):
        box = parse_bounds(text=el.get("bounds"))
        if box is None:
            continue
        nodes.append({
            "text": el.get("text") or "",
            "desc": el.get("content-desc") or "",
            "id": (el.get("resource-id") or "").split("/")[-1],
            "class": el.get("class") or "",
            "clickable": el.get("clickable") == "true",
            "box": box,
        })
    return nodes


def matches(*, node, selector):
    """text/desc/class are substring matches, desc_any is a list of alternative desc substrings, desc_re a regex on desc, id is exact, clickable is a boolean.

    Geometry: min_size [w, h], max_w, max_h, top_between [min, max] (on the box top), at_top
    (box starts at y=0), left_between [min, max] (on the box left). Text: has_text (non-empty), not_text (list of exact texts to skip)."""
    left, top, right, bottom = node["box"]
    for key in ("text", "desc", "class"):
        if key in selector and selector[key] not in node[key]:
            return False
    if "desc_re" in selector and not re.search(selector["desc_re"], node["desc"]):
        return False
    if "desc_any" in selector and not any(d in node["desc"] for d in selector["desc_any"]):
        return False
    if "id" in selector and selector["id"] != node["id"]:
        return False
    if "clickable" in selector and selector["clickable"] != node["clickable"]:
        return False
    if "min_size" in selector:
        min_w, min_h = selector["min_size"]
        if right - left < min_w or bottom - top < min_h:
            return False
    if "max_w" in selector and right - left > selector["max_w"]:
        return False
    if "max_h" in selector and bottom - top > selector["max_h"]:
        return False
    if "top_between" in selector:
        low, high = selector["top_between"]
        if not low <= top <= high:
            return False
    if "left_between" in selector:
        low, high = selector["left_between"]
        if not low <= left <= high:
            return False
    if selector.get("at_top") and top != 0:
        return False
    if selector.get("has_text") and not node["text"].strip():
        return False
    if node["text"] in selector.get("not_text", []):
        return False
    return True


def find(*, nodes, selector):
    """Nodes matching the selector. {"inside": selector} keeps only those whose centre lies in a
    node matching that container selector, so a rule follows the layout instead of fixed
    coordinates (a taller status bar on another device moves everything)."""
    rest = {k: v for k, v in selector.items() if k != "inside"}
    hits = [n for n in nodes if matches(node=n, selector=rest)]
    if "inside" not in selector:
        return hits
    boxes = [n["box"] for n in find(nodes=nodes, selector=selector["inside"])]
    inside = []
    for n in hits:
        cx, cy = center(box=n["box"])
        if any(l <= cx <= r and t <= cy <= b for l, t, r, b in boxes):
            inside.append(n)
    return inside


def clamp_box(*, box, within):
    left, top, right, bottom = box
    w_left, w_top, w_right, w_bottom = within
    return (max(left, w_left), max(top, w_top), min(right, w_right), min(bottom, w_bottom))


def item_regions(*, nodes):
    """The covers and the titles of every library item on screen.

    An item is a clickable node with a content-desc that holds a cover (an ImageView): list rows,
    grid cards, rail cards, however narrow or cut by the screen edge. Tabs and toolbar buttons are
    clickable with a desc too, but only hold SVG icons, so they are never items. Inside the item,
    a cover is any ImageView and a title is any text its desc starts with. Progress, chapter
    counts and buttons are left alone. Regions are clamped to the item's own (visible) box, so a
    row cut by the tab bar is not painted over it."""
    covers, titles = [], []
    for item in nodes:
        if not (item["clickable"] and item["desc"]):
            continue
        left, top, right, bottom = item["box"]
        inside = []
        for node in nodes:
            # By centre, not full containment: a row cut by the screen edge has its own box clipped
            # to what is visible, while its children keep their full (taller) boxes.
            cx, cy = center(box=node["box"])
            if node is not item and left <= cx <= right and top <= cy <= bottom:
                inside.append(node)
        item_covers = [n for n in inside if n["class"].endswith("ImageView")]
        if not item_covers:
            continue
        covers += [clamp_box(box=n["box"], within=item["box"]) for n in item_covers]
        for node in inside:
            title = node["text"].rstrip("…. ")
            if len(title) >= 4 and item["desc"].startswith(title):
                titles.append(clamp_box(box=node["box"], within=item["box"]))
    return {"covers": covers, "titles": titles}


def foreign_focus(*, focus_lines, package=APP_PACKAGE):
    """The window that has focus when it is not the app's (an alarm, a call, a system dialog), or
    None. `focus_lines` is what follows each "mCurrentFocus=" in `dumpsys window`: one per display,
    the unused one is "null"."""
    windows = [line.split("\n")[0].strip() for line in focus_lines]
    windows = [w for w in windows if w and w != "null"]
    if not windows or any(package in w for w in windows):
        return None
    return windows[0]


def dim_box(*, image, box, factor):
    """Darken a box, as the app's own modal scrim does over the screen behind the modal."""
    left, top, right, bottom = clamp_box(box=box, within=(0, 0) + image.size)
    if right > left and bottom > top:
        region = image.crop((left, top, right, bottom))
        image.paste(ImageEnhance.Brightness(region).enhance(factor), (left, top))
    return image


def paste_back(*, image, original, box, round_corners=False, radius=None):
    """Put the original pixels of `box` back. round_corners masks a pill/circle control, so the
    page pixels around its corners (which belong to what was replaced) are not brought back.
    radius does the same for a modal with a fixed corner radius."""
    left, top, right, bottom = clamp_box(box=box, within=(0, 0) + image.size)
    if right <= left or bottom <= top:
        return image
    mask = None
    if round_corners or radius:
        mask = Image.new("L", (right - left, bottom - top), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            (0, 0, right - left - 1, bottom - top - 1),
            radius=radius or min(right - left, bottom - top) // 2, fill=255)
    image.paste(original.crop((left, top, right, bottom)), (left, top), mask)
    return image


def scrub_dark(*, image, box, below):
    """Repaint every pixel of `box` darker than `below` with the box's commonest colour. A
    translucent bar lets the page behind it show through as dark shapes; the bar's own labels and
    icons are light, so they stay."""
    left, top, right, bottom = clamp_box(box=box, within=(0, 0) + image.size)
    if right <= left or bottom <= top:
        return image
    region = image.crop((left, top, right, bottom))
    colors = region.getcolors(maxcolors=region.width * region.height)
    background = max(colors, key=lambda c: c[0])[1]
    pixels = region.load()
    for y in range(region.height):
        for x in range(region.width):
            if max(pixels[x, y]) < below:
                pixels[x, y] = background
    image.paste(region, (left, top))
    return image


def default_cover(*, size):
    """The stand-in cover, fitted to `size`: scripts/screenshots/placeholder-cover.png when it
    exists (swap it for any art), otherwise a plain gradient with a book glyph."""
    width, height = size
    if PLACEHOLDER_COVER.exists():
        art = Image.open(PLACEHOLDER_COVER).convert("RGB")
        scale = max(width / art.width, height / art.height)
        art = art.resize((max(1, round(art.width * scale)), max(1, round(art.height * scale))))
        x, y = (art.width - width) // 2, (art.height - height) // 2
        return art.crop((x, y, x + width, y + height))
    cover = Image.new("RGB", size)
    draw = ImageDraw.Draw(cover)
    for y in range(height):
        t = y / max(1, height - 1)
        draw.line([(0, y), (width, y)], fill=(round(70 - 40 * t), round(84 - 46 * t), round(128 - 70 * t)))
    book_w, book_h = round(width * 0.42), round(min(width, height) * 0.52)
    x0, y0 = (width - book_w) // 2, (height - book_h) // 2
    ink = (150, 165, 205)
    draw.rounded_rectangle((x0, y0, x0 + book_w, y0 + book_h), radius=max(2, book_w // 10),
                           outline=ink, width=max(2, book_w // 14))
    draw.line([(x0 + book_w // 4, y0), (x0 + book_w // 4, y0 + book_h)], fill=ink, width=max(2, book_w // 14))
    return cover


def replace_cover(*, image, box):
    left, top, right, bottom = clamp_box(box=box, within=(0, 0) + image.size)
    if right > left and bottom > top:
        image.paste(default_cover(size=(right - left, bottom - top)), (left, top))
    return image


def load_font(*, size, bold=True, serif=False):
    families = {
        (True, False): FONT_BOLD,
        (False, False): FONT_REGULAR,
        (True, True): FONT_SERIF_BOLD,
        (False, True): FONT_SERIF,
    }
    for candidate in families[(bold, serif)]:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def load_bold_font(*, size):
    return load_font(size=size, bold=True)


def wrap_lorem(*, font, width, lines):
    """Greedy-wrap LOREM (repeated as needed) into exactly `lines` lines no wider than `width`."""
    words = LOREM.split()
    out, current, i = [], "", 0
    while len(out) < lines:
        word = words[i % len(words)]
        i += 1
        trial = f"{current} {word}".strip()
        if current and font.getlength(trial) > width:
            out.append(current)
            current = word
        else:
            current = trial
    return out


def text_colors(*, image, box):
    """(background, text) of a text box: the commonest colour, and the one farthest from it."""
    colors = image.crop(box).getcolors(maxcolors=image.width * image.height)
    background = max(colors, key=lambda c: c[0])[1]
    distance = lambda c: sum((a - b) ** 2 for a, b in zip(c[1], background))
    return background, max(colors, key=distance)[1]


def replace_title(*, image, box, line_px=TITLE_LINE_PX, size_px=None, bold=True, serif=False, text=None):
    """Erase the text in `box` and write lorem ipsum in its place: same box, a similar size and
    the colours sampled from the original. `line_px` is how tall one line is in this box (it sets
    the line count), `size_px` the glyph size (default line_px / 1.3)."""
    left, top, right, bottom = clamp_box(box=box, within=(0, 0) + image.size)
    if right <= left or bottom <= top:
        return image
    background, ink = text_colors(image=image, box=(left, top, right, bottom))
    lines = max(1, round((bottom - top) / line_px))
    line_h = (bottom - top) / lines
    size = size_px or max(8, round(line_h / 1.3))
    font = load_font(size=size, bold=bold, serif=serif)
    draw = ImageDraw.Draw(image)
    draw.rectangle((left, top, right, bottom), fill=background)
    if text is not None:
        # A fixed replacement ("https://kavita.example.com") is one line: shrink it to the box.
        while size > 8 and font.getlength(text) > right - left:
            size -= 1
            font = load_font(size=size, bold=bold, serif=serif)
        rows = [text]
        lines = 1
    else:
        rows = wrap_lorem(font=font, width=right - left, lines=lines)
    for i, row in enumerate(rows):
        draw.text((left, top + i * line_h + line_h * 0.12), row, font=font, fill=ink)
    return image


def center(*, box):
    left, top, right, bottom = box
    return ((left + right) // 2, (top + bottom) // 2)


def blur_regions(*, image, boxes, radius=BLUR_RADIUS):
    """Blur each box in place. Boxes are clamped to the image; empty ones are ignored."""
    width, height = image.size
    for left, top, right, bottom in boxes:
        left, top = max(0, left), max(0, top)
        right, bottom = min(width, right), min(height, bottom)
        if right <= left or bottom <= top:
            continue
        region = image.crop((left, top, right, bottom)).filter(ImageFilter.GaussianBlur(radius))
        image.paste(region, (left, top))
    return image


def mask_status_bar(*, image, height):
    """Paint the top `height` px with one flat colour taken at the left edge just under it. Hides
    clock, battery, network and notification icons without changing the image size. Sampled at the
    edge, not stretched from a full row, so an icon that starts right under the bar (the series
    star) does not leave a streak."""
    width, total = image.size
    if height <= 0 or height >= total:
        return image
    ImageDraw.Draw(image).rectangle((0, 0, width, height - 1), fill=image.getpixel((4, height)))
    return image


def extract_png(*, data):
    """adb prints a warning on stdout when the device has several displays; keep the PNG only."""
    start = data.find(PNG_SIGNATURE)
    if start < 0:
        raise ScriptError("screencap did not return a PNG")
    return data[start:]


def parse_display_ids(*, text):
    return DISPLAY_ID.findall(text)


def pick_serial(*, devices_output):
    """First attached serial. A phone paired over wireless debugging is listed once per mDNS
    entry, so more than one row is normal and still one device."""
    serials = []
    for line in devices_output.splitlines()[1:]:
        # A wireless serial can contain a space ("adb-X (2)._adb-tls-connect._tcp"), so the state
        # is the first whitespace-separated word that is exactly "device", not column two.
        m = re.match(r"^(.+?)\s+device(\s|$)", line)
        if m:
            serials.append(m.group(1))
    if not serials:
        raise ScriptError("no device attached (adb devices is empty)")
    return serials[0]


def select_shots(*, script, only=None, fresh=False):
    """The shots to run. Shots marked "fresh" need a clean install (they wipe the app first), so
    they run only with --fresh or when named explicitly with --only."""
    shots = script["shots"]
    if only:
        unknown = set(only) - {s["name"] for s in shots}
        if unknown:
            raise ScriptError(f"unknown shot(s): {', '.join(sorted(unknown))}")
        return [s for s in shots if s["name"] in only]
    return [s for s in shots if fresh or not s.get("fresh")]


def expand_steps(*, script, shot):
    """Inline {"use": name} steps from script["snippets"], so the opening of the app is written once.
    Snippets may use other snippets; a cycle is an error."""
    def expand(steps, seen):
        out = []
        for step in steps:
            if "use" not in step:
                out.append(step)
                continue
            name = step["use"]
            if name not in script.get("snippets", {}):
                raise ScriptError(f"{shot['name']}: unknown snippet {name!r}")
            if name in seen:
                raise ScriptError(f"{shot['name']}: snippet {name!r} uses itself")
            out += expand(script["snippets"][name], seen | {name})
        return out

    return expand(shot["steps"], frozenset())


def validate_script(*, script):
    """Every step is exactly one known action; every shot has a name that is a safe filename."""
    actions = {"reset_app", "key", "skip_unless", "launch", "snapshot", "tap", "tap_if", "type", "wait", "wait_for", "scroll", "scroll_until",
               "back", "shot", "use"}
    names = set()
    for shot in script.get("shots", []):
        name = shot.get("name", "")
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", name):
            raise ScriptError(f"shot name {name!r} must be lowercase-kebab")
        if name in names:
            raise ScriptError(f"shot name {name!r} is used twice")
        names.add(name)
        steps = expand_steps(script=script, shot=shot)
        if not steps or "shot" not in steps[-1]:
            raise ScriptError(f"{name}: the last step must be a shot")
        for step in steps:
            present = [k for k in step if k in actions]
            if len(present) != 1:
                raise ScriptError(f"{name}: each step needs exactly one action, got {step!r}")
    return script


# ── device ───────────────────────────────────────────────────────────────────────────────────


def resolve_adb():
    found = os.environ.get("ADB") or shutil.which("adb")
    if found:
        return found
    props = ROOT / "android" / "local.properties"
    if props.exists():
        m = re.search(r"^sdk\.dir=(.+)$", props.read_text(), re.MULTILINE)
        if m:
            candidate = Path(m.group(1).strip()) / "platform-tools" / "adb"
            if candidate.exists():
                return str(candidate)
    raise ScriptError("adb not found: put it on PATH, set ADB, or set sdk.dir in android/local.properties")


class Device:
    def __init__(self, *, adb, serial, display):
        self.base = [adb, "-s", serial]
        self.serial = serial
        self.display = display
        self.snapshot = None  # nodes of the screen before a modal hid it from the dump

    def run(self, *, args, binary=False):
        out = subprocess.run(self.base + args, capture_output=True, check=True, timeout=60).stdout
        return out if binary else out.decode("utf-8", "replace")

    def shell(self, *, command):
        return self.run(args=["shell"] + command.split())

    def focused_window(self):
        return self.shell(command="dumpsys window").split("mCurrentFocus=")[1:]

    def dump(self):
        self.run(args=["shell", "uiautomator", "dump", "/sdcard/ui.xml"])
        return parse_nodes(xml=self.run(args=["exec-out", "cat", "/sdcard/ui.xml"]))

    def screenshot(self):
        data = self.run(args=["exec-out", "screencap", "-p", "-d", self.display], binary=True)
        return Image.open(io.BytesIO(extract_png(data=data))).convert("RGB")

    def tap(self, *, x, y):
        self.shell(command=f"input tap {x} {y}")

    def swipe(self, *, x1, y1, x2, y2, ms=350):
        self.shell(command=f"input swipe {x1} {y1} {x2} {y2} {ms}")


def connect(*, serial, display):
    adb = resolve_adb()
    if serial is None:
        serial = pick_serial(devices_output=subprocess.run(
            [adb, "devices"], capture_output=True, check=True, text=True, timeout=30).stdout)
    device = Device(adb=adb, serial=serial, display="")
    if display is None:
        ids = parse_display_ids(text=device.shell(command="dumpsys SurfaceFlinger --display-id"))
        if not ids:
            raise ScriptError("could not read the display id from SurfaceFlinger")
        display = ids[0]  # HWC display 0 is the main screen
    device.display = display
    return device


# ── run ──────────────────────────────────────────────────────────────────────────────────────


def wait_for(*, device, selector, timeout=WAIT_FOR_SECONDS):
    deadline = time.monotonic() + timeout
    while True:
        nodes = device.dump()
        if find(nodes=nodes, selector=selector):
            return nodes
        if time.monotonic() > deadline:
            raise ScriptError(f"timed out waiting for {selector}")
        time.sleep(0.7)


def do_tap(*, device, selector):
    nth = selector.get("nth", 0)
    pure = {k: v for k, v in selector.items() if k != "nth"}
    nodes = wait_for(device=device, selector=pure)
    hits = find(nodes=nodes, selector=pure)
    if nth >= len(hits):
        raise ScriptError(f"{pure} matched {len(hits)} element(s), wanted index {nth}")
    x, y = center(box=hits[nth]["box"])
    device.tap(x=x, y=y)


def do_scroll(*, device, direction):
    top, bottom = 1700, 900  # "down" moves the content up: finger goes from low to high
    if direction == "up":
        top, bottom = bottom, top
    device.swipe(x1=540, y1=top, x2=540, y2=bottom)


def selected(*, nodes, selectors, size=None):
    """Boxes of every node any selector matches, each with its selector (for style options).
    {"screen": true} is the whole image and {"rect": [l, t, r, b]} a fixed area: a modal hides the
    page from the dump, but not from the capture."""
    out = []
    for sel in selectors:
        if sel.get("screen"):
            out.append(((0, 0) + tuple(size), sel))
        elif "rect" in sel:
            out.append((tuple(sel["rect"]), sel))
        else:
            out += [(n["box"], sel) for n in find(nodes=nodes, selector=sel)]
    return out


def inset_box(*, box, inset):
    left, top, right, bottom = box
    il, it, ir, ib = inset
    return (left + il, top + it, right - ir, bottom - ib)


def do_scroll_until(*, device, spec):
    """Scroll (default down) until an element matching spec["find"] is on screen, at most
    spec["max"] swipes. A virtualised list only renders what is visible, so it has to be reached."""
    for _ in range(spec.get("max", 40) + 1):
        if find(nodes=device.dump(), selector=spec["find"]):
            return
        do_scroll(device=device, direction=spec.get("direction", "down"))
        time.sleep(0.6)
    raise ScriptError(f"scrolled {spec.get('max', 40)} times without finding {spec['find']}")


def do_shot(*, device, step, defaults, out_dir):
    time.sleep(step.get("settle", SETTLE_SECONDS))
    stray = foreign_focus(focus_lines=device.focused_window())
    if stray:
        raise ScriptError(f"{step['shot']}: another window has focus ({stray}); dismiss it and rerun")
    nodes = device.dump()
    image = device.screenshot()
    # A modal hides the page behind it from the dump but not from the capture, so what identifies
    # the content is read from the snapshot taken before the modal opened.
    use = step.get("use_snapshot")
    content = (device.snapshot or []) if use == "only" else (device.snapshot or []) + nodes if use else nodes
    original = image.copy()
    profile = defaults.get("profiles", {}).get(step.get("profile"), {})
    merged = {k: profile.get(k, []) + step.get(k, []) for k in ("covers", "lorem", "keep", "scrub", "restore", "blur")}

    # 1. What identifies the content: covers (library items, series cover, reader page).
    regions = item_regions(nodes=content) if defaults.get("replace_items", True) else {"covers": [], "titles": []}
    dim = step.get("dim_covers")
    for box in regions["covers"]:
        replace_cover(image=image, box=box)
        if dim:
            dim_box(image=image, box=box, factor=dim)
    extra_covers = selected(nodes=content, selectors=merged["covers"], size=image.size)
    for box, sel in extra_covers:
        box = inset_box(box=box, inset=sel.get("inset", (0, 0, 0, 0)))
        replace_cover(image=image, box=box)
        if "dim" in sel or dim:
            dim_box(image=image, box=box, factor=sel.get("dim", dim))
    # 2. The app's own controls, drawn over a replaced page, are put back from the capture...
    for box, sel in selected(nodes=nodes, selectors=merged["keep"], size=image.size):
        paste_back(image=image, original=original, box=box, round_corners=sel.get("round", False), radius=sel.get("radius"))
    # 3. ...minus what a translucent bar let through from the page behind it.
    for box, sel in selected(nodes=nodes, selectors=merged["scrub"], size=image.size):
        scrub_dark(image=image, box=box, below=sel.get("below", 110))
    # 4. Text goes last, so a kept bar cannot bring a real title back.
    for box in regions["titles"]:
        replace_title(image=image, box=box)
    extra_text = selected(nodes=content, selectors=merged["lorem"], size=image.size)
    for box, sel in extra_text:
        replace_title(image=image, box=box, line_px=sel.get("line_px", TITLE_LINE_PX),
                      size_px=sel.get("size_px"), bold=not sel.get("regular", False),
                      serif=sel.get("serif", False), text=sel.get("replace_with"))
    # 5. Opaque overlays that sit over text the app laid out underneath (the novel's footer).
    for box, sel in selected(nodes=nodes, selectors=merged["restore"], size=image.size):
        paste_back(image=image, original=original, box=box, round_corners=sel.get("round", False), radius=sel.get("radius"))
    boxes = [box for box, _ in selected(nodes=nodes, selectors=defaults.get("blur", []) + merged["blur"], size=image.size)]
    blur_regions(image=image, boxes=boxes)
    mask_status_bar(image=image, height=defaults.get("status_bar_px", 120))
    target = out_dir / f"{step['shot']}.png"
    image.save(target, optimize=True)
    print(f"  ✓ {target.name} ({len(regions['covers']) + len(extra_covers)} capa(s), "
          f"{len(regions['titles']) + len(extra_text)} texto(s), {len(boxes)} borrada(s))")


def run_step(*, device, step, defaults, out_dir):
    if "snapshot" in step:
        device.snapshot = device.dump()
    elif "reset_app" in step:
        # Wipes the app's data: only ever on an emulator, never on the user's phone.
        if not device.serial.startswith("emulator-"):
            raise ScriptError(f"reset_app refuses to wipe {device.serial}: it is not an emulator")
        device.shell(command=f"pm clear {APP_PACKAGE}")
        subprocess.run(device.base + ["shell", "pm", "grant", APP_PACKAGE, "android.permission.POST_NOTIFICATIONS"],
                       capture_output=True, timeout=30)
    elif "launch" in step:
        device.snapshot = None
        device.shell(command=f"am force-stop {APP_PACKAGE}")
        device.shell(command=f"am start -n {APP_PACKAGE}/{APP_ACTIVITY}")
        time.sleep(step.get("launch_wait", 4))
    elif "tap" in step:
        do_tap(device=device, selector=step["tap"])
        time.sleep(SETTLE_SECONDS)
    elif "key" in step:
        device.shell(command=f"input keyevent {int(step['key'])}")
        time.sleep(SETTLE_SECONDS)
    elif "skip_unless" in step:
        if not find(nodes=device.dump(), selector=step["skip_unless"]):
            raise SkipShot(f"{step['skip_unless']} is not on screen")
    elif "tap_if" in step:
        hits = find(nodes=device.dump(), selector=step["tap_if"])
        if hits:
            x, y = center(box=hits[0]["box"])
            device.tap(x=x, y=y)
            time.sleep(SETTLE_SECONDS)
    elif "type" in step:
        device.run(args=["shell", "input", "text", step["type"].replace(" ", "%s")])
        time.sleep(SETTLE_SECONDS)
    elif "wait" in step:
        time.sleep(step["wait"])
    elif "wait_for" in step:
        wait_for(device=device, selector=step["wait_for"])
    elif "scroll" in step:
        do_scroll(device=device, direction=step["scroll"])
        time.sleep(SETTLE_SECONDS)
    elif "scroll_until" in step:
        do_scroll_until(device=device, spec=step["scroll_until"])
    elif "back" in step:
        device.shell(command="input keyevent 4")
        time.sleep(SETTLE_SECONDS)
    elif "shot" in step:
        do_shot(device=device, step=step, defaults=defaults, out_dir=out_dir)


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--only", nargs="+", metavar="NAME", help="take only these shots")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="output folder")
    parser.add_argument("--serial", help="adb serial (default: ANDROID_SERIAL, else the first attached)")
    parser.add_argument("--emulator", action="store_true", help=f"use the emulator ({EMULATOR_SERIAL})")
    parser.add_argument("--display", help="display id (default: main screen)")
    parser.add_argument("--fresh", action="store_true",
                        help="also take the shots that need a clean install (emulator only; they wipe the app)")
    parser.add_argument("--list", action="store_true", help="list the shot names and exit")
    args = parser.parse_args()

    script = validate_script(script=json.loads(SCRIPT.read_text()))
    if args.list:
        print("\n".join(s["name"] + ("  (fresh)" if s.get("fresh") else "") for s in script["shots"]))
        return
    shots = select_shots(script=script, only=args.only, fresh=args.fresh)

    serial = EMULATOR_SERIAL if args.emulator else args.serial or os.environ.get("ANDROID_SERIAL")
    device = connect(serial=serial, display=args.display)
    args.out.mkdir(parents=True, exist_ok=True)
    defaults = script.get("defaults", {})

    previous_zen = device.shell(command="settings get global zen_mode").strip() or ZEN_OFF
    device.shell(command="input keyevent KEYCODE_WAKEUP")
    device.shell(command=f"settings put global zen_mode {ZEN_NO_INTERRUPTIONS}")
    failed = []
    try:
        for shot in shots:
            print(f"{shot['name']}")
            try:
                for step in expand_steps(script=script, shot=shot):
                    run_step(device=device, step=step, defaults=defaults, out_dir=args.out)
            except SkipShot as e:
                print(f"  – skipped: {e}")
            except (ScriptError, subprocess.SubprocessError) as e:
                print(f"  ✗ {e}")
                failed.append(shot["name"])
    finally:
        device.shell(command=f"settings put global zen_mode {previous_zen}")
    if failed:
        raise ScriptError(f"{len(failed)} shot(s) failed: {', '.join(failed)}")


if __name__ == "__main__":
    try:
        main()
    except ScriptError as e:
        sys.exit(f"erro: {e}")
