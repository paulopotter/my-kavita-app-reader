import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAdultFiltered } from '../../../shared/context/adult-filter';
import { useStrings } from '../../../shared/i18n';
import { useEvent } from '../../../shared/managers/events';
import { FollowedSeriesService } from '../../../shared/services/followed-series';
import { SerialService, SerialsService } from '../../../shared/services/serials';
import { SeriesTool, SerieEvents, SerieTool, type Serie } from '../../../shared/tools/serials';
import { DASHBOARD_LIMITS, DashboardTool } from '../dashboard.tool';
import type { DashboardData, DashboardItem, DashboardStatus } from '../dashboard.types';

interface Source {
  series: Serie[];
  followedIds: Set<string>;
  continueSeries: Serie[];
}

// useDashboard — loads the series list (cache-first, the same call the Library makes), the
// followed ids, and a digest for each "continue reading" candidate, then hands them to
// DashboardTool. It owns no cache: keeping a series' resume point fresh is the series domain's job
// (SerialRefreshTool), not this screen's.
// Reloads (cache-first, cheap) every time the tab regains focus, so progress made elsewhere shows
// up, and again when SerialRefreshTool reports a series was re-fetched after reading;
// pull-to-refresh is the only `force` here.
//
// What it loads stays raw. The adult-content filter runs at read time over that source, before the
// rails are built — so a hidden series is absent from every rail and from the stats alike.
export function useDashboard() {
  const t = useStrings();
  const [status, setStatus] = useState<DashboardStatus>('loading');
  const [source, setSource] = useState<Source | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Only the latest request may write state: focus and pull-to-refresh can overlap.
  const requestRef = useRef(0);

  const load = useCallback(async ({ force }: { force: boolean }) => {
    const request = ++requestRef.current;
    try {
      const [serialsDigest, followedIds] = await Promise.all([
        SerialsService.get({ force }),
        FollowedSeriesService.ids.get().catch(() => [] as string[]),
      ]);
      if (!serialsDigest.isSuccess) {
        throw new Error(serialsDigest.error.message ?? serialsDigest.error.code ?? 'serials digest failed');
      }
      const series = SeriesTool.normalize({ serials: serialsDigest.serials });

      const candidates = DashboardTool.continueCandidates({ series, limit: DASHBOARD_LIMITS.continueReading });
      const settled = await Promise.allSettled(
        candidates.map(candidate => SerialService.get({ seriesId: candidate.id, force })),
      );
      const continueSeries: Serie[] = [];
      settled.forEach(result => {
        if (result.status === 'fulfilled' && result.value.isSuccess) {
          continueSeries.push(SerieTool.normalize.digest({ digest: result.value }));
        }
      });

      if (request !== requestRef.current) {return;}
      setSource({ series, followedIds: new Set(followedIds), continueSeries });
      setStatus('ready');
    } catch {
      if (request !== requestRef.current) {return;}
      // A reload that fails keeps what is already on screen.
      setStatus(previous => (previous === 'ready' ? 'ready' : 'error'));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load({ force: false });
    }, [load]),
  );

  // A series was re-fetched after reading in it: re-read the (now fresh) cache.
  useEvent(SerieEvents.refreshed, () => {
    load({ force: false });
  });

  // Adult filter at read time. The series that survive it are the only ones any rail can see;
  // the continue-reading digests are narrowed to the same set.
  const visibleSeries = useAdultFiltered({ items: source?.series ?? [], idOf: serie => serie.id });
  const data = useMemo<DashboardData | null>(() => {
    if (!source) {return null;}
    const visibleIds = new Set(visibleSeries.map(serie => serie.id));
    const blurredIds = new Set(visibleSeries.filter(serie => serie.blurred).map(serie => serie.id));
    const built = DashboardTool.build({
      series: visibleSeries,
      followedIds: source.followedIds,
      continueSeries: source.continueSeries.filter(serie => visibleIds.has(serie.id)),
      t,
    });
    const mark = (items: DashboardItem[]): DashboardItem[] =>
      items.map(item => (blurredIds.has(item.seriesId) ? { ...item, blurred: true } : item));
    return {
      ...built,
      continueReading: mark(built.continueReading),
      latestChapters: mark(built.latestChapters),
      recentlyUpdated: mark(built.recentlyUpdated),
      unreadFollowed: mark(built.unreadFollowed),
      recentlyAdded: mark(built.recentlyAdded),
    };
  }, [source, visibleSeries, t]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load({ force: true });
    setRefreshing(false);
  }, [load]);

  const retry = useCallback(() => {
    setStatus('loading');
    load({ force: false });
  }, [load]);

  return { status, data, refreshing, refresh, retry };
}
