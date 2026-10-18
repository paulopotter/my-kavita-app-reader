import { BOOK_BASE_FONT_PX, BOOK_SECTION_GEOMETRY, BookDocumentTool } from './book-document.tool';
import type { BookDocumentInput } from './book-document.tool';

// Node's own module: the project has no node typings, and this is the only place a test needs it.
const { Script, runInNewContext } = require('vm') as {
  Script: new (code: string) => unknown;
  runInNewContext: (code: string) => unknown;
};

const input: BookDocumentInput = {
  html: '<div class=" "><h1>Capítulo 1</h1><p>Olá</p></div>',
  colors: { background: '#101010', text: '#eeeeee', link: '#88aaff' },
  fontScale: 1,
  fontFamily: 'serif',
  lineSpacing: 1.6,
  margin: 'medium',
  justify: false,
  restoreFraction: 0,
  nonce: 'abc123',
};

function scriptOf(doc: string): string {
  const match = doc.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
  return match ? match[1] : '';
}

describe('BookDocumentTool.build', () => {
  it('carries the page, the theme colours and the base font size', () => {
    const doc = BookDocumentTool.build(input);

    expect(doc).toContain('<h1>Capítulo 1</h1>');
    expect(doc).toContain('html { background: #101010;');
    expect(doc).toContain('color: #eeeeee');
    expect(doc).toContain('a, a * { color: #88aaff !important; }');
    expect(doc).toContain(`font-size: ${BOOK_BASE_FONT_PX}px`);
  });

  it('applies the font family and the line height over the book\'s own stylesheet', () => {
    expect(BookDocumentTool.build(input)).toContain("body, body * { font-family: Georgia, 'Noto Serif', serif !important; line-height: 1.6 !important; }");
    expect(BookDocumentTool.build({ ...input, fontFamily: 'sans', lineSpacing: 2 })).toContain(
      "font-family: 'Roboto', 'Noto Sans', sans-serif !important; line-height: 2 !important;",
    );
    expect(BookDocumentTool.build({ ...input, fontFamily: 'mono' })).toContain("'Roboto Mono'");
  });

  it('forces the page colours onto the book\'s own text and backgrounds', () => {
    const doc = BookDocumentTool.build(input);
    expect(doc).toContain('body * { color: inherit !important; background-color: transparent !important; }');
  });

  it('sets the side padding from the margin and drops the book\'s own margin', () => {
    expect(BookDocumentTool.build({ ...input, margin: 'narrow' })).toContain('padding: 20px 14px 120px');
    expect(BookDocumentTool.build({ ...input, margin: 'medium' })).toContain('padding: 20px 22px 120px');
    expect(BookDocumentTool.build({ ...input, margin: 'wide' })).toContain('padding: 20px 36px 120px');
    expect(BookDocumentTool.build(input)).toContain('.book-content { margin: 0 !important; }');
  });

  it('left-aligns by default and justifies, with hyphenation, only when asked', () => {
    expect(BookDocumentTool.build(input)).toContain('p { text-align: left !important;');
    expect(BookDocumentTool.build(input)).not.toContain('hyphens: auto');
    const justified = BookDocumentTool.build({ ...input, justify: true });
    expect(justified).toContain('p { text-align: justify !important;');
    expect(justified).toContain('hyphens: auto');
  });

  it('scales the font size by the multiplier', () => {
    expect(BookDocumentTool.build({ ...input, fontScale: 1.5 })).toContain('font-size: 27px');
    expect(BookDocumentTool.build({ ...input, fontScale: 0.85 })).toContain('font-size: 15.3px');
  });

  it('allows no script but its own: the CSP names the nonce and the script carries it', () => {
    const doc = BookDocumentTool.build(input);

    expect(doc).toContain("script-src 'nonce-abc123'");
    expect(doc).toContain("default-src 'none'");
    expect(doc).toContain('<script nonce="abc123">');
  });

  it('puts the page before the script, never inside it', () => {
    const doc = BookDocumentTool.build({ ...input, html: '<p>x</p></script><script>alert(1)</script>' });

    // The hostile fragment is plain document content; the only script with our nonce is the last one.
    expect(doc.indexOf('<p>x</p>')).toBeLessThan(doc.lastIndexOf('<script nonce="abc123">'));
  });

  it('refuses a nonce that is not alphanumeric', () => {
    expect(() => BookDocumentTool.build({ ...input, nonce: 'a"b' })).toThrow('nonce');
    expect(() => BookDocumentTool.build({ ...input, nonce: '' })).toThrow('nonce');
  });

  it('restores the position as a clamped fraction', () => {
    expect(scriptOf(BookDocumentTool.build({ ...input, restoreFraction: 0.42 }))).toContain('var restore = 0.42;');
    expect(scriptOf(BookDocumentTool.build({ ...input, restoreFraction: 7 }))).toContain('var restore = 1;');
    expect(scriptOf(BookDocumentTool.build({ ...input, restoreFraction: -3 }))).toContain('var restore = 0;');
  });

  it('generates a script that is valid JavaScript', () => {
    const body = scriptOf(BookDocumentTool.build({ ...input, restoreFraction: 0.5 }));

    expect(body.length).toBeGreaterThan(0);
    // Compiles without running it (it needs a browser) — a syntax slip in the template shows up here.
    expect(() => new Script(body)).not.toThrow();
  });
});

