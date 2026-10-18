import type { Strings } from '../../shared/i18n';
import { DateTool } from '../../shared/tools/date';
import type { Serie } from '../../shared/tools/serials';
import type { DashboardData, DashboardItem, DashboardStats } from './dashboard.types';

// DashboardTool — pure functions that shape the Dashboard's rails from the series list the
// Library already loads (SerialsService.get → SeriesTool.normalize). Local to this screen: nothing
// else asks for these rails. No fetch, no cache — the hook feeds it.

export const DASHBOARD_LIMITS = {
  continueReading: 10,
  followedUpdated: 10,
  recentlyUpdated: 10,
  unreadFollowed: 10,
  recentlyAdded: 10,
} as const;

// Digests fetched beyond the rail size, so a candidate that turns out to have nothing to resume
// (every chapter read) does not leave the rail short.
export const CONTINUE_CANDIDATE_BUFFER = 4;

// Kavita reports "never" as year 1, which reads as a huge negative epoch.
function validEpoch(ms: number | undefined): number | undefined {
  return ms != null && ms > 0 ? ms : undefined;
}

function chapterAddedOf(serie: Serie): number | undefined {
  return validEpoch(serie.lastUpdatesUTC?.chapterAdded);
}

function createdOf(serie: Serie): number | undefined {
  return validEpoch(serie.lastUpdatesUTC?.created);
}

function readDateOf(serie: Serie): number | undefined {
  return validEpoch(serie.lastUpdatesUTC?.readDate);
}

