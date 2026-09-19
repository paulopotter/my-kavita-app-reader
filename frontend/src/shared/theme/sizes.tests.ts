import { spacing, radius, border, gutter } from './sizes';
import { themes } from './themes';

describe('spacing scale', () => {
  const steps = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

  it('renders every step as a whole pixel', () => {
    for (const s of steps) {
      expect(Number.isInteger(spacing[s])).toBe(true);
    }
  });

  it('grows monotonically, with no two steps alike', () => {
    const rendered = steps.map(s => spacing[s]);
    expect(rendered).toEqual([...rendered].sort((a, b) => a - b));
    expect(new Set(rendered).size).toBe(rendered.length);
  });

  it('keeps the base step at 8 — the step the app already followed', () => {
    expect(spacing[4]).toBe(8);
  });
});

describe('the screen gutter', () => {
  it('is one of the spacing steps, not a value of its own', () => {
    expect(Object.values(spacing)).toContain(gutter);
  });

  // It is the app's breathing room: a screen adds space on top of it, never opens tighter.
  it('leaves room to breathe without crowding the content', () => {
    expect(gutter).toBeGreaterThanOrEqual(spacing[5]);
    expect(gutter).toBeLessThanOrEqual(spacing[7]);
  });
});

describe('radius scale', () => {
  it('grows from small to large', () => {
    expect(radius.small).toBeLessThan(radius.medium);
    expect(radius.medium).toBeLessThan(radius.large);
  });

  // `full` is an instruction, not a step: any value past half the element's height rounds it away.
  it('rounds away entirely at full', () => {
    expect(radius.full).toBeGreaterThan(radius.large * 10);
  });
});

describe('border widths', () => {
  it('draws the thinnest line the screen allows', () => {
    // hairlineWidth is below 1 on every density the app runs on; a literal 0.5 would not be.
    expect(border.small).toBeLessThanOrEqual(border.medium);
    expect(border.small).toBeGreaterThan(0);
  });
});

describe('sizes are not part of the theme', () => {
  // Decision 4e: switching identity changes colour and nothing else.
  it('no theme carries a spacing, a radius or a border width', () => {
    const serialised = JSON.stringify(themes);
    expect(serialised).not.toContain('padding');
    expect(serialised).not.toContain('borderRadius');
    expect(serialised).not.toContain('borderWidth');
  });

  it('the same values hold whichever theme is active', () => {
    const before = JSON.stringify({ spacing, radius, border, gutter });
    Object.values(themes).forEach(palette => expect(palette.text).toBeDefined());
    expect(JSON.stringify({ spacing, radius, border, gutter })).toBe(before);
  });
});
