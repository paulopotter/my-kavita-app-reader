// BookDocumentTool — wraps the HTML FRAGMENT a provider serves for one book page into a whole
// document a WebView can show, and reads back what that document reports. Pure: no I/O, no React.
//
// The fragment comes from the server, so the document is locked down rather than trusted: a CSP
// that allows no script but ours (a per-document nonce), no network but images and fonts, and a
// script that swallows link clicks so a tap on a link can never navigate the page away. Colours
// arrive as hex strings (the theme's tokens, already converted) and the font size as a multiplier
// of a base size — the document owns no design value of its own.

export const BOOK_BASE_FONT_PX = 18;

export interface BookDocumentInput {
  // The page as the provider served it.
  html: string;
  background: string;
  text: string;
  link: string;
  // Multiplier over BOOK_BASE_FONT_PX (1 = default).
  fontScale: number;
  // Where to land once laid out, as a fraction of the scrollable height (0 = top).
  restoreFraction: number;
  // Distinguishes this document's script from anything inside the fragment.
  nonce: string;
}

// What the document's script reports back through postMessage.
export type BookMessage =
  | { type: 'progress'; fraction: number }
  | { type: 'tap' };

const NONCE_PATTERN = /^[A-Za-z0-9]+$/;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
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

export const BookDocumentTool = {
  build(input: BookDocumentInput): string {
    if (!NONCE_PATTERN.test(input.nonce)) {throw new Error('BookDocumentTool: nonce must be alphanumeric');}
    const fontPx = Math.round(BOOK_BASE_FONT_PX * input.fontScale * 100) / 100;
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data: https: http:; font-src data: https: http:; script-src 'nonce-${input.nonce}'">
<style>
html { background: ${input.background}; color: ${input.text}; -webkit-text-size-adjust: none; }
body { margin: 0; padding: 20px 18px 120px; font-size: ${fontPx}px; line-height: 1.6; overflow-wrap: anywhere; }
a { color: ${input.link}; }
img { max-width: 100%; height: auto; }
</style>
</head>
<body>
${input.html}
${script({ nonce: input.nonce, restoreFraction: input.restoreFraction })}
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
    const message = value as { type?: unknown; fraction?: unknown };
    if (message.type === 'tap') {return { type: 'tap' };}
    if (message.type === 'progress' && typeof message.fraction === 'number' && Number.isFinite(message.fraction)) {
      return { type: 'progress', fraction: clamp01(message.fraction) };
    }
    return null;
  },
};
