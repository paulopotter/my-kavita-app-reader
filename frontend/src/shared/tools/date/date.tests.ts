import { DateTool } from './date.tool';
import { getStrings } from '../../i18n/strings';

const t = getStrings('pt-BR');

describe('DateTool.parse.to.iso', () => {
  it('adds the Z and clamps a long fraction on a zone-less Kavita value', () => {
    expect(DateTool.parse.to.iso('2026-07-30T02:04:27.9142132')).toBe('2026-07-30T02:04:27.914Z');
  });

  it('pads a short fraction to milliseconds', () => {
    expect(DateTool.parse.to.iso('2026-07-30T02:04:27.9')).toBe('2026-07-30T02:04:27.900Z');
  });

  it('adds .000Z when there is no fraction', () => {
    expect(DateTool.parse.to.iso('2026-07-30T02:04:27')).toBe('2026-07-30T02:04:27.000Z');
  });

  it('trusts a value that already ends in Z', () => {
    expect(DateTool.parse.to.iso('2026-07-30T02:04:27.914Z')).toBe('2026-07-30T02:04:27.914Z');
  });

  it('trusts a value that already carries an offset', () => {
    expect(DateTool.parse.to.iso('2026-07-30T02:04:27-03:00')).toBe('2026-07-30T02:04:27-03:00');
  });

  it('returns undefined for null / empty / whitespace', () => {
    expect(DateTool.parse.to.iso(undefined)).toBeUndefined();
    expect(DateTool.parse.to.iso('')).toBeUndefined();
    expect(DateTool.parse.to.iso('   ')).toBeUndefined();
  });

  it('warns and returns undefined for an unrecognized shape', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(DateTool.parse.to.iso('30/07/2026')).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('DateTool.parse.to.epochMs', () => {
  it('parses a zone-less 7-digit-fraction Kavita value (Hermes Date.parse would NaN this raw)', () => {
    const ms = DateTool.parse.to.epochMs('2026-07-30T02:04:27.9142132');
    expect(ms).toBe(Date.parse('2026-07-30T02:04:27.914Z'));
  });

  it('returns undefined for missing / unrecognized input', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(DateTool.parse.to.epochMs(undefined)).toBeUndefined();
    expect(DateTool.parse.to.epochMs('nope')).toBeUndefined();
    warn.mockRestore();
  });
});

describe('DateTool.parse.isValid', () => {
  it('true for a parseable value, false otherwise', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(DateTool.parse.isValid('2026-07-30T02:04:27.9142132')).toBe(true);
    expect(DateTool.parse.isValid(undefined)).toBe(false);
    expect(DateTool.parse.isValid('garbage')).toBe(false);
    warn.mockRestore();
  });
});

describe('DateTool.format.to.utcIso', () => {
  it('epoch ms → ISO-UTC', () => {
    const ms = Date.parse('2026-07-30T02:04:27.914Z');
    expect(DateTool.format.to.utcIso(ms)).toBe('2026-07-30T02:04:27.914Z');
  });
});

describe('DateTool.format.to.time', () => {
  it('epoch ms → local "HH:MM:SS", zero-padded', () => {
    const d = new Date(2026, 6, 30, 4, 5, 9);
    expect(DateTool.format.to.time(d.getTime())).toBe('04:05:09');
  });
});

describe('DateTool.format.to.relative', () => {
  const NOW = 1_800_000_000_000;
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(NOW));
  afterEach(() => (Date.now as jest.Mock).mockRestore());

  it('"agora" under a minute (and for a future timestamp)', () => {
    expect(DateTool.format.to.relative(NOW - 30_000, t)).toBe('agora');
    expect(DateTool.format.to.relative(NOW + 10_000, t)).toBe('agora');
  });

  it('minutes', () => {
    expect(DateTool.format.to.relative(NOW - 5 * 60_000, t)).toBe('há 5 minuto(s)');
  });

  it('hours', () => {
    expect(DateTool.format.to.relative(NOW - 3 * 3_600_000, t)).toBe('há 3 hora(s)');
  });

  it('days', () => {
    expect(DateTool.format.to.relative(NOW - 2 * 86_400_000, t)).toBe('há 2 dia(s)');
  });
});
