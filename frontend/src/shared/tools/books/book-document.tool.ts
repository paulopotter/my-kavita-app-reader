// BookDocumentTool — wraps the HTML FRAGMENT a provider serves for one book page into a whole
// document a WebView can show, and reads back what that document reports. Pure: no I/O, no React.
//
// The fragment comes from the server, so the document is locked down rather than trusted: a CSP
// that allows no script but ours (a per-document nonce), no network but images and fonts, and a
// script that swallows link clicks so a tap on a link can never navigate the page away. Colours
// arrive as hex strings (the theme's tokens, already converted) and the font size as a multiplier
// of a base size — the document owns no design value of its own.

import type { BookFontFamily, BookMargin } from './book-prefs.tool';

export const BOOK_BASE_FONT_PX = 18;

// The document's own design values: CSS here is a string, outside the app's token system, so they
// are named once instead of being scattered through the template.
const BOOK_FONT_STACKS: Record<BookFontFamily, string> = {
  serif: "Georgia, 'Noto Serif', serif",
  sans: "'Roboto', 'Noto Sans', sans-serif",
  mono: "'Roboto Mono', 'Droid Sans Mono', monospace",
};
const BOOK_SIDE_PADDING_PX: Record<BookMargin, number> = { narrow: 14, medium: 22, wide: 36 };

export interface BookDocumentColors {
  background: string;
  text: string;
  link: string;
}

export interface BookDocumentInput {
  // The page as the provider served it.
  html: string;
  colors: BookDocumentColors;
  // Multiplier over BOOK_BASE_FONT_PX (1 = default).
  fontScale: number;
  fontFamily: BookFontFamily;
  // Unitless multiplier of the font size.
  lineSpacing: number;
  margin: BookMargin;
  justify: boolean;
  // Set for the infinite reading mode: the page becomes the first section of a document that grows,
  // chapters appended below it as the reader nears the end. Absent = one page, the paged mode.
  infinite?: { chapterId: string; page: number };
  // Where to land once laid out, as a fraction of the scrollable height (0 = top).
  restoreFraction: number;
  // Distinguishes this document's script from anything inside the fragment.
  nonce: string;
}

// What the document's script reports back through postMessage. In the infinite mode `progress` also
// says which chapter and page the reader is in, `needNext` asks for the next page to be appended and
// `passed` says a section has been scrolled entirely past.
export type BookMessage =
  | { type: 'progress'; fraction: number; chapterId?: string; page?: number }
  | { type: 'tap' }
  | { type: 'needNext' }
  | { type: 'passed'; chapterId: string; page: number };

// Where, between the sections of an infinite document, the divider sits.
const SECTION_GAP_PX = 48;
// The divider is the page's own text colour at 40% (8-digit hex, the alpha byte), so it reads on any palette.
const SECTION_DIVIDER_ALPHA = '66';
// The reader is "in" the section under this line (as a share of the viewport height from the top).
const REFERENCE_LINE = 0.3;
// The next page is requested once the end is closer than this many viewports.
const PRELOAD_VIEWPORTS = 1.5;