function isInProgress(serie: Serie): boolean {
  const pages = serie.pages;
  return pages != null && pages.read > 0 && pages.read < pages.total;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

// A label for what a series is made of, when it is not a comic: an EPUB is a novel, a PDF says PDF
// (it may be a scanned comic, so it is not called a novel). Comics get none, to keep tiles clean.
function formatBadge({ serie, t }: { serie: Serie; t: Strings }): string | undefined {
  if (serie.fileFormat === 'epub') {return t.dashboardBadgeNovel;}
  if (serie.fileFormat === 'pdf') {return t.dashboardBadgePdf;}
  return undefined;
}

function baseItem({ serie, t }: { serie: Serie; t: Strings }): DashboardItem {
  return { seriesId: serie.id, name: serie.name, coverUrl: serie.coverImage.url, badge: formatBadge({ serie, t }) };
}

function updatedCaption({ serie, t }: { serie: Serie; t: Strings }): string | undefined {
  const added = chapterAddedOf(serie);
  return added != null ? DateTool.format.to.relative(added, t) : undefined;
}

export const DashboardTool = {
  // The series worth fetching a digest for: started, not finished, most recently read first.
  // Series-level pages are all the list row carries, so a series whose pages are all read (and
  // got a new chapter since) is not seen here.
  continueCandidates({ series, limit }: { series: Serie[]; limit: number }): Serie[] {
    return series
      .filter(isInProgress)
      .sort((a, b) => (readDateOf(b) ?? 0) - (readDateOf(a) ?? 0))
      .slice(0, limit + CONTINUE_CANDIDATE_BUFFER);
  },

  // One "continue reading" tile from a series digest (it carries the resume point and each
  // chapter's page counts). Null when there is nothing left to resume.
  continueItem({ serie, t }: { serie: Serie; t: Strings }): DashboardItem | null {
    const resume = serie.resumePoint;
    if (!resume) {return null;}
    const chapter = serie.chapters.find(c => c.id === resume.stoppedAtChapterId);
    const number = chapter?.isSpecial ? chapter.specialLabel : (chapter?.decimalNumber ?? chapter?.number);
    const pages = chapter?.pages;
    const hasBar =
      resume.status === 'IN_PROGRESS' && pages?.count != null && pages.count > 0 && (pages.readCount ?? 0) > 0;
    return {
      ...baseItem({ serie, t }),
      chapterId: resume.stoppedAtChapterId,
      caption: number != null ? t.dashboardChapter.replace('{0}', String(number)) : undefined,
      progressFraction: hasBar ? clamp01(pages!.readCount! / pages!.count!) : undefined,
    };
  },

  // What a "continue reading" tile is made of, as one string: two digests of the same series with
  // the same signature draw the same tile, so a reload that changed nothing can leave the screen alone.
  continueSignature(serie: Serie): string {
    const resume = serie.resumePoint;
    const chapter = resume ? serie.chapters.find(c => c.id === resume.stoppedAtChapterId) : undefined;
    return JSON.stringify([
      serie.id,
      serie.name,
      serie.coverImage.url,
      resume?.stoppedAtChapterId,
      resume?.status,
      chapter?.isSpecial,
      chapter?.specialLabel,
      chapter?.decimalNumber,
      chapter?.number,
      chapter?.pages?.count,
      chapter?.pages?.readCount,
    ]);
  },

  sameContinue({ previous, next }: { previous: Serie[]; next: Serie[] }): boolean {
    return (
      previous.length === next.length &&
      previous.every((serie, index) => DashboardTool.continueSignature(serie) === DashboardTool.continueSignature(next[index]))
    );
  },

  // Followed series that got a chapter after the last time the user read them.
  followedUpdated({
    series,
    followedIds,
    limit,
    t,
  }: {
    series: Serie[];
    followedIds: Set<string>;
    limit: number;
    t: Strings;
  }): DashboardItem[] {
    return series
      .filter(s => followedIds.has(s.id))
      .filter(s => {
        const added = chapterAddedOf(s);
        return added != null && added > (readDateOf(s) ?? 0);
      })
      .sort((a, b) => chapterAddedOf(b)! - chapterAddedOf(a)!)
      .slice(0, limit)
      .map(s => ({ ...baseItem({ serie: s, t }), caption: updatedCaption({ serie: s, t }) }));
  },

  recentlyUpdated({ series, limit, t }: { series: Serie[]; limit: number; t: Strings }): DashboardItem[] {
    return series
      .filter(s => chapterAddedOf(s) != null)
      .sort((a, b) => chapterAddedOf(b)! - chapterAddedOf(a)!)
      .slice(0, limit)
      .map(s => ({ ...baseItem({ serie: s, t }), caption: updatedCaption({ serie: s, t }) }));
  },

  // Followed series with something still unread, newest chapter first.
  unreadFollowed({
    series,
    followedIds,
    limit,
    t,
  }: {
    series: Serie[];
    followedIds: Set<string>;
    limit: number;
    t: Strings;
  }): DashboardItem[] {
    return series
      .filter(s => followedIds.has(s.id) && s.pages != null && s.pages.total > 0 && s.pages.read < s.pages.total)
      .sort((a, b) => (chapterAddedOf(b) ?? 0) - (chapterAddedOf(a) ?? 0))
      .slice(0, limit)
      .map(s => {
        const fraction = clamp01(s.pages!.read / s.pages!.total);
        return {
          ...baseItem({ serie: s, t }),
          caption: t.dashboardPercentRead.replace('{0}', String(Math.round(fraction * 100))),
          progressFraction: fraction > 0 ? fraction : undefined,
        };
      });
  },

  // Series that appeared in the library most recently (not "got a chapter" — that is
  // recentlyUpdated).
  recentlyAdded({ series, limit, t }: { series: Serie[]; limit: number; t: Strings }): DashboardItem[] {
    return series
      .filter(s => createdOf(s) != null)
      .sort((a, b) => createdOf(b)! - createdOf(a)!)
      .slice(0, limit)
      .map(s => ({ ...baseItem({ serie: s, t }), caption: DateTool.format.to.relative(createdOf(s)!, t) }));
  },

  stats({ series, followedIds }: { series: Serie[]; followedIds: Set<string> }): DashboardStats {
    return {
      series: series.length,
      followed: series.filter(s => followedIds.has(s.id)).length,
      inProgress: series.filter(isInProgress).length,
    };
  },

  // `continueSeries` are the digests of DashboardTool.continueCandidates, already fetched.
  build({
    series,
    followedIds,
    continueSeries,
    t,
  }: {
    series: Serie[];
    followedIds: Set<string>;
    continueSeries: Serie[];
    t: Strings;
  }): DashboardData {
    const continueReading = continueSeries
      .map(serie => DashboardTool.continueItem({ serie, t }))
      .filter((item): item is DashboardItem => item != null)
      .slice(0, DASHBOARD_LIMITS.continueReading);
    return {
      continueReading,
      followedUpdated: DashboardTool.followedUpdated({ series, followedIds, limit: DASHBOARD_LIMITS.followedUpdated, t }),
      recentlyUpdated: DashboardTool.recentlyUpdated({ series, limit: DASHBOARD_LIMITS.recentlyUpdated, t }),
      unreadFollowed: DashboardTool.unreadFollowed({ series, followedIds, limit: DASHBOARD_LIMITS.unreadFollowed, t }),
      recentlyAdded: DashboardTool.recentlyAdded({ series, limit: DASHBOARD_LIMITS.recentlyAdded, t }),
      stats: DashboardTool.stats({ series, followedIds }),
    };
  },
};
