import { EventBus } from '../../managers/events';
import { NotificationEvents } from './notifications.events';
import { NotificationsService } from './notifications.services';

// Marks history rows read once the content they announced is actually consumed — the answer to
// "I opened the chapter the notification was about, why is it still unread?".
//
// Listens for NotificationEvents.contentConsumed, which every content chains from its own
// `events.opened` (see EventsManager). That's what makes this work regardless of HOW the content
// was reached: the notification tap, a deep link, the in-app history list, or just browsing to
// the chapter by hand — all of them open the content, so all of them land here.
//
// Registered once at app boot (App.tsx), NOT when the notifications screen mounts — otherwise it
// would only work after the user had visited that screen. Idempotent, never unsubscribes: same
// contract as registerSeriesDigestIndexListener.
let registered = false;

export function registerNotificationHistoryListener(): void {
  if (registered) {
    return;
  }
  registered = true;
  EventBus.on(NotificationEvents.contentConsumed, ({ content }) => {
    // A known chapter marks only its own row. Without one, the content is the serie itself, and
    // only the serie's chapter-less rows are marked — never its per-chapter ones, which each
    // wait for their own chapter (that's what keeps "50 arrived, I read one" honest).
    const done =
      content.chapterId != null
        ? NotificationsService.history.markReadByChapter({
            seriesId: content.seriesId,
            chapterId: content.chapterId,
          })
        : NotificationsService.history.markSerialRead({ seriesId: content.seriesId });
    // Best-effort: nothing in the UI waits on this, and a failure just leaves the row unread.
    done.catch(() => {});
  });
}
