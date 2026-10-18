export type BookReaderStatus = 'loading' | 'ready' | 'error';

// Fraction of a book page that counts as "read to the end" — the last stretch is rarely scrolled
// into view exactly (a short last line, the bottom padding), so exactly 1 would never fire.
export const BOOK_END_FRACTION = 0.97;
