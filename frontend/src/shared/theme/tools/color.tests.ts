import { ColorTool } from './color.tool';
import { colors } from '../themes';

describe('ColorTool.add.alpha', () => {
  it('turns a token into the same colour at the given opacity', () => {
    expect(ColorTool.add.alpha('rgb(255, 255, 255)', 0.15)).toBe('rgba(255, 255, 255, 0.15)');
  });

  it('works on a real token', () => {
    expect(ColorTool.add.alpha(colors.surface.dim, 0.5)).toBe('rgba(0, 0, 0, 0.5)');
  });

  it('accepts a token written without spaces', () => {
    expect(ColorTool.add.alpha('rgb(1,2,3)' as never, 0.5)).toBe('rgba(1, 2, 3, 0.5)');
  });

  it('clamps an out-of-range opacity instead of emitting an invalid colour', () => {
    expect(ColorTool.add.alpha('rgb(0, 0, 0)', 2)).toBe('rgba(0, 0, 0, 1)');
    expect(ColorTool.add.alpha('rgb(0, 0, 0)', -1)).toBe('rgba(0, 0, 0, 0)');
  });

  it('keeps full opacity meaningful', () => {
    expect(ColorTool.add.alpha('rgb(10, 20, 30)', 1)).toBe('rgba(10, 20, 30, 1)');
    expect(ColorTool.add.alpha('rgb(10, 20, 30)', 0)).toBe('rgba(10, 20, 30, 0)');
  });

  // The type stops a non-rgb value reaching here, but JS callers and `as never` casts do not
  // type-check. Returning the input keeps a wrong colour visible rather than crashing a screen.
  it('returns anything it cannot parse untouched', () => {
    expect(ColorTool.add.alpha('#FFFFFF' as never, 0.5)).toBe('#FFFFFF');
    expect(ColorTool.add.alpha('' as never, 0.5)).toBe('');
  });
});

describe('ColorTool.to.hex', () => {
  // The boundary this exists for: android.graphics.Color.parseColor throws on rgb(), so a token
  // handed to native raw falls back to white or transparent — the theme silently not applying.
  it('converts a token to the notation native Android parses', () => {
    expect(ColorTool.to.hex('rgb(26, 26, 46)')).toBe('#1A1A2E');
  });

  it('pads a single-digit channel, so the result is always six characters', () => {
    expect(ColorTool.to.hex('rgb(1, 2, 3)')).toBe('#010203');
  });

  it('handles the extremes', () => {
    expect(ColorTool.to.hex('rgb(0, 0, 0)')).toBe('#000000');
    expect(ColorTool.to.hex('rgb(255, 255, 255)')).toBe('#FFFFFF');
  });

  it('clamps a channel out of range rather than emitting something unparseable', () => {
    // The type checks the shape, not the range — rgb(999, 0, 0) type-checks.
    expect(ColorTool.to.hex('rgb(999, 0, 0)')).toBe('#FF0000');
  });

  it('falls back to black on unparseable input, because a crash is worse than a wrong colour', () => {
    expect(ColorTool.to.hex('not a colour' as never)).toBe('#000000');
  });
});
