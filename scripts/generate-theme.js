#!/usr/bin/env node
/**
 * Scaffolds a colour theme from a handful of decisions.
 *
 *   node scripts/generate-theme.js --name forest --bg 16,28,22 --accent 94,200,130 \
 *     --text 228,240,232 --oled
 *
 * A theme is 64 tokens, but an identity is only a few choices — a background, a text colour, an
 * accent. Everything else is derived: the surface ladder from the background, the muted and faint
 * text from the text colour, the pressed accent and the colour that reads ON it. Pass any of them
 * to override the derivation.
 *
 * Required:
 *   --name <word>        folder and constant name, in English (project rule). The display name is
 *                        a translation and goes in strings.ts, not here.
 *   --bg r,g,b           the screen behind everything.
 *   --accent r,g,b       the identity's colour: buttons, links, progress.
 *
 * Optional, each defaulting to something derived from the three above:
 *   --text r,g,b         body copy.               --muted / --faint  supporting, disabled.
 *   --sheet / --raised   the card, the chip.      --on-accent        legible ON the accent.
 *   --accent-deep        the accent at rest.      --good / --bad     success, failure.
 *   --read               reading progress.        --special          the "new chapter" badge.
 *   --oled               also emit an OLED variant, floor on real black.
 *   --force              overwrite a theme that already exists.
 *   --no-card            skip the preview image.
 *
 * What it does NOT do is judge the result. Derivation gets the structure right; whether a palette
 * is legible is decided by `themes.tests.ts` (7:1 for body copy) and whether it is pleasant is
 * decided on a real screen. It runs the first for you and draws the second.
 *
 * It registers the theme itself: the list in `themes/index.ts` is alphabetical by key with each
 * OLED variant pinned under its parent, which is mechanical enough to maintain automatically.
 *
 * What is left by hand is the display name, which is a translation and cannot be derived:
 *   1. add `themeName<Name>` to both languages in `shared/i18n/strings.ts`;
 *   2. add the same key to the label map in `config.screen.tsx`, and to NAMES in
 *      `scripts/build-theme-cards.py`.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'frontend', 'src', 'shared', 'theme', 'themes');
const R = (r, g, b) => `rgb(${r}, ${g}, ${b})`;

/** Parses `--flag value` pairs and bare `--flag` switches into one object. */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

const rgb = (value, flag) => {
  const parts = String(value).split(',').map(n => Number(n.trim()));
  if (parts.length !== 3 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) {
    throw new Error(`--${flag} takes three channels 0-255, e.g. --${flag} 16,28,22 (got "${value}")`);
  }
  return parts;
};

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const lum = ([r, g, b]) =>
  [r, g, b].map(v => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4))
    .reduce((acc, v, i) => acc + [0.2126, 0.7152, 0.0722][i] * v, 0);
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** Lightens until it clears `target` against `bg` — how the palettes were tuned by hand before. */
const lift = (colour, bg, target = 7) => {
  let out = [...colour];
  while (contrast(out, bg) < target && out.some(v => v < 255)) out = out.map(v => Math.min(255, v + 2));
  return out;
};

const WHITE = [255, 255, 255];

/**
 * Fills in everything the caller did not state.
 *
 * The surface ladder steps toward white rather than by a fixed amount, so a dark identity keeps
 * its steps small and a lighter one spreads them — what matters is that the card reads as sitting
 * ON the screen, not floating above it. The muted and faint text are lifted until they clear the
 * card, which is the bar `themes.tests.ts` holds.
 */
function derive(args) {
  const bg = rgb(args.bg, 'bg');
  const accent = rgb(args.accent, 'accent');
  const sheet = args.sheet ? rgb(args.sheet, 'sheet') : mix(bg, WHITE, 0.06);
  const raised = args.raised ? rgb(args.raised, 'raised') : mix(bg, WHITE, 0.12);
  const text = args.text ? rgb(args.text, 'text') : mix(accent, WHITE, 0.9);

  const palette = {
    folder: args.name,
    bg,
    sheet,
    raised,
    text,
    muted: args.muted ? rgb(args.muted, 'muted') : lift(mix(text, bg, 0.35), sheet),
    faint: args.faint ? rgb(args.faint, 'faint') : mix(text, bg, 0.68),
    accent,
    accentDeep: args['accent-deep'] ? rgb(args['accent-deep'], 'accent-deep') : mix(accent, bg, 0.7),
    // Black or white, whichever the accent can actually carry.
    onAccent: args['on-accent']
      ? rgb(args['on-accent'], 'on-accent')
      : contrast(accent, [0, 0, 0]) >= contrast(accent, WHITE) ? mix(bg, [0, 0, 0], 0.5) : WHITE,
    good: args.good ? rgb(args.good, 'good') : [120, 195, 135],
    bad: args.bad ? rgb(args.bad, 'bad') : [240, 130, 125],
    read: args.read ? rgb(args.read, 'read') : [246, 173, 85],
    special: args.special ? rgb(args.special, 'special') : [150, 145, 200],
  };

  if (args.oled) {
    // The whole ladder drops, not just the floor: keeping only the background black would widen
    // the gap to the card, and the card would read as floating. 0.45 is what keeps the step close
    // to the parent's — the hand-tuned variants land there.
    const shrink = c => mix([0, 0, 0], c, 0.45);
    palette.oled = { bg: [0, 0, 0], sheet: shrink(sheet), raised: shrink(raised) };
  }
  return palette;
}

