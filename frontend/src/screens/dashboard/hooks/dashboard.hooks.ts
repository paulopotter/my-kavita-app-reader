import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAdultFiltered } from '../../../shared/context/adult-filter';
import { useStrings } from '../../../shared/i18n';
import { useEvent } from '../../../shared/managers/events';
import { FollowedSeriesService } from '../../../shared/services/followed-series';
import { SerialService, SerialsService } from '../../../shared/services/serials';
import { ConcurrencyTool } from '../../../shared/tools/concurrency';
import { SeriesTool, SerieEvents, SerieTool, type Serie } from '../../../shared/tools/serials';
import { DASHBOARD_LIMITS, DashboardTool } from '../dashboard.tool';
import type { DashboardData, DashboardItem, DashboardStatus } from '../dashboard.types';

// How many "continue reading" digests are fetched at once. Each is a whole series (all its chapters),
// so asking for a dozen together makes every one of them slow and the first tile the last to appear.
const CONTINUE_DIGEST_CONCURRENCY = 4;

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
// The screen paints as soon as the series list is in: every rail but "continue reading" is built from
// the list alone, and the digests that rail needs can take seconds (a cold or very long series), so
// nothing else waits for them. Its tiles appear one by one as each digest arrives.
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
    const startedAt = Date.now();
    try {
      const [serialsDigest, followedIds] = await Promise.all([
        SerialsService.get({ force }),
        FollowedSeriesService.ids.get().catch(() => [] as string[]),
      ]);
      if (!serialsDigest.isSuccess) {
        throw new Error(serialsDigest.error.message ?? serialsDigest.error.code ?? 'serials digest failed');
      }
      const series = SeriesTool.normalize({ serials: serialsDigest.serials });
      const followed = new Set(followedIds);
      const listMs = Date.now() - startedAt;

      if (request !== requestRef.current) {return;}
      // Paint now. What was already shown for "continue reading" stays until the new digests land.
      setSource(previous => ({ series, followedIds: followed, continueSeries: previous?.continueSeries ?? [] }));
      setStatus('ready');

      const candidates = DashboardTool.continueCandidates({ series, limit: DASHBOARD_LIMITS.continueReading });
      const resolved: Array<Serie | null> = candidates.map(() => null);
      const publish = () => {
        if (request !== requestRef.current) {return;}
        setSource({ series, followedIds: followed, continueSeries: resolved.filter((s): s is Serie => s != null) });
      };
      await ConcurrencyTool.each({
        items: candidates,
        limit: CONTINUE_DIGEST_CONCURRENCY,
        task: async (candidate, index) => {
          const digest = await SerialService.get({ seriesId: candidate.id, force });
          if (digest.isSuccess) {
            resolved[index] = SerieTool.normalize.digest({ digest });
            publish();
          }
        },
      });
      // One line per load, so a slow open can be told apart on the device: the list, or the digests.
      // eslint-disable-next-line no-console
      console.log(`[dashboard] list=${listMs}ms digests=${Date.now() - startedAt - listMs}ms candidates=${candidates.length} force=${force}`);
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
