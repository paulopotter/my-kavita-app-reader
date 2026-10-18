// Pure decisions the book reader's hook makes — no I/O, no React, directly testable.

import { BOOK_END_FRACTION } from './book-reader.types';

// A chapter is finished once its LAST page has been read to the end.
export function reachedEnd({
  fraction,
  pageIndex,
  pageCount,
}: {
  fraction: number;
  pageIndex: number;
  pageCount: number;
}): boolean {
  return pageCount > 0 && pageIndex >= pageCount - 1 && fraction >= BOOK_END_FRACTION;
}

// Whether reading to the end should mark the chapter read: only the first time in this session,
// and never when it was already read (re-reading a finished chapter changes nothing).
export function shouldMarkRead({
  ended,
  alreadyMarked,
  wasRead,
}: {
  ended: boolean;
  alreadyMarked: boolean;
  wasRead: boolean;
}): boolean {
  return ended && !alreadyMarked && !wasRead;
}

// The page to open: the saved one when it still exists in the book, else the first.
export function resolveStartPage({ savedPage, pageCount }: { savedPage: number | undefined; pageCount: number }): number {
  if (savedPage == null || !Number.isInteger(savedPage) || savedPage < 0 || savedPage >= pageCount) {return 0;}
  return savedPage;
}

// A page indicator only means something when the book has more than one page.
export function pageIndicatorText({
  pageIndex,
  pageCount,
  template,
}: {
  pageIndex: number;
  pageCount: number;
  template: string;
}): string | undefined {
  if (pageCount <= 1) {return undefined;}
  return template.replace('{0}', String(pageIndex + 1)).replace('{1}', String(pageCount));
}

// A nonce for one document: alphanumeric, different every call. Its only job is to tell the
// document's own script from anything inside the fragment, so it needs to be unguessable by the
// page, not cryptographically strong.
export function makeNonce(random: () => number = Math.random): string {
  return `n${Math.floor(random() * 0xffffffff).toString(36)}${Date.now().toString(36)}`;
}
