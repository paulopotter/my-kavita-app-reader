import { createEvent } from '../../shared/managers/events';

// EventBus tokens the reader emits (plano 017, Task 013 — Mechanism 3, RN→RN). Declared next to
// the emitter (reader.hooks.ts), per Task 013: an event lives with whichever module raises it.
// A listener imports `ReaderEvents.x` (autocomplete, no typo) and never writes the name string.

// Emitted by the reader's server-sync timer whenever the reader advances the reading position
// far enough to sync a new page to the server — i.e. "the user is now at page N of chapter C".
// Payload is the position, not a read/unread status (that's ChapterEvents.readStatusChanged).
//
// No listener exists yet: this is what a future "continue reading" surface (a home-screen shelf,
// a library badge) will subscribe to so it can update without polling.
export interface ReaderProgressChangedPayload {
  seriesId: string;
  chapterId: string;
  pageIndex: number;
}

export const ReaderEvents = {
  progressChanged: createEvent<ReaderProgressChangedPayload>('readerProgressChanged'),
} as const;