describe('BookDocumentTool.parseMessage', () => {
  it('reads a tap', () => {
    expect(BookDocumentTool.parseMessage('{"type":"tap"}')).toEqual({ type: 'tap' });
  });

  it('reads progress and clamps it into 0..1', () => {
    expect(BookDocumentTool.parseMessage('{"type":"progress","fraction":0.4}')).toEqual({ type: 'progress', fraction: 0.4 });
    expect(BookDocumentTool.parseMessage('{"type":"progress","fraction":3}')).toEqual({ type: 'progress', fraction: 1 });
    expect(BookDocumentTool.parseMessage('{"type":"progress","fraction":-1}')).toEqual({ type: 'progress', fraction: 0 });
  });

  it('answers null for anything that is not one of ours', () => {
    expect(BookDocumentTool.parseMessage('not json')).toBeNull();
    expect(BookDocumentTool.parseMessage('null')).toBeNull();
    expect(BookDocumentTool.parseMessage('"tap"')).toBeNull();
    expect(BookDocumentTool.parseMessage('{"type":"other"}')).toBeNull();
    expect(BookDocumentTool.parseMessage('{"type":"progress"}')).toBeNull();
    expect(BookDocumentTool.parseMessage('{"type":"progress","fraction":"0.4"}')).toBeNull();
    expect(BookDocumentTool.parseMessage('{"type":"progress","fraction":null}')).toBeNull();
  });
});

describe('BookDocumentTool.build — infinite mode', () => {
  const infiniteInput: BookDocumentInput = { ...input, infinite: { chapterId: '70814', page: 0 } };

  it('wraps the page in the first section of a growing book', () => {
    const doc = BookDocumentTool.build(infiniteInput);

    expect(doc).toContain('<main id="book"><section data-chapter-id="70814" data-page="0">');
    expect(doc).toContain('<p>Olá</p></div></section></main>');
  });

  it('does not wrap a paged document', () => {
    const doc = BookDocumentTool.build(input);
    expect(doc).not.toContain('<main id="book">');
    expect(scriptOf(doc)).not.toContain('needNext');
  });

  it('separates the sections with a divider drawn in the page\'s own text colour', () => {
    const doc = BookDocumentTool.build(infiniteInput);
    expect(doc).toContain('section + section {');
    expect(doc).toContain('border-top: 1px solid #eeeeee66;');
  });

  it('gives the page a script that can append, stop and recover, and that asks for the next page', () => {
    const body = scriptOf(BookDocumentTool.build(infiniteInput));

    expect(body).toContain('window.__appendSection');
    expect(body).toContain('window.__noMore');
    expect(body).toContain('window.__needNextFailed');
    expect(body).toContain("post({ type: 'needNext' })");
    expect(body).toContain("post({ type: 'passed'");
    expect(body).toContain('chapterId: current.chapterId');
  });

  it('generates a script that is valid JavaScript', () => {
    expect(() => new Script(scriptOf(BookDocumentTool.build({ ...infiniteInput, restoreFraction: 0.5 })))).not.toThrow();
  });

  it('restores inside the first section, as a clamped fraction', () => {
    expect(scriptOf(BookDocumentTool.build({ ...infiniteInput, restoreFraction: 0.42 }))).toContain('var restore = 0.42;');
    expect(scriptOf(BookDocumentTool.build({ ...infiniteInput, restoreFraction: 9 }))).toContain('var restore = 1;');
  });

  it('keeps the same lockdown: a nonce-only CSP and no script from the page', () => {
    const doc = BookDocumentTool.build(infiniteInput);
    expect(doc).toContain("script-src 'nonce-abc123'");
    expect(doc).toContain("default-src 'none'");
  });

  it('refuses a first section that could break out of the attribute', () => {
    expect(() => BookDocumentTool.build({ ...input, infinite: { chapterId: '1"><script>', page: 0 } })).toThrow('first section');
    expect(() => BookDocumentTool.build({ ...input, infinite: { chapterId: '', page: 0 } })).toThrow('first section');
    expect(() => BookDocumentTool.build({ ...input, infinite: { chapterId: '1', page: -1 } })).toThrow('first section');
    expect(() => BookDocumentTool.build({ ...input, infinite: { chapterId: '1', page: 1.5 } })).toThrow('first section');
  });
});

