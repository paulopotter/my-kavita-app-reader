import { makeNonce, pageIndicatorText, reachedEnd, resolveStartPage, shouldMarkRead } from './book-reader.model';

describe('reachedEnd', () => {
  it('needs the last page and the end of it', () => {
    expect(reachedEnd({ fraction: 1, pageIndex: 0, pageCount: 1 })).toBe(true);
    expect(reachedEnd({ fraction: 0.97, pageIndex: 2, pageCount: 3 })).toBe(true);
    expect(reachedEnd({ fraction: 0.96, pageIndex: 2, pageCount: 3 })).toBe(false);
    expect(reachedEnd({ fraction: 1, pageIndex: 1, pageCount: 3 })).toBe(false);
  });

  it('is never true for an empty book', () => {
    expect(reachedEnd({ fraction: 1, pageIndex: 0, pageCount: 0 })).toBe(false);
  });
});

describe('shouldMarkRead', () => {
  it('marks once, only when the end was reached and the chapter was not already read', () => {
    expect(shouldMarkRead({ ended: true, alreadyMarked: false, wasRead: false })).toBe(true);
    expect(shouldMarkRead({ ended: false, alreadyMarked: false, wasRead: false })).toBe(false);
    expect(shouldMarkRead({ ended: true, alreadyMarked: true, wasRead: false })).toBe(false);
    expect(shouldMarkRead({ ended: true, alreadyMarked: false, wasRead: true })).toBe(false);
  });
});

describe('resolveStartPage', () => {
  it('keeps a saved page that exists and falls back to the first otherwise', () => {
    expect(resolveStartPage({ savedPage: 2, pageCount: 5 })).toBe(2);
    expect(resolveStartPage({ savedPage: 5, pageCount: 5 })).toBe(0);
    expect(resolveStartPage({ savedPage: -1, pageCount: 5 })).toBe(0);
    expect(resolveStartPage({ savedPage: 1.5, pageCount: 5 })).toBe(0);
    expect(resolveStartPage({ savedPage: undefined, pageCount: 5 })).toBe(0);
  });
});

describe('pageIndicatorText', () => {
  it('fills the template with 1-based page and total', () => {
    expect(pageIndicatorText({ pageIndex: 0, pageCount: 4, template: 'Página {0} de {1}' })).toBe('Página 1 de 4');
  });

  it('is undefined for a single-page book', () => {
    expect(pageIndicatorText({ pageIndex: 0, pageCount: 1, template: 'Página {0} de {1}' })).toBeUndefined();
    expect(pageIndicatorText({ pageIndex: 0, pageCount: 0, template: 'x' })).toBeUndefined();
  });
});

describe('makeNonce', () => {
  it('is alphanumeric and changes between calls', () => {
    const a = makeNonce(() => 0.123456);
    const b = makeNonce(() => 0.654321);
    expect(a).toMatch(/^[A-Za-z0-9]+$/);
    expect(b).toMatch(/^[A-Za-z0-9]+$/);
    expect(a).not.toBe(b);
  });
});
