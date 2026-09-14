import { useCallback, useEffect, useState } from 'react';
import type { NotificationHistoryItem } from '../../shared/bridge';
import { NotificationsEventEmitter } from '../../shared/bridge';
import { useStrings } from '../../shared/i18n';
import type { Strings } from '../../shared/i18n';
import { NotificationsService } from '../../shared/services/notifications';
import type { NotificationHistoryRow } from './notifications.types';

// A single NotificationHistoryItem never carries more than one chapter (NotificationResolver's
// own explode step, Kotlin-side, already split any multi-chapter batch into one row per chapter —
// see NotificationHistoryEntity's own doc) — so this only ever picks between the two single-
// chapter cases: a known number, or none. "N new chapters" only ever applies to a GROUP of rows
// (buildGroupBodyText below), never to one row on its own.
function buildBodyText(t: Strings, item: NotificationHistoryItem): string {
  if (item.chapterNumber != null) {return t.notificationsHistoryBodyNumbered.replace('{0}', item.chapterNumber);}
  return t.notificationsHistoryBodyUnnumbered;
}

function toRow(t: Strings, item: NotificationHistoryItem): NotificationHistoryRow {
  return {
    id: item.id,
    ids: [item.id],
    seriesId: item.seriesId,
    seriesName: item.seriesName,
    // Same rule NotificationDisplay.kt's buildTapPendingIntent() applies for the system
    // notification's own deep link — a known chapter id means the tap can jump straight into it;
    // no chapter id has nowhere specific to land, so it's left undefined and the screen falls
    // back to the series instead.
    chapterId: item.chapterId,
    bodyText: buildBodyText(t, item),
    detectedAtMs: item.detectedAtMs,
    read: item.read,
  };
}

// Presentation-only (collapseSerialChaptersNotification, config/notifications) — storage always
// keeps every NotificationHistoryItem separate (see NotificationHistoryEntity's own doc); this is
// the ONLY place two rows for the same serial ever get shown as one entry, and it never runs
// unless the user opted in. Items already come sorted newest-first (NotificationHistoryDao.listAll)
// — a fresh item only ever joins the group it's newest-adjacent to, so this walks the list once
// rather than comparing every pair.
//
// Two rows for the same seriesId join the same group when they're within windowMs of the group's
// own most recent item (not a fixed "session start" anchor — a steady trickle of chapters a few
// minutes apart, each within the window of the last one, stays one growing group instead of
// splitting once total elapsed time crosses windowMs). A different serial, or the same serial too
// far apart, always starts its own new group.
function collapseNotificationRows(t: Strings, items: NotificationHistoryItem[], windowMs: number): NotificationHistoryRow[] {
  const groups: NotificationHistoryItem[][] = [];

  for (const item of items) {
    const openGroup = groups.find(group => {
      const last = group[group.length - 1];
      return last.seriesId === item.seriesId && last.detectedAtMs - item.detectedAtMs <= windowMs;
    });
    if (openGroup) {
      openGroup.push(item);
    } else {
      groups.push([item]);
    }
  }

  return groups.map(group => {
    if (group.length === 1) {return toRow(t, group[0]);}

    const newest = group[0];
    const chapterCount = group.filter(item => item.chapterId != null || item.chapterNumber != null).length || group.length;
    return {
      id: newest.id,
      ids: group.map(item => item.id),
      seriesId: newest.seriesId,
      seriesName: newest.seriesName,
      // A group always falls back to the series, regardless of how many of its items happen to
      // know their own chapter — there's no single chapter left to jump straight into anymore.
      chapterId: undefined,
      bodyText: t.notificationsHistoryBodyBatch.replace('{0}', String(chapterCount)),
      detectedAtMs: newest.detectedAtMs,
      read: group.every(item => item.read),
    };
  });
}

export interface UseNotificationHistoryResult {
  loading: boolean;
  rows: NotificationHistoryRow[];
  unreadCount: number;
  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteItem: (ids: string[]) => Promise<void>;
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
      const [items, count, collapse, windowMs] = await Promise.all([
        NotificationsService.history.list(),
        NotificationsService.history.unreadCount(),
        NotificationsService.collapseSerialChaptersNotification.get(),
        NotificationsService.collapseWindowMs.get(),
      ]);
      setRows(collapse ? collapseNotificationRows(t, items, windowMs) : items.map(item => toRow(t, item)));
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

  // A row can stand for a group of collapsed items (collapseNotificationRows) — ids always has
  // every real item the row represents, 1+. No batch method on the bridge/service side; this just
  // fires the existing single-item call once per id, in parallel.
  const markRead = useCallback(
    async (ids: string[]) => {
      await Promise.all(ids.map(id => NotificationsService.history.markRead({ id })));
      await reload();
    },
    [reload],
  );

  const markAllRead = useCallback(async () => {
    await NotificationsService.history.markAllRead();
    await reload();
  }, [reload]);

  const deleteItem = useCallback(
    async (ids: string[]) => {
      await Promise.all(ids.map(id => NotificationsService.history.delete({ id })));
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
