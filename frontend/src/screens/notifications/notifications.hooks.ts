import { useCallback, useEffect, useRef, useState } from 'react';
import type { NotificationHistoryItem } from '../../shared/bridge';
import { NotificationsEventEmitter } from '../../shared/bridge';
import { useStrings } from '../../shared/i18n';
import type { Strings } from '../../shared/i18n';
import { NotificationsService } from '../../shared/services/notifications';
import { SerialService } from '../../shared/services/serials';
import type { NotificationHistoryRow } from './notifications.types';

// Mirrors the Library's own viewport enrichment (screens/library/hooks/library.hooks.ts) — same
// constants, same rationale: fetching every row's cover up front doesn't scale, and there's no
// per-row cover in the history payload itself (NotificationHistoryItem carries no cover — see
// notifications.types.ts's own doc on coverUrl).
const ENRICH_LOOKAHEAD = 10;
const ENRICH_CONCURRENCY = 4;

async function mapWithLimit<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx]).catch(() => undefined);
    }
  });
  await Promise.all(runners);
}

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
    chapterNumbers: item.chapterNumber != null ? [item.chapterNumber] : [],
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
    // Oldest-first for the detail popup's own chapter list — group itself is newest-first
    // (NotificationHistoryDao.listAll's order), so this reverses it.
    const chapterNumbers = group
      .filter((item): item is NotificationHistoryItem & { chapterNumber: string } => item.chapterNumber != null)
      .map(item => item.chapterNumber)
      .reverse();
    const chapterCount = group.filter(item => item.chapterId != null || item.chapterNumber != null).length || group.length;
    return {
      id: newest.id,
      ids: group.map(item => item.id),
      seriesId: newest.seriesId,
      seriesName: newest.seriesName,
      // A group always falls back to the series, regardless of how many of its items happen to
      // know their own chapter — there's no single chapter left to jump straight into anymore.
      chapterId: undefined,
      chapterNumbers,
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
  totalCount: number;
  markRead: (ids: string[]) => Promise<void>;
  markUnread: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteItem: (ids: string[]) => Promise<void>;
  reload: () => Promise<void>;
  // ── selection mode (long-press a row, tap to toggle others — mirrors the Serie screen's own) ──
  selectionMode: boolean;
  selectedIds: Set<string>;
  onRowLongPress: (rowId: string) => void;
  onRowPress: (rowId: string) => void;
  selectAll: () => void;
  exitSelectionMode: () => void;
  // Batch actions over the current selection — resolve the selected rows' own `ids` (a row can
  // stand for a group of collapsed items) before delegating to the single-item bridge call, once
  // per id, in parallel. No dedicated batch endpoint exists on the bridge/service side.
  markSelectedRead: () => Promise<void>;
  markSelectedUnread: () => Promise<void>;
  deleteSelected: () => Promise<void>;
  // Called by the FlatList's onViewableItemsChanged — lazily fills in coverUrl for rows near the
  // viewport (see enrichCover's own doc).
  onViewableIndices: (firstVisible: number, lastVisible: number) => void;
}

