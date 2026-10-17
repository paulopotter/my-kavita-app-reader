import { AdultFilterTool, EMPTY_CLASSIFICATION, isAdultFilterMode, type AdultFilterMode } from './adult-filter.tool';

const items = ['a', 'adult', 'b', 'new'].map(id => ({ id }));
const classification = {
  adultIds: new Set(['adult']),
  knownIds: new Set(['a', 'adult', 'b']),
};

function run(mode: AdultFilterMode, over: { unblur?: boolean; active?: boolean } = {}) {
  return AdultFilterTool.apply({
    items,
    idOf: i => i.id,
    mode,
    unblur: over.unblur ?? false,
    active: over.active ?? true,
    classification,
  });
}

const ids = (r: ReturnType<typeof run>) => r.items.map(i => i.id);
const blurred = (r: ReturnType<typeof run>) => r.items.filter(i => i.blurred).map(i => i.id);

describe('AdultFilterTool.apply', () => {
  it('hidden removes adult and still-unclassified items', () => {
    const r = run('hidden');
    expect(ids(r)).toEqual(['a', 'b']);
    expect(blurred(r)).toEqual([]);
  });

  it('blur keeps everything and blurs the adult and unclassified ones', () => {
    const r = run('blur');
    expect(ids(r)).toEqual(['a', 'adult', 'b', 'new']);
    expect(blurred(r)).toEqual(['adult', 'new']);
  });

  it('blur with unblur shows them plain', () => {
    expect(blurred(run('blur', { unblur: true }))).toEqual([]);
  });

  it('normal shows everything untouched', () => {
    const r = run('normal');
    expect(ids(r)).toEqual(['a', 'adult', 'b', 'new']);
    expect(blurred(r)).toEqual([]);
  });

  it('adultOnly inverts: only classified-adult items, blurred unless unblur', () => {
    expect(ids(run('adultOnly'))).toEqual(['adult']);
    expect(blurred(run('adultOnly'))).toEqual(['adult']);
    expect(blurred(run('adultOnly', { unblur: true }))).toEqual([]);
  });

  it('counts the unclassified items so the caller can ask for a classification', () => {
    expect(run('hidden').pending).toBe(1);
  });

  it('is a no-op while no category is selected (gated by missing config)', () => {
    const r = run('hidden', { active: false });
    expect(ids(r)).toEqual(['a', 'adult', 'b', 'new']);
    expect(r.pending).toBe(0);
  });

  it('treats everything as unclassified against an empty classification', () => {
    const r = AdultFilterTool.apply({
      items,
      idOf: i => i.id,
      mode: 'hidden',
      unblur: false,
      active: true,
      classification: EMPTY_CLASSIFICATION,
    });
    expect(r.items).toEqual([]);
    expect(r.pending).toBe(4);
  });
});

describe('isAdultFilterMode', () => {
  it('accepts the four modes and nothing else', () => {
    (['hidden', 'blur', 'normal', 'adultOnly'] as const).forEach(m => expect(isAdultFilterMode(m)).toBe(true));
    expect(isAdultFilterMode('x')).toBe(false);
    expect(isAdultFilterMode(undefined)).toBe(false);
  });
});