describe('BookDocumentTool.parseMessage — infinite mode', () => {
  it('reads a request for the next page', () => {
    expect(BookDocumentTool.parseMessage('{"type":"needNext"}')).toEqual({ type: 'needNext' });
  });

  it('reads which chapter and page a progress report belongs to', () => {
    expect(BookDocumentTool.parseMessage('{"type":"progress","fraction":0.5,"chapterId":"70814","page":2}')).toEqual({
      type: 'progress',
      fraction: 0.5,
      chapterId: '70814',
      page: 2,
    });
  });

  it('keeps a progress report without a section as it was', () => {
    expect(BookDocumentTool.parseMessage('{"type":"progress","fraction":0.5}')).toEqual({ type: 'progress', fraction: 0.5 });
    expect(BookDocumentTool.parseMessage('{"type":"progress","fraction":0.5,"chapterId":"","page":0}')).toEqual({
      type: 'progress',
      fraction: 0.5,
    });
    expect(BookDocumentTool.parseMessage('{"type":"progress","fraction":0.5,"chapterId":"1","page":-1}')).toEqual({
      type: 'progress',
      fraction: 0.5,
    });
  });

  it('reads a section that was passed, and refuses one without an identity', () => {
    expect(BookDocumentTool.parseMessage('{"type":"passed","chapterId":"7","page":0}')).toEqual({ type: 'passed', chapterId: '7', page: 0 });
    expect(BookDocumentTool.parseMessage('{"type":"passed"}')).toBeNull();
    expect(BookDocumentTool.parseMessage('{"type":"passed","chapterId":7,"page":0}')).toBeNull();
    expect(BookDocumentTool.parseMessage('{"type":"passed","chapterId":"7","page":"0"}')).toBeNull();
  });
});


// The very code the page runs, evaluated here.
describe('BOOK_SECTION_GEOMETRY', () => {
  const geometry = runInNewContext(`(function () { ${BOOK_SECTION_GEOMETRY}; return { progress: sectionProgress, scrollFor: sectionScrollFor }; })()`) as {
    progress: (scrollY: number, top: number, height: number, viewport: number) => number;
    scrollFor: (fraction: number, top: number, height: number, viewport: number) => number;
  };

  it('starts at zero when the section is at the top of the screen', () => {
    expect(geometry.progress(20, 20, 3000, 800)).toBe(0);
  });

  it('stays at zero while the section is still below the top of the screen', () => {
    expect(geometry.progress(0, 400, 3000, 800)).toBe(0);
  });

  it('is half way through the distance the section can travel', () => {
    // travel = 3000 - 800 = 2200; scrolled 1100 past its top
    expect(geometry.progress(1120, 20, 3000, 800)).toBeCloseTo(0.5);
  });

  it('reaches one when the end of the section reaches the bottom of the screen', () => {
    expect(geometry.progress(2220, 20, 3000, 800)).toBe(1);
    expect(geometry.progress(5000, 20, 3000, 800)).toBe(1);
  });

  it('counts a section that fits on one screen as read once it is fully shown', () => {
    expect(geometry.progress(0, 20, 500, 800)).toBe(1);
    expect(geometry.progress(0, 600, 500, 800)).toBe(0);
  });

  it('scrolls back to where a fraction was reported', () => {
    const scroll = geometry.scrollFor(0.5, 20, 3000, 800);
    expect(geometry.progress(scroll, 20, 3000, 800)).toBeCloseTo(0.5);
  });

  it('never scrolls above the top of the document', () => {
    expect(geometry.scrollFor(0, 0, 3000, 800)).toBe(0);
    expect(geometry.scrollFor(0.7, 20, 300, 800)).toBe(20);
  });
});
