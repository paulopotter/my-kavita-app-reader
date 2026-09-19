import { colors, themes, activeTheme } from './index';
import type { ThemeColors } from '../colors.types';

// What these tests defend is the *contract*, not the values. A theme may repaint anything; what it
// may not do is leave a role unfilled, invent a name outside the contract, or smuggle a brightness
// word into one — those are the mistakes that only surface once a second identity exists, which is
// exactly when they are expensive.

const everyLeaf = (node: unknown, path: string[] = []): Array<[string, string]> =>
  typeof node === 'string'
    ? [[path.join('.'), node]]
    : Object.entries(node as Record<string, unknown>).flatMap(([k, v]) => everyLeaf(v, [...path, k]));

describe('theme registry', () => {
  it('exposes the active theme as `colors`', () => {
    expect(colors).toBe(themes[activeTheme]);
  });

  it('registers every theme under a name', () => {
    expect(Object.keys(themes).length).toBeGreaterThan(0);
    expect(themes).toHaveProperty(activeTheme);
  });
});

describe('every theme fills the contract', () => {
  const names = Object.keys(themes) as Array<keyof typeof themes>;

  it.each(names)('%s defines a non-empty value for every token', name => {
    const leaves = everyLeaf(themes[name]);
    expect(leaves.length).toBeGreaterThan(0);
    for (const [path, value] of leaves) {
      expect(typeof value).toBe('string');
      expect(value.trim()).not.toBe('');
      // Every token is an opaque `rgb()` triple. The type already enforces the shape; this
      // guards the halves it cannot see — that the channels are real 0-255 numbers, and that no
      // alpha crept in (opacity is the call site's, applied with `ColorTool.add.alpha()`).
      const channels = /^rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)$/.exec(value);
      expect(channels).not.toBeNull();
      for (const channel of channels!.slice(1)) {
        expect(Number(channel)).toBeLessThanOrEqual(255);
      }
      expect(path).toBeTruthy();
    }
  });

  it.each(names)('%s uses exactly the same token paths as every other theme', name => {
    const reference = everyLeaf(themes[names[0]]).map(([p]) => p).sort();
    const actual = everyLeaf(themes[name]).map(([p]) => p).sort();
    expect(actual).toEqual(reference);
  });
});

describe('token names', () => {
  // Decision 1 of plan 028: a name describes a role, never a brightness. `textOnDark` stops being
  // true the moment an identity is not dark.
  it.each(['dark', 'light', 'white', 'black', 'bright'])('no token path contains "%s"', word => {
    const offenders = everyLeaf(colors)
      .map(([path]) => path)
      .filter(path => path.toLowerCase().includes(word));
    expect(offenders).toEqual([]);
  });
});

describe('the default theme', () => {
  // A spot-check that the grammar holds where it is easiest to get wrong: `primary` is the
  // canonical case of its parent, so body copy and the screen heading are *different* colours.
  it('separates ordinary body copy from the screen heading', () => {
    expect(colors.text.primary).not.toBe(colors.text.title.primary);
  });

  it('types as ThemeColors', () => {
    const typed: ThemeColors = colors;
    expect(typed.text.label).toBeDefined();
  });
});
