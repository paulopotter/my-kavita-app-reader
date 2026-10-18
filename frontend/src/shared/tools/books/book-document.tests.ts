import { BOOK_BASE_FONT_PX, BookDocumentTool } from './book-document.tool';
import type { BookDocumentInput } from './book-document.tool';

// Node's own module: the project has no node typings, and this is the only place a test needs it.
const { Script } = require('vm') as { Script: new (code: string) => unknown };

const input: BookDocumentInput = {
  html: '<div class=" "><h1>Capítulo 1</h1><p>Olá</p></div>',
  background: '#101010',
  text: '#eeeeee',
  link: '#88aaff',
  fontScale: 1,
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
    expect(doc).toContain('background: #101010');
    expect(doc).toContain('color: #eeeeee');
    expect(doc).toContain('a { color: #88aaff; }');
    expect(doc).toContain(`font-size: ${BOOK_BASE_FONT_PX}px`);
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
