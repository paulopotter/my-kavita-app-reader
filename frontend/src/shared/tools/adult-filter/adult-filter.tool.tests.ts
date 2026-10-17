import { AdultFilterTool, EMPTY_CLASSIFICATION, isAdultFilterMode, type AdultFilterMode } from './adult-filter.tool';

const items = ['a', 'adult', 'b', 'new'].map(id => ({ id }));
const classification = {
  adultIds: new Set(['adult']),
  knownIds: new Set(['a', 'adult', 'b']),
};

function run(mode: AdultFilterMode, over: { unblur?: boolean; active?: boolean; only?: boolean } = {}) {
  return AdultFilterTool.apply({
    items,
    idOf: i => i.id,
    mode,
    unblur: over.unblur ?? false,
    only: over.only ?? false,
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

  it('only inverts the view: just the classified items, unclassified ones left out', () => {
    expect(ids(run('hidden', { only: true }))).toEqual(['adult']);
    expect(ids(run('blur', { only: true }))).toEqual(['adult']);
  });

  it('only shows them plain, unless the blur mode is chosen — then the blur follows unblur', () => {
    expect(blurred(run('hidden', { only: true }))).toEqual([]);
    expect(blurred(run('blur', { only: true }))).toEqual(['adult']);
    expect(blurred(run('blur', { only: true, unblur: true }))).toEqual([]);
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
      only: false,
      active: true,
      classification: EMPTY_CLASSIFICATION,
    });
    expect(r.items).toEqual([]);
    expect(r.pending).toBe(4);
  });
});

describe('isAdultFilterMode', () => {
  it('accepts the two modes and nothing else, including the retired adultOnly and normal', () => {
    (['hidden', 'blur'] as const).forEach(m => expect(isAdultFilterMode(m)).toBe(true));
    expect(isAdultFilterMode('adultOnly')).toBe(false);
    expect(isAdultFilterMode('normal')).toBe(false);
    expect(isAdultFilterMode('x')).toBe(false);
    expect(isAdultFilterMode(undefined)).toBe(false);
  });
});
