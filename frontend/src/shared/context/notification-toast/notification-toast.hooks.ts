import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NotificationsEventEmitter, type NewNotificationReceivedEvent, type NotificationHistoryItem } from '../../bridge';
import { useStrings } from '../../i18n';
import { NotificationsService } from '../../services/notifications';
import { SerialService } from '../../services/serials';
import { NotificationToastTool } from '../../tools/notification-toast';
import { useAdultFiltered } from '../adult-filter';

// How long the pill stays on screen before it goes away on its own. Expanding it stops the clock:
// whoever tapped it is reading.
export const NOTIFICATION_TOAST_VISIBLE_MS = 4000;

// The in-app notification toast: when something arrives while the app is open (the native side
// posts nothing to the system tray then), it shows a thin pill for a moment; tapping the pill
// opens the list of what arrived in that burst, grouped by series.
//
// A "burst" is everything that arrived since the pill last went away — a second notification while
// the pill is still up extends it (same pill, new count, clock restarted) rather than stacking a
// second one.
export function useNotificationToast() {
  const t = useStrings();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [burst, setBurst] = useState<NotificationHistoryItem[]>([]);

  // Covers already fetched, by series: the list shows one next to each series.
  const [covers, setCovers] = useState<Record<string, string>>({});
  const coversRequestedRef = useRef<Set<string>>(new Set());

  const idsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expandedRef = useRef(false);
  expandedRef.current = expanded;

  const stopClock = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    stopClock();
    idsRef.current = new Set();
    setVisible(false);
    setExpanded(false);
  }, [stopClock]);

  const startClock = useCallback(() => {
    stopClock();
    timerRef.current = setTimeout(dismiss, NOTIFICATION_TOAST_VISIBLE_MS);
  }, [stopClock, dismiss]);

  useEffect(() => {
    const sub = NotificationsEventEmitter.addListener('newNotificationReceived', (event?: NewNotificationReceivedEvent) => {
      const arrived = event?.historyIds ?? [];
      if (arrived.length === 0) {return;}
      arrived.forEach(id => idsRef.current.add(id));
      setVisible(true);
      if (!expandedRef.current) {startClock();}
      NotificationsService.history
        .list()
        .then(items => setBurst(items.filter(item => idsRef.current.has(item.id))))
        // Best-effort, like the history's own refresh: no rows just means no pill.
        .catch(() => {});
    });
    return () => {
      sub.remove();
      stopClock();
    };
  }, [startClock, stopClock]);

  const shown = useAdultFiltered({ items: burst, idOf: item => item.seriesId });
  const summary = useMemo(() => NotificationToastTool.summarize({ items: shown, t }), [shown, t]);

  // The cover of each series in the burst, read once per series (cache-first on the native side).
  useEffect(() => {
    summary.groups.forEach(({ seriesId }) => {
      if (coversRequestedRef.current.has(seriesId)) {return;}
      coversRequestedRef.current.add(seriesId);
      SerialService.get({ seriesId })
        .then(digest => {
          if (digest.isSuccess) {setCovers(current => ({ ...current, [seriesId]: digest.coverImage.url }));}
        })
        // Best-effort: a series without a cover just shows its placeholder.
        .catch(() => {});
    });
  }, [summary.groups]);

  const groups = useMemo(
    () => summary.groups.map(group => ({ ...group, coverUrl: covers[group.seriesId] })),
    [summary.groups, covers],
  );

  const expand = useCallback(() => {
    stopClock();
    setExpanded(true);
  }, [stopClock]);

  return {
    // Nothing worth showing (every row hidden by the content filter, or the list not read yet)
    // keeps the pill away.
    visible: visible && groups.length > 0,
    expanded,
    headline: summary.headline,
    groups,
    expand,
    dismiss,
  };
}