const SECTION_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const NONCE_PATTERN = /^[A-Za-z0-9]+$/;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function isPage(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

// The script is a template string kept free of the page's own content: only validated numbers and
// the nonce are interpolated into it.
function script({ nonce, restoreFraction }: { nonce: string; restoreFraction: number }): string {
  return `<script nonce="${nonce}">
(function () {
  var post = function (message) { window.ReactNativeWebView.postMessage(JSON.stringify(message)); };
  var maxScroll = function () { return Math.max(0, document.documentElement.scrollHeight - window.innerHeight); };
  var fraction = function () { var max = maxScroll(); return max <= 0 ? 1 : Math.min(1, Math.max(0, window.scrollY / max)); };
  var timer = null;
  var report = function () { post({ type: 'progress', fraction: fraction() }); };
  window.addEventListener('scroll', function () {
    if (timer) { return; }
    timer = setTimeout(function () { timer = null; report(); }, 200);
  }, { passive: true });
  document.addEventListener('click', function (event) {
    var node = event.target;
    while (node && node !== document) {
      if (node.tagName === 'A') { event.preventDefault(); return; }
      node = node.parentNode;
    }
    var selection = window.getSelection && window.getSelection();
    if (selection && String(selection).length > 0) { return; }
    post({ type: 'tap' });
  }, true);
  var restore = ${clamp01(restoreFraction)};
  var land = function () {
    var max = maxScroll();
    if (restore > 0 && max > 0) { window.scrollTo(0, restore * max); }
    report();
  };
  window.addEventListener('load', function () { requestAnimationFrame(function () { requestAnimationFrame(land); }); });
})();
</script>`;
}

// The infinite mode's script: same click and tap handling, but it watches SECTIONS instead of one
// page. It reports which section the reader is in and how far down it the viewport's bottom edge has
// gone, tells RN when a section has been left behind, and asks for the next page near the end. RN
// appends it through window.__appendSection (injectJavaScript is not bound by the page's CSP).
function infiniteScript({ nonce, restoreFraction }: { nonce: string; restoreFraction: number }): string {
  return `<script nonce="${nonce}">
(function () {
  var post = function (message) { window.ReactNativeWebView.postMessage(JSON.stringify(message)); };
  var book = document.getElementById('book');
  var requested = false;
  var noMore = false;
  var lastActive = 0;
  var timer = null;
  var sections = function () { return book.querySelectorAll('section[data-chapter-id]'); };
  var identity = function (el) { return { chapterId: el.getAttribute('data-chapter-id'), page: Number(el.getAttribute('data-page')) }; };
  var activeIndex = function () {
    var list = sections();
    var line = window.scrollY + window.innerHeight * ${REFERENCE_LINE};
    for (var i = 0; i < list.length; i++) {
      if (line < list[i].offsetTop + list[i].offsetHeight) { return i; }
    }
    return list.length - 1;
  };
  var progressOf = function (el) {
    var height = Math.max(1, el.offsetHeight);
    return Math.min(1, Math.max(0, (window.scrollY + window.innerHeight - el.offsetTop) / height));
  };
  var checkNext = function () {
    if (noMore || requested) { return; }
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - window.innerHeight * ${PRELOAD_VIEWPORTS}) {
      requested = true;
      post({ type: 'needNext' });
    }
  };
  var report = function () {
    var list = sections();
    if (!list.length) { return; }
    var index = activeIndex();
    for (var k = lastActive; k < index; k++) {
      var left = identity(list[k]);
      post({ type: 'passed', chapterId: left.chapterId, page: left.page });
    }
    if (index > lastActive) { lastActive = index; }
    var current = identity(list[index]);
    post({ type: 'progress', fraction: progressOf(list[index]), chapterId: current.chapterId, page: current.page });
    checkNext();
  };
  window.addEventListener('scroll', function () {
    if (timer) { return; }
    timer = setTimeout(function () { timer = null; report(); }, 200);
  }, { passive: true });
  document.addEventListener('click', function (event) {
    var node = event.target;
    while (node && node !== document) {
      if (node.tagName === 'A') { event.preventDefault(); return; }
      node = node.parentNode;
    }
    var selection = window.getSelection && window.getSelection();
    if (selection && String(selection).length > 0) { return; }
    post({ type: 'tap' });
  }, true);
  window.__appendSection = function (data) {
    var el = document.createElement('section');
    el.setAttribute('data-chapter-id', String(data.chapterId));
    el.setAttribute('data-page', String(data.page));
    el.innerHTML = data.html;
    book.appendChild(el);
    requested = false;
    checkNext();
  };
  window.__noMore = function () { noMore = true; };
  window.__needNextFailed = function () { requested = false; };
  var restore = ${clamp01(restoreFraction)};
  var land = function () {
    var first = sections()[0];
    if (restore > 0 && first) {
      window.scrollTo(0, Math.max(0, first.offsetTop + restore * first.offsetHeight - window.innerHeight));
    }
    report();
  };
  window.addEventListener('load', function () { requestAnimationFrame(function () { requestAnimationFrame(land); }); });
})();
</script>`;
}

export const BookDocumentTool = {
  build(input: BookDocumentInput): string {
    if (!NONCE_PATTERN.test(input.nonce)) {throw new Error('BookDocumentTool: nonce must be alphanumeric');}
    const fontPx = Math.round(BOOK_BASE_FONT_PX * input.fontScale * 100) / 100;
    const family = BOOK_FONT_STACKS[input.fontFamily];
    const side = BOOK_SIDE_PADDING_PX[input.margin];
    const align = input.justify ? 'justify' : 'left';
    const infinite = input.infinite;
    if (infinite && (!SECTION_ID_PATTERN.test(infinite.chapterId) || !Number.isInteger(infinite.page) || infinite.page < 0)) {
      throw new Error('BookDocumentTool: invalid first section');
    }
    const body = infinite
      ? `<main id="book"><section data-chapter-id="${infinite.chapterId}" data-page="${infinite.page}">${input.html}</section></main>`
      : input.html;
    const scriptTag = infinite
      ? infiniteScript({ nonce: input.nonce, restoreFraction: input.restoreFraction })
      : script({ nonce: input.nonce, restoreFraction: input.restoreFraction });
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data: https: http:; font-src data: https: http:; script-src 'nonce-${input.nonce}'">
<style>
html { background: ${input.colors.background}; color: ${input.colors.text}; -webkit-text-size-adjust: none; }
body { margin: 0; padding: 20px ${side}px 120px; font-size: ${fontPx}px; overflow-wrap: anywhere; }
/* The reader's choices win over whatever the book's own stylesheet says: its fonts, spacing,
   alignment and colours were not picked against this page. */
body, body * { font-family: ${family} !important; line-height: ${input.lineSpacing} !important; }
body * { color: inherit !important; background-color: transparent !important; }
p { text-align: ${align} !important; ${input.justify ? 'hyphens: auto;' : ''} }
.book-content { margin: 0 !important; }
a, a * { color: ${input.colors.link} !important; }
img { max-width: 100%; height: auto; }
section + section { margin-top: ${SECTION_GAP_PX}px; padding-top: ${SECTION_GAP_PX / 2}px; border-top: 1px solid ${input.colors.text}${SECTION_DIVIDER_ALPHA}; }
</style>
</head>
<body>
${body}
${scriptTag}
</body>
</html>`;
  },

  // The raw string a WebView hands to onMessage → a typed message, or null for anything that is not
  // one of ours (a malformed string, an unknown type, an out-of-range value).
  parseMessage(raw: string): BookMessage | null {
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
    if (typeof value !== 'object' || value === null) {return null;}
    const message = value as { type?: unknown; fraction?: unknown; chapterId?: unknown; page?: unknown };
    if (message.type === 'tap') {return { type: 'tap' };}
    if (message.type === 'needNext') {return { type: 'needNext' };}
    const hasSection = typeof message.chapterId === 'string' && message.chapterId.length > 0 && isPage(message.page);
    if (message.type === 'passed' && hasSection) {
      return { type: 'passed', chapterId: message.chapterId as string, page: message.page as number };
    }
    if (message.type === 'progress' && typeof message.fraction === 'number' && Number.isFinite(message.fraction)) {
      const fraction = clamp01(message.fraction);
      return hasSection
        ? { type: 'progress', fraction, chapterId: message.chapterId as string, page: message.page as number }
        : { type: 'progress', fraction };
    }
    return null;
  },
};