const body = p => `  text: {
    primary: '${R(...p.text)}',
    secondary: '${R(...p.muted)}',
    tertiary: '${R(...p.faint)}',
    ghost: '${R(...p.text)}',
    emphasis: '${R(...p.text)}',
    bold: '${R(...p.text)}',

    title: {
      primary: '${R(...p.text)}',
      secondary: '${R(...p.muted)}',
    },

    button: {
      primary: '${R(...p.onAccent)}',
      secondary: '${R(...p.text)}',
      destructive: '${R(...p.text)}',
    },

    link: {
      primary: '${R(...p.accent)}',
      secondary: '${R(...p.text)}',
      destructive: '${R(...p.bad)}',
    },

    input: {
      primary: '${R(...p.text)}',
      masked: '${R(...p.text)}',
      placeholder: '${R(...p.faint)}',
    },

    label: '${R(...p.text)}',

    message: {
      good: '${R(...p.good)}',
      bad: '${R(...p.bad)}',
    },
  },

  icon: {
    primary: '${R(...p.text)}',
    secondary: '${R(...p.muted)}',
    tertiary: '${R(...p.faint)}',

    button: {
      primary: '${R(...p.onAccent)}',
      secondary: '${R(...p.accent)}',
    },

    following: '${R(...p.read)}',

    status: {
      good: '${R(...p.good)}',
      off: '${R(...p.faint)}',
      bad: '${R(...p.bad)}',
      unread: '${R(...p.accent)}',
    },

    message: {
      good: '${R(...p.good)}',
      bad: '${R(...p.bad)}',
    },
  },

  surface: {
    primary: '${R(...p.bg)}',
    secondary: '${R(...p.sheet)}',
    tertiary: '${R(...p.raised)}',

    reading: {
      background: '${R(0,0,0)}',
      strip: '${R(26,26,26)}',
    },

    dim: '${R(0,0,0)}',
  },

  button: {
    primary: '${R(...p.accent)}',
    secondary: '${R(...p.raised)}',
    destructive: '${R(192,57,43)}',
    confirmation: '${R(...p.good)}',
    selected: '${R(...p.accent)}',
    disabled: '${R(...p.faint)}',

    switch: {
      thumb: { on: '${R(...p.accent)}', off: '${R(...p.muted)}' },
      track: { on: '${R(...p.accentDeep)}', off: '${R(...p.raised)}' },
    },
  },

  badge: {
    special: '${R(...p.special)}',
    error: '${R(197,48,48)}',
  },

  banner: {
    alert: '${R(...p.accent)}',
    notice: '${R(...p.accent)}',
    good: '${R(...p.good)}',
  },

  border: {
    primary: '${R(...p.raised)}',
    secondary: '${R(...p.text)}',
    accent: '${R(...p.accent)}',
    disabled: '${R(...p.faint)}',

    input: {
      primary: '${R(...p.raised)}',
      error: '${R(...p.bad)}',
    },

    checkbox: {
      on: '${R(...p.accent)}',
      off: '${R(...p.faint)}',
    },
  },

  progress: {
    primary: '${R(...p.accent)}',
    secondary: '${R(...p.text)}',

    reading: {
      primary: '${R(...p.read)}',
      secondary: '${R(...p.muted)}',
    },
  },`;

/**
 * Adds the theme to the registry, in the one position the ordering rule allows.
 *
 * The list is alphabetical by key with each OLED variant pinned under its parent — mechanical
 * enough for a script to maintain, which is why it is that and not a curated order. Editing the
 * file as text rather than parsing it keeps the comments and formatting intact.
 */
