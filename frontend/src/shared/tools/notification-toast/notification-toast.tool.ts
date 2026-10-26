import type { NotificationHistoryItem } from '../../bridge';
import type { Strings } from '../../i18n';
import type { AdultFiltered } from '../adult-filter';

// One series' share of what just arrived, as the toast lists it. Always grouped by series — the
// toast ignores the "group notifications" preferences, which are about the system tray and the
// history list, not about this glance.
export interface NotificationToastGroup {
  seriesId: string;
  seriesName: string;
  // What arrived for this series: the chapter number, or how many chapters.
  bodyText: string;
  // Only when exactly one chapter arrived and it is known — the tap then opens it straight away,
  // the same rule the system notification's deep link follows. Otherwise the tap opens the series.
  chapterId?: string;
  // Adult-content filter: draw the texts blurred.
  blurred?: boolean;
  // Filled in by whoever shows the list (the covers are read lazily, never part of what arrived).
  coverUrl?: string;
}

// What the collapsed pill says: the one series' own message when every notification is from the
// same series, otherwise just how many series have news.
export interface NotificationToastHeadline {
  title: string;
  subtitle?: string;
  blurred?: boolean;
}

export interface NotificationToastSummary {
  groups: NotificationToastGroup[];
  headline: NotificationToastHeadline;
}

function bodyOf({ items, t }: { items: NotificationHistoryItem[]; t: Strings }): string {
  if (items.length > 1) {
    return t.notificationsHistoryBodyBatch.replace('{0}', String(items.length));
  }
  const number = items[0].chapterNumber;
  return number != null ? t.notificationsHistoryBodyNumbered.replace('{0}', number) : t.notificationsHistoryBodyUnnumbered;
}

export const NotificationToastTool = {
  // `items` are the history rows of one burst of notifications, already filtered for adult
  // content (each may carry `blurred`). Newest series first, as the history reports them.
  summarize({ items, t }: { items: AdultFiltered<NotificationHistoryItem>[]; t: Strings }): NotificationToastSummary {
    const bySeries = new Map<string, AdultFiltered<NotificationHistoryItem>[]>();
    for (const item of items) {
      const group = bySeries.get(item.seriesId);
      if (group) {
        group.push(item);
      } else {
        bySeries.set(item.seriesId, [item]);
      }
    }

    const groups: NotificationToastGroup[] = [...bySeries.values()].map(rows => ({
      seriesId: rows[0].seriesId,
      seriesName: rows[0].seriesName,
      bodyText: bodyOf({ items: rows, t }),
      chapterId: rows.length === 1 ? rows[0].chapterId : undefined,
      blurred: rows.some(row => row.blurred),
    }));

    const headline: NotificationToastHeadline =
      groups.length === 1
        ? { title: groups[0].seriesName, subtitle: groups[0].bodyText, blurred: groups[0].blurred }
        : { title: t.notificationToastSummary.replace('{0}', String(groups.length)) };

    return { groups, headline };
  },
} as const;
