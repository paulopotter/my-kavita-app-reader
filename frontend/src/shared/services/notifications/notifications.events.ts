import { createEvent } from '../../managers/events';
import type { ContentIdentity } from '../../managers/events';

// EventBus tokens the "notifications" domain owns (plano 017, Task 013 — Mechanism 3, RN→RN).
// Declared next to the service that consumes them, same as servers.events.ts.

// Announced whenever a piece of content the user could have been notified about was actually
// CONSUMED — a chapter opened in the reader, a serie opened from anywhere. Chained by each
// content's own `events.opened` (EventsManager's `after`), so a screen never emits this itself
// and never needs to know notifications exist.
//
// The listener (registerNotificationHistoryListener, registered at boot) decides what it means
// for the history: a payload carrying chapterId marks that chapter's own row read; one carrying
// only seriesId marks the serie's chapter-less rows read (a "new serie" notification, or one
// whose publisher event identified no chapter). A batch of N chapters needs nothing special —
// its rows are already granular, so each resolves on its own as each chapter is read, which is
// what keeps "50 arrived, I read one" from marking the other 49.
//
// Deliberately NOT restricted to notification-shaped content: the same fact ("this was consumed")
// is what a future notification type (e.g. "update your version") would hang off too.
export interface NotificationContentConsumedPayload {
  content: ContentIdentity;
}

export const NotificationEvents = {
  contentConsumed: createEvent<NotificationContentConsumedPayload>('notification/contentConsumed'),
} as const;
