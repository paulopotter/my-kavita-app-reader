#!/usr/bin/env python3
"""Check that the docs screenshots keep up with the app.

The rule (see .claude/docs/screenshots.md): a new screen gets a screenshot, a new theme gets the main
screens in its palette, and a significant layout change refreshes the shots of what it touched.

This script checks the mechanical part and warns about the rest:

  ERROR  a screen folder under frontend/src/screens/ that scripts/screenshots/shots.json does not cover
  ERROR  a shot in shots.json whose image is not in docs/external/screenshots/
  ERROR  a theme in the registry missing the "themed" shots under by-theme/<theme>/
  WARN   by-theme/ holds a theme that no longer exists
  WARN   a screen's code (or the shared components / theme tokens) changed after its screenshots were taken
         — the layout-change case, which only a person can judge, so it never fails the run on its own

Usage: python3 scripts/check-screenshots.py [--strict] [--quiet]
  --strict  warnings fail too
  --quiet   print nothing when everything is fine (for hooks)
"""

import argparse
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SHOTS_JSON = ROOT / "scripts" / "screenshots" / "shots.json"
SCREENS = ROOT / "frontend" / "src" / "screens"
DOCS = ROOT / "docs" / "external" / "screenshots"
SHARED_LAYOUT_PATHS = ["frontend/src/shared/components", "frontend/src/shared/theme"]

_spec = importlib.util.spec_from_file_location("take_screenshots", ROOT / "scripts" / "take-screenshots.py")
_take = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_take)


# ── pure checks (covered by check-screenshots.tests.py) ──────────────────────────────────────


def uncovered_screens(*, screens, coverage, shot_names):
    """Screens with no (existing) shot behind them."""
    return [s for s in screens if not [n for n in coverage.get(s, []) if n in shot_names]]


def unknown_coverage(*, coverage, shot_names, screens):
    """Coverage entries that name a shot or a screen that does not exist: a typo or a leftover."""
    out = [f"{screen}: {name}" for screen, names in coverage.items() for name in names if name not in shot_names]
    out += [f"{screen}: (no such screen folder)" for screen in coverage if screen not in screens]
    return out


def missing_images(*, shot_names, existing):
    return [n for n in shot_names if f"{n}.png" not in existing]


def missing_theme_images(*, themed, keys, existing_by_theme):
    """{theme key: [shots missing]} for every theme that lacks at least one themed shot."""
    out = {}
    for key in keys:
        have = existing_by_theme.get(_take.theme_slug(key=key), set())
        gone = [n for n in themed if f"{n}.png" not in have]
        if gone:
            out[key] = gone
    return out


def stale_themes(*, keys, existing_by_theme):
    wanted = {_take.theme_slug(key=k) for k in keys}
    return sorted(set(existing_by_theme) - wanted)


def changed_after(*, code_ts, image_ts):
    """True when code was committed after the newest of its images. Unknown (0) never counts."""
    return bool(code_ts and image_ts and code_ts > image_ts)


# ── reading the repo ─────────────────────────────────────────────────────────────────────────


def last_commit_ts(*, paths, exclude_tests=False):
    spec = list(paths)
    if exclude_tests:
        spec += [":(exclude)*.tests.ts", ":(exclude)*.tests.tsx", ":(exclude)*.test.ts", ":(exclude)*.test.tsx"]
    out = subprocess.run(["git", "log", "-1", "--format=%ct", "--"] + spec, cwd=ROOT,
                         capture_output=True, text=True).stdout.strip()
    return int(out) if out else 0


def existing_by_theme():
    base = DOCS / "by-theme"
    if not base.is_dir():
        return {}
    return {d.name: {f.name for f in d.glob("*.png")} for d in base.iterdir() if d.is_dir()}


def check():
    script = json.loads(SHOTS_JSON.read_text())
    shots = script["shots"]
    shot_names = [s["name"] for s in shots]
    themed = [s["name"] for s in shots if s.get("themed")]
    coverage = script.get("coverage", {})
    screens = sorted(p.name for p in SCREENS.iterdir() if p.is_dir() and not p.name.startswith("."))
    keys = _take.parse_theme_keys(text=_take.THEMES_INDEX.read_text())
    errors, warnings = [], []

    for screen in uncovered_screens(screens=screens, coverage=coverage, shot_names=set(shot_names)):
        errors.append(f"tela nova sem screenshot: frontend/src/screens/{screen}/ — crie a tela no roteiro "
                      f"(scripts/screenshots/shots.json) e liste-a em \"coverage\"")
    for entry in unknown_coverage(coverage=coverage, shot_names=set(shot_names), screens=set(screens)):
        errors.append(f"coverage aponta para algo que não existe: {entry}")

    existing = {f.name for f in DOCS.glob("*.png")}
    for name in missing_images(shot_names=shot_names, existing=existing):
        errors.append(f"screenshot faltando: {name}.png — rode: make screenshots EMULATOR=1 ONLY={name}")

    by_theme = existing_by_theme()
    gaps = missing_theme_images(themed=themed, keys=keys, existing_by_theme=by_theme)
    if gaps:
        detail = "; ".join(f"{k}: {len(v)}/{len(themed)}" for k, v in gaps.items())
        errors.append(f"temas sem as telas principais ({detail}) — rode: make screenshots EMULATOR=1 THEMES=1 "
                      f"(ou THEMES=\"{' '.join(gaps)}\" só para esses)")
    for slug in stale_themes(keys=keys, existing_by_theme=by_theme):
        warnings.append(f"by-theme/{slug}/ é de um tema que não existe mais — apague a pasta")

    for screen in screens:
        names = [n for n in coverage.get(screen, []) if n in shot_names]
        image_ts = max([last_commit_ts(paths=[f"docs/external/screenshots/{n}.png"]) for n in names] or [0])
        code_ts = last_commit_ts(paths=[f"frontend/src/screens/{screen}"], exclude_tests=True)
        if changed_after(code_ts=code_ts, image_ts=image_ts):
            warnings.append(f"a tela '{screen}' mudou depois dos prints dela ({', '.join(names)}) — se o layout "
                            f"mudou de forma significativa, refaça: make screenshots EMULATOR=1")
    all_ts = [last_commit_ts(paths=[f"docs/external/screenshots/{n}.png"]) for n in shot_names]
    shared_ts = last_commit_ts(paths=SHARED_LAYOUT_PATHS, exclude_tests=True)
    if changed_after(code_ts=shared_ts, image_ts=min([t for t in all_ts if t] or [0])):
        warnings.append("componentes ou tokens de tema compartilhados mudaram depois de alguns prints — se mexeram "
                        "no visual de várias telas, refaça tudo: make screenshots EMULATOR=1 && "
                        "make screenshots EMULATOR=1 THEMES=1")
    return errors, warnings


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--strict", action="store_true", help="warnings fail too")
    parser.add_argument("--quiet", action="store_true", help="print nothing when all is well")
    args = parser.parse_args()
    errors, warnings = check()
    for line in errors:
        print(f"✗ {line}")
    for line in warnings:
        print(f"⚠ {line}")
    if not errors and not warnings and not args.quiet:
        print("✓ screenshots em dia: toda tela e todo tema têm o seu")
    sys.exit(1 if errors or (args.strict and warnings) else 0)


if __name__ == "__main__":
    main()
