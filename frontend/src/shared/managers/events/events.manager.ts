import { EventBus, createEvent } from './event-bus.manager';
import type { EventToken } from './event-bus.types';

// EventsManager — builds the `events` key a normalizer attaches to the content it produces
// (SerieTool.normalize, ChapterTool.normalize, and any future PageTool). Separate from
// event-bus.manager.ts on purpose: the bus is the CHANNEL (emit/on), this is the FACTORY that
// turns "this content can be opened" into something callable.
//
// Why the content carries its events at all: a normalizer already knows what its content IS, so
// it's the only place that can say what can happen to it — one content may declare `opened` and
// not `read`, another the reverse. Whoever consumes the content then just calls what's there,
// never assembling an emit by hand (which is what would scatter the mechanics across screens).
//
// The normalizer ALWAYS arms the events — it has no idea why it was called (an open, a refresh, a
// prefetch all reach the same normalize). Calling `exec()` at the right moment is the consumer's
// own responsibility, exactly like an ActionContract's `navigate` being armed but only fired on a
// real tap.

// Tokens are per (domain, event) and STABLE — never per content instance. A listener registers at
// boot (App.tsx), long before any content is normalized, so it must be able to reach the token
// without holding an instance; `content` below is what tells one instance from another, and it
// travels in the PAYLOAD, never in the token name.
//
// Scoped with '/' (e.g. 'chapter/opened'), unlike the 5 pre-existing camelCase tokens
// (readerProgressChanged, serieDigestResolved, …) — a deliberate new convention for tokens that
// are part of this content-events contract; the older ones stay as they are until a decision is
// made to migrate them too.
const tokenCache = new Map<string, EventToken<ContentEventPayload>>();

function tokenFor(domain: string, event: string): EventToken<ContentEventPayload> {
  const name = `${domain}/${event}`;
  const cached = tokenCache.get(name);
  if (cached) {
    return cached;
  }
  const token = createEvent<ContentEventPayload>(name);
  tokenCache.set(name, token);
  return token;
}

// What identifies the content an event is about — the seriesId alone for a serie, seriesId +
// chapterId for a chapter. Deliberately open-ended (a future page event adds pageIndex) since
// every listener reads only the keys it understands.
export interface ContentIdentity {
  seriesId: string;
  chapterId?: string;
}

// Every content event carries at least WHICH content it happened to. `payload` is whatever the
// normalizer chose to embed at declaration time (absent for a plain "it happened" event).
export interface ContentEventPayload {
  content: ContentIdentity;
  payload?: unknown;
}

export interface ContentEvent {
  // Fires the domain token, then runs `after` (see build's own doc).
  exec: () => void;
  // The token to subscribe to — a listener that holds a normalized content can reach it from
  // here; one registering at boot builds the same token via EventsManager.key.
  key: EventToken<ContentEventPayload>;
}

export interface ContentEventOptions {
  // Embedded at declaration time by the normalizer — the caller of exec() passes nothing.
  payload?: unknown;
  // Runs right after the domain token is emitted. This is where a normalizer chains a second
  // channel (e.g. notifications' own NotificationEvents.contentConsumed) or any side effect of
  // its own — the coupling is accepted on purpose: chaining a cache invalidation here would be
  // the same shape, so singling out one consumer would be arbitrary.
  after?: () => void;
}

export interface ContentEventsBuilder {
  // Each method returns a SELF-NAMED single-key object, so a normalizer spreads them together:
  //   events: { ...events.opened(), ...events.read() }
  // Self-naming (rather than the caller writing the key) keeps the token name and the object key
  // from ever drifting apart.
  opened: (options?: ContentEventOptions) => { opened: ContentEvent };
}

function contentEvent(
  domain: string,
  event: string,
  content: ContentIdentity,
  options?: ContentEventOptions,
): ContentEvent {
  const key = tokenFor(domain, event);
  return {
    key,
    exec: () => {
      EventBus.emit(key, { content, payload: options?.payload });
      options?.after?.();
    },
  };
}

export const EventsManager = {
  // Called by a normalizer with the content's own identity; the returned builder mints each event
  // that content declares.
  build({ domain, content }: { domain: string; content: ContentIdentity }): ContentEventsBuilder {
    return {
      opened: options => ({ opened: contentEvent(domain, 'opened', content, options) }),
    };
  },

  // For a listener with no content in hand (registering at boot) — resolves the same stable token
  // `build` would produce for that domain/event pair.
  key({ domain, event }: { domain: string; event: string }): EventToken<ContentEventPayload> {
    return tokenFor(domain, event);
  },
} as const;
