import { SeriesSummary } from '../../shared/bridge/library';
import { Strings } from '../../shared/i18n/strings';

export function formatProgress(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export function formatLastAdded(utc: string | null, locale: string): string {
  if (!utc) return '—';
  const date = new Date(utc);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(locale);
}

export function statusLabel(readStatus: SeriesSummary['readStatus'], t: Strings): string {
  switch (readStatus) {
    case 'UNREAD': return t.readStatusUnread;
    case 'IN_PROGRESS': return t.readStatusReading;
    case 'READ': return t.readStatusRead;
  }
}

export function publicationLabel(
  status: SeriesSummary['publicationStatus'],
  t: Strings,
): string | null {
  switch (status) {
    case 'ONGOING': return t.publicationOngoing;
    case 'COMPLETED': return t.publicationCompleted;
    case 'CANCELLED': return t.publicationCancelled;
    case 'ON_HIATUS': return t.publicationOnHiatus;
    case 'ABANDONED': return t.publicationAbandoned;
    case 'NONE': return null;
  }
}
