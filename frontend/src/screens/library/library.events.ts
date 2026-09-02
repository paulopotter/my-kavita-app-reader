import { createEvent } from '../../shared/managers/events';
import type { LibraryEntry } from './library.tool';

// EventBus token the Library screen emits after it assembles the full (unsorted, unfiltered) list.
// Library and Following are two independent LibraryScreen instances — separate useLibrary state,
// separate in-memory data. Without this, switching Library <-> Following makes the arriving screen
// re-assemble from scratch and flash its loading spinner, even though the data is identical.
//
// The NO-LOOP contract (this broke once in rc57 and was ripped out; it comes back only with these
// rules enforced):
//  1. Emitted from EXACTLY ONE place — load()'s .then(), right after the local dispatch(LOADED).
//  2. The listener does dispatch(HYDRATE) and NOTHING else: it never re-emits, never calls load().
//  3. The emitter tags the payload with its own instanceId; a listener ignores its own emit.
// (2) alone already makes a cycle impossible — a HYDRATE never produces an emit — so a second
// screen hydrated by the event can never bounce it back. (3) just avoids a wasted self-render.
//
// A module-level `lastAssembled` cache (in library.hooks.ts) covers the other half: a screen that
// mounts AFTER the emit already fired reads it synchronously on mount, so it also skips the
// spinner without waiting for the next assemble.
export interface LibraryAssembledPayload {
  instanceId: string;
  entries: LibraryEntry[];
  lastUpdatedEpochMs: number | null;
  assembledAtEpochMs: number;
}

export const LibraryEvents = {
  assembled: createEvent<LibraryAssembledPayload>('libraryAssembled'),
} as const;
