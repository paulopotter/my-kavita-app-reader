import { useCallback, useEffect, useState } from 'react';
import type { NotificationHistoryItem } from '../../shared/bridge';
import { NotificationsEventEmitter } from '../../shared/bridge';
import { useStrings } from '../../shared/i18n';
import type { Strings } from '../../shared/i18n';
import { NotificationsService } from '../../shared/services/notifications';
import type { NotificationHistoryRow } from './notifications.types';

// Same rule NotificationDisplay.kt's buildBody() applies (android/app/.../NotificationDisplay.kt)
// — kept in sync by hand since this is plain display text, not a contract the bridge carries:
// count > 1 → "N new chapters available"; exactly 1 chapter with a known number → "Chapter X
// available"; otherwise → "New chapter available". Never lists individual chapter numbers.
function buildBodyText(t: Strings, item: NotificationHistoryItem): string {
  const count = item.chapterIds?.length ?? item.chapterNumbers?.length ?? 0;
  if (count > 1) {return t.notificationsHistoryBodyBatch.replace('{0}', String(count));}
  const singleNumber = item.chapterNumbers?.length === 1 ? item.chapterNumbers[0] : undefined;
  if (singleNumber != null) {return t.notificationsHistoryBodyNumbered.replace('{0}', singleNumber);}
  return t.notificationsHistoryBodyUnnumbered;
}

function toRow(t: Strings, item: NotificationHistoryItem): NotificationHistoryRow {
  return {
    id: item.id,
    seriesId: item.seriesId,
    seriesName: item.seriesName,
    bodyText: buildBodyText(t, item),
    detectedAtMs: item.detectedAtMs,
    read: item.read,
  };
}

export interface UseNotificationHistoryResult {
  loading: boolean;
  rows: NotificationHistoryRow[];
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

export function useNotificationHistory(): UseNotificationHistoryResult {
  const t = useStrings();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<NotificationHistoryRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [items, count] = await Promise.all([
        NotificationsService.history.list(),
        NotificationsService.history.unreadCount(),
      ]);
      setRows(items.map(item => toRow(t, item)));
      setUnreadCount(count);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // unreadCountChanged fires whenever a history mutation changes the count (native origin — see
  // NotificationsBridgeModule's own doc) — reload picks up both the count and any new/changed rows
  // in one shot rather than tracking the count separately from the list.
  useEffect(() => {
    const sub = NotificationsEventEmitter.addListener('unreadCountChanged', () => {
      reload();
    });
    return () => sub.remove();
  }, [reload]);

  const markRead = useCallback(
    async (id: string) => {
      await NotificationsService.history.markRead({ id });
      await reload();
    },
    [reload],
  );

  const markAllRead = useCallback(async () => {
    await NotificationsService.history.markAllRead();
    await reload();
  }, [reload]);

  const deleteItem = useCallback(
    async (id: string) => {
      await NotificationsService.history.delete({ id });
      await reload();
    },
    [reload],
  );

  return { loading, rows, unreadCount, markRead, markAllRead, deleteItem, reload };
}

// The app's navigation shell (MainNavigator) uses this to badge the Notifications tab — the
// first (and so far only) badge in the app, kept specific to this one domain rather than a
// generic "badge manager" (build only what's needed today). unreadCountChanged is native-origin
// (fires on any history mutation, foreground or background) — see NotificationsBridgeModule's
// own doc.
export function useUnreadNotificationsCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    NotificationsService.history.unreadCount().then(setCount).catch(() => {});
    const sub = NotificationsEventEmitter.addListener('unreadCountChanged', (next: number) => {
      setCount(next);
    });
    return () => sub.remove();
  }, []);

  return count;
}
