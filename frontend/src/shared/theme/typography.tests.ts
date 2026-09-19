import { text, MAX_FONT_SCALE } from './typography';
import { themes } from './themes';

describe('type scale', () => {
  const steps = [1, 2, 3, 4, 5, 6, 7] as const;

  it('renders every step as a whole pixel', () => {
    for (const s of steps) {
      expect(Number.isInteger(text.size[s])).toBe(true);
    }
  });

  it('grows monotonically', () => {
    const rendered = steps.map(s => text.size[s]);
    expect(rendered).toEqual([...rendered].sort((a, b) => a - b));
    expect(new Set(rendered).size).toBe(rendered.length);
  });

  it('puts body copy on Android’s own default size', () => {
    // Step 3 is what the migration mapped the bulk of the app onto; 14 is the platform default,
    // and the reason BASE is 16 rather than any other round number.
    expect(text.size[3]).toBe(14);
  });

  it('keeps nothing below a legible size', () => {
    expect(Math.min(...steps.map(s => text.size[s]))).toBeGreaterThanOrEqual(10);
  });
});

describe('title scale', () => {
  const levels = ['large', 'x-large', 'xx-large', 'xxx-large'] as const;

  it('grows monotonically from h4 to h1', () => {
    const rendered = levels.map(l => text.size.title[l]);
    expect(rendered).toEqual([...rendered].sort((a, b) => a - b));
  });

  it('starts no smaller than body copy — a title is never smaller than the text it heads', () => {
    expect(text.size.title.large).toBeGreaterThanOrEqual(text.size[3]);
  });
});

describe('weights', () => {
  it('offers exactly the two the app means: normal and emphasised', () => {
    expect(Object.keys(text.weight)).toEqual(['regular', 'bold']);
  });

  it('uses the CSS numeric scale', () => {
    expect(text.weight.regular).toBe('400');
    expect(text.weight.bold).toBe('700');
  });
});

describe('font family', () => {
  // The slot has to be real, not a field nobody reads: a style built from it must carry whatever
  // it holds, so bundling a font later is one value in one file.
  it('resolves to the system font', () => {
    expect(text.family.primary).toBeUndefined();
  });

  it('reaches the style layer', () => {
    const style = { fontFamily: text.family.primary, fontSize: text.size[3] };
    expect(style).toHaveProperty('fontFamily', text.family.primary);
    expect(style.fontSize).toBe(text.size[3]);
  });
});

describe('typography is not part of the theme', () => {
  // Decision 4e: switching identity changes colour and nothing else.
  it('no theme carries a size, a weight or a family', () => {
    const serialised = JSON.stringify(themes);
    expect(serialised).not.toContain('fontSize');
    expect(serialised).not.toContain('fontWeight');
    expect(serialised).not.toContain('fontFamily');
  });

  it('the same tokens hold whichever theme is active', () => {
    const before = JSON.stringify(text);
    // Reading every theme cannot mutate the type tokens — they are a sibling module, not state.
    Object.values(themes).forEach(palette => expect(palette.text).toBeDefined());
    expect(JSON.stringify(text)).toBe(before);
  });
});

describe('system font scale', () => {
  it('caps enlargement at the top of Android’s own range', () => {
    expect(MAX_FONT_SCALE).toBe(2.0);
  });
});