function register(name, hasOled) {
  const file = path.join(OUT, 'index.ts');
  let source = fs.readFileSync(file, 'utf8');
  const Name = `${name[0].toUpperCase()}${name.slice(1)}`;

  if (new RegExp(`^\\s*${name}: `, 'm').test(source)) {
    console.log(`already in themes/index.ts — left alone`);
    return;
  }

  const imported = hasOled ? `{ ${name}Colors, ${name}OledColors }` : `{ ${name}Colors }`;
  const importLine = `import ${imported} from './${name}';\n`;
  const imports = [...source.matchAll(/^import \{[^}]*\} from '\.\/(\w+)';$/gm)];
  const afterImport = imports.find(m => m[1] > name);
  source = afterImport
    ? source.slice(0, afterImport.index) + importLine + source.slice(afterImport.index)
    : source.replace(imports[imports.length - 1][0] + '\n', imports[imports.length - 1][0] + '\n' + importLine);

  const block = source.match(/export const themes = \{\n([\s\S]*?)\n\} as const;/);
  const entries = block[1].split('\n').filter(Boolean);
  const added = [`  ${name}: ${name}Colors,`];
  if (hasOled) added.push(`  ${name}Oled: ${name}OledColors,`);
  // The first identity that sorts after this one — a variant never anchors the comparison, since
  // it belongs to whatever precedes it.
  const at = entries.findIndex(line => {
    const key = line.trim().split(':')[0];
    return !key.endsWith('Oled') && key > name;
  });
  entries.splice(at === -1 ? entries.length : at, 0, ...added);
  source = source.replace(block[0], `export const themes = {\n${entries.join('\n')}\n} as const;`);

  fs.writeFileSync(file, source);
  console.log(`registered ${name}${hasOled ? ` and ${name}Oled` : ''} in themes/index.ts`);
  return Name;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  for (const required of ['name', 'bg', 'accent']) {
    if (typeof args[required] !== 'string') {
      throw new Error(`--${required} is required. See the comment at the top of this file.`);
    }
  }
  if (!/^[a-z][a-zA-Z]*$/.test(args.name)) {
    throw new Error(`--name must be a lowercase English word (got "${args.name}")`);
  }

  const palette = derive(args);
  const dir = path.join(OUT, palette.folder);
  if (fs.existsSync(dir) && !args.force) {
    throw new Error(`${path.relative(process.cwd(), dir)} already exists — pass --force to overwrite`);
  }

  let out = `import type { ThemeColors } from '../../colors.types';\n\n`;
  out += `// ${args.name[0].toUpperCase()}${args.name.slice(1)}.\n`;
  out += `//\n// Every foreground clears 7:1 against the surface it sits on (WCAG AAA for body text); the\n`;
  out += `// themes test is what holds that.\n`;
  out += `export const ${args.name}Colors: ThemeColors = {\n${body(palette)}\n};\n`;
  if (palette.oled) {
    out += `\n// The same identity with its floor on real black: on an OLED panel an unlit pixel costs no\n`;
    out += `// power and the contrast is absolute. Only the surfaces move, and the whole ladder moves\n`;
    out += `// together — dropping just the background would widen the gap to the card, which reads as the\n`;
    out += `// card floating rather than sitting on the screen.\n`;
    out += `export const ${args.name}OledColors: ThemeColors = {\n  ...${args.name}Colors,\n  surface: {\n`;
    out += `    ...${args.name}Colors.surface,\n`;
    out += `    primary: '${R(...palette.oled.bg)}',\n`;
    out += `    secondary: '${R(...palette.oled.sheet)}',\n`;
    out += `    tertiary: '${R(...palette.oled.raised)}',\n  },\n};\n`;
  }

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'colors.tokens.ts'), out);
  fs.writeFileSync(path.join(dir, 'index.ts'), "export * from './colors.tokens';\n");
  console.log(`wrote ${path.relative(process.cwd(), dir)}${palette.oled ? ' (+ OLED variant)' : ''}`);

  register(args.name, Boolean(palette.oled));

  // What the numbers actually mean is only visible as a picture, so draw one straight away. It
  // needs the theme exported from the registry first, which is a manual step — so a failure here
  // is expected on a brand-new theme and says so rather than looking like a crash.
  if (args['no-card'] !== true) {
    try {
      execFileSync('python3', [path.join(__dirname, 'build-theme-cards.py')], { stdio: 'inherit' });
    } catch {
      console.log(
        '\nthe preview could not be drawn yet — export the theme from themes/index.ts and add it to' +
          '\nNAMES in scripts/build-theme-cards.py, then: python3 scripts/build-theme-cards.py',
      );
    }
  }

  const Name = `${args.name[0].toUpperCase()}${args.name.slice(1)}`;
  console.log(
    `\nstill to do by hand — the display name is a translation, so nobody can invent it:` +
      `\n  1. add themeName${Name} to both languages in shared/i18n/strings.ts` +
      `\n  2. add it to the label map in config.screen.tsx, and to NAMES in build-theme-cards.py` +
      `\n  3. npx jest src/shared/theme  — the legibility bar is held there`,
  );
}

try {
  main();
} catch (error) {
  console.error(`\n${error.message}\n`);
  process.exit(1);
}