export function useNotificationHistory(): UseNotificationHistoryResult {
  const t = useStrings();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<NotificationHistoryRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Covers already fetched, keyed by seriesId (never by row id — a row's id can change across
  // reloads when the collapsing window shifts which items group together, but its series can't).
  // Survives every reload, so marking/deleting a notification (or anything else that re-triggers
  // reload — e.g. the unreadCountChanged listener below) never throws away covers the viewport
  // already paid to fetch — see enrichCover's own doc for why re-fetching them was the "images
  // reload every time the screen refreshes" bug.
  const coversRef = useRef<Map<string, string>>(new Map());
  // "Already enriched (or has no series to enrich)" row ids for THIS row set. Reset whenever the
  // covers-by-series map doesn't already cover a row, so a reload never re-queues rows it already
  // has a cover for, but still enriches a genuinely new row.
  const enrichedRef = useRef<Set<string>>(new Set());

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [items, count, collapse, windowMs] = await Promise.all([
        NotificationsService.history.list(),
        NotificationsService.history.unreadCount(),
        NotificationsService.collapseSerialChaptersNotification.get(),
        NotificationsService.collapseWindowMs.get(),
      ]);
      const fresh = collapse ? collapseNotificationRows(t, items, windowMs) : items.map(item => toRow(t, item));
      enrichedRef.current = new Set();
      setRows(fresh.map(row => {
        const coverUrl = coversRef.current.get(row.seriesId);
        return coverUrl != null ? { ...row, coverUrl } : row;
      }));
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

  const markUnread = useCallback(
    async (ids: string[]) => {
      await Promise.all(ids.map(id => NotificationsService.history.markUnread({ id })));
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

  // ── selection mode ───────────────────────────────────────────────────────────
  const onRowLongPress = useCallback((rowId: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([rowId]));
  }, []);

  const onRowPress = useCallback(
    (rowId: string) => {
      setSelectedIds(current => {
        if (!selectionMode) {return current;}
        const next = new Set(current);
        if (next.has(rowId)) {next.delete(rowId);}
        else {next.add(rowId);}
        if (next.size === 0) {setSelectionMode(false);}
        return next;
      });
    },
    [selectionMode],
  );

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(rows.map(r => r.id)));
  }, [rows]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Every real item id (row.ids, not row.id) behind the current row selection — a selected group
  // row must act on all the items it collapses, not just its own representative id.
  const selectedItemIds = useCallback(
    () => rows.filter(r => selectedIds.has(r.id)).flatMap(r => r.ids),
    [rows, selectedIds],
  );

  const markSelectedRead = useCallback(async () => {
    const ids = selectedItemIds();
    exitSelectionMode();
    if (ids.length > 0) {await markRead(ids);}
  }, [selectedItemIds, exitSelectionMode, markRead]);

  const markSelectedUnread = useCallback(async () => {
    const ids = selectedItemIds();
    exitSelectionMode();
    if (ids.length > 0) {await markUnread(ids);}
  }, [selectedItemIds, exitSelectionMode, markUnread]);

  const deleteSelected = useCallback(async () => {
    const ids = selectedItemIds();
    exitSelectionMode();
    if (ids.length > 0) {await deleteItem(ids);}
  }, [selectedItemIds, exitSelectionMode, deleteItem]);

  // ── lazy per-viewport cover enrichment ──────────────────────────────────────
  const enrichInFlightRef = useRef(false);
  const pendingEnrichRef = useRef<NotificationHistoryRow[]>([]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const enrichCover = useCallback(async (row: NotificationHistoryRow) => {
    const digest = await SerialService.get({ seriesId: row.seriesId }).catch(() => null);
    if (digest?.isSuccess) {
      coversRef.current.set(row.seriesId, digest.coverImage.url);
      // Every row for this series, not just the one that triggered the fetch — a reload can
      // split/merge collapsed groups, so more than one visible row may share a seriesId.
      setRows(current => current.map(r => (r.seriesId === row.seriesId ? { ...r, coverUrl: digest.coverImage.url } : r)));
    }
  }, []);

  const drainEnrichQueue = useCallback(() => {
    if (enrichInFlightRef.current) {return;}
    const batch = pendingEnrichRef.current;
    if (batch.length === 0) {return;}
    pendingEnrichRef.current = [];
    enrichInFlightRef.current = true;
    mapWithLimit(batch, ENRICH_CONCURRENCY, enrichCover).finally(() => {
      enrichInFlightRef.current = false;
      drainEnrichQueue();
    });
  }, [enrichCover]);

  const onViewableIndices = useCallback(
    (firstVisible: number, lastVisible: number) => {
      const list = rowsRef.current;
      if (list.length === 0) {return;}
      const end = Math.min(list.length - 1, lastVisible + ENRICH_LOOKAHEAD);
      for (let i = Math.max(0, firstVisible); i <= end; i++) {
        const row = list[i];
        if (row && row.coverUrl == null && !enrichedRef.current.has(row.id)) {
          enrichedRef.current.add(row.id);
          pendingEnrichRef.current.push(row);
        }
      }
      drainEnrichQueue();
    },
    [drainEnrichQueue],
  );

  return {
    loading,
    rows,
    unreadCount,
    totalCount: rows.length,
    markRead,
    markUnread,
    markAllRead,
    deleteItem,
    reload,
    selectionMode,
    selectedIds,
    onRowLongPress,
    onRowPress,
    selectAll,
    exitSelectionMode,
    markSelectedRead,
    markSelectedUnread,
    deleteSelected,
    onViewableIndices,
  };
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
