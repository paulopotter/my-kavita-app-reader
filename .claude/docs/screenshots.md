# Docs screenshots — load when adding a screen, a theme, or changing layout

The images in `docs/external/screenshots/` are taken by `make screenshots`, never by hand. They show
no real data: covers become a default image and titles, synopses, reader pages, URLs and API keys become
placeholders (see `scripts/take-screenshots.py`).

## The routine

| What changed | What to do |
|---|---|
| **New screen** (a folder under `frontend/src/screens/`) | Add its shots to `scripts/screenshots/shots.json` **and** list them in `"coverage"` under the screen's folder name. Take them: `make screenshots EMULATOR=1 ONLY="<names>"`. Add a row to `docs/external/screenshots/INDEX.md`. |
| **New theme** (a key in `themes/index.ts`) | `make screenshots EMULATOR=1 THEMES=<key>`. The theme is picked up from the registry; nothing to edit in the script. |
| **Significant layout change** (a screen's structure or spacing, a shared component, theme tokens) | Retake the shots of what it touched: `make screenshots EMULATOR=1 ONLY="<names>"`. If it is shared by many screens, retake everything: `make screenshots EMULATOR=1` and `make screenshots EMULATOR=1 THEMES=1`. |
| **New state of a screen** (a modal, an overlay, an empty state) | A new shot for it in `shots.json` and in `"coverage"`. |

`make check-screenshots` checks the mechanical part and must pass before a task closes (it runs inside
`checar-arquitetura`, which `finalizar-task` runs first). It **fails** when a screen, a shot or a theme has no
image, and only **warns** when a screen's code changed after its screenshots were taken — "significant"
is a person's call, so that one never blocks by itself.

## Taking them

```bash
make emulator                          # boots the AVD (2 min) and leaves it up; make emulator-stop to shut it
make screenshots EMULATOR=1            # every shot, in the current theme
make screenshots EMULATOR=1 ONLY=home  # one shot
make screenshots EMULATOR=1 THEMES=1   # the "themed" shots once per theme -> by-theme/<theme>/
make screenshots EMULATOR=1 THEMES="amber teal"
make check-screenshots
```

`make screenshots EMULATOR=1` looks after the emulator itself: if it was off it boots it and shuts it down
when the run ends; if it was already up (`make emulator`) it leaves it up.

The emulator must have a Kavita server configured and the app in Portuguese (the script's selectors are the
app's own pt-BR labels). Screens that need a clean install (`"fresh": true`: the welcome screens) run only with
`--fresh` or by name; they wipe the app's data, which the script refuses to do on anything but an emulator.

A phone works too (`make screenshots`, with `SERIAL=` if an emulator is also attached), but the emulator
is preferred: no personal notifications or alarms, a clean install is possible, and nothing to unplug.
The one exception to "tests run on a physical device" is this.

## Writing a shot

`scripts/screenshots/shots.json`: a shot is a list of steps (`launch`, `tap`, `tap_if`, `type`, `key`,
`scroll`, `scroll_until`, `wait_for`, `snapshot`, `skip_unless`, `reset_app`, and `shot` last). Elements are
found by text, content-desc or resource-id from `uiautomator dump`, never by coordinates, and a selector can
be relative (`inside`, `below`) so a taller status bar on another device does not break it.

What hides personal data is in `"defaults"` and in profiles:

- library items (cover + title) are replaced automatically;
- a screen with other content lists it: `covers` (an image), `lorem` (text, optionally `replace_with`);
- a modal hides the page behind it from the dump, so take a `snapshot` before opening it and use
  `use_snapshot`; `restore` puts the modal back over what was replaced.

Mark the shots that should exist in every theme `"themed": true` — the main screens only (home, library,
series, both readers, search, settings).

## Gotchas

- Look at every new shot before committing it: a selector that stops matching leaves the real content
  visible, and the log still says `✓`.
- On a 12th-gen+ Intel Mac the Android 35 emulator needs `clearcpuid=waitpkg` on the kernel command line;
  `make emulator` does it. Never `pkill qemu-system-x86_64`: Docker's VM uses the same binary.
- The splash shows what the device has (a staged OTA update puts an "update" button on it).
