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
