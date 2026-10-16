import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useStrings } from '../../../shared/i18n';
import { useEvent } from '../../../shared/managers/events';
import { FollowedSeriesService } from '../../../shared/services/followed-series';
import { SerialService, SerialsService } from '../../../shared/services/serials';
import { SeriesTool, SerieEvents, SerieTool, type Serie } from '../../../shared/tools/serials';
import { DASHBOARD_LIMITS, DashboardTool } from '../dashboard.tool';
import type { DashboardData, DashboardStatus } from '../dashboard.types';

// useDashboard — loads the series list (cache-first, the same call the Library makes), the
// followed ids, and a digest for each "continue reading" candidate, then hands them to
// DashboardTool. It owns no cache: keeping a series' resume point fresh is the series domain's job
// (SerialRefreshTool), not this screen's.
// Reloads (cache-first, cheap) every time the tab regains focus, so progress made elsewhere shows
// up, and again when SerialRefreshTool reports a series was re-fetched after reading;
// pull-to-refresh is the only `force` here.
export function useDashboard() {
  const t = useStrings();
  const [status, setStatus] = useState<DashboardStatus>('loading');
  const [data, setData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Only the latest request may write state: focus and pull-to-refresh can overlap.
  const requestRef = useRef(0);

  const load = useCallback(
    async ({ force }: { force: boolean }) => {
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
        const followed = new Set(followedIds);

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
        setData(DashboardTool.build({ series, followedIds: followed, continueSeries, t }));
        setStatus('ready');
      } catch {
        if (request !== requestRef.current) {return;}
        // A reload that fails keeps what is already on screen.
        setStatus(previous => (previous === 'ready' ? 'ready' : 'error'));
      }
    },
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      load({ force: false });
    }, [load]),
  );

  // A series was re-fetched after reading in it: re-read the (now fresh) cache.
  useEvent(SerieEvents.refreshed, () => {
    load({ force: false });
  });

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
