import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FollowedSeriesBridge, SeriesFollowedEmitter } from '../../../shared/bridge';
import { useStrings } from '../../../shared/i18n';
import { SerialsService } from '../../../shared/services/serials';
import { SeriesTool, SerieTool, type SerialCard } from '../../../shared/tools/serials';
import { SearchHistory } from '../search.history';
import { SearchTool } from '../search.tool';
import type { SearchHistoryItem, UseSearchResult } from '../search.types';

// useSearch — owns the catalogue to match against, the history, and the delete confirmation.
//
// The catalogue is ONE cache-first SerialsService.get() (the same Layer 4 call the Library makes),
// normalized to rows through the shared serials domain. Matching then happens in memory, so there
// is no debounce here: a debounce exists to spare a network call, and there is no network call
// per keystroke to spare — adding one would only make typing feel slower.
export function useSearch(): UseSearchResult {
  const t = useStrings();
  const [query, setQuery] = useState('');
  const [cards, setCards] = useState<SerialCard[]>([]);
  // The live followed set, kept as its own state rather than baked into `cards` once at load:
  // following is toggled from this very screen (and from others), so a row's star has to follow
  // the current value, not the one that happened to be true when the catalogue was fetched.
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SearchHistoryItem | null>(null);
  // Read inside load() so a language change doesn't rebuild the callback (and refetch); the
  // effect below re-labels the rows already in hand instead.
  const tRef = useRef(t);
  tRef.current = t;
  const previousTRef = useRef(t);
  // Set on unmount so a late .then() from either load doesn't setState on a dead component.
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([SerialsService.get({}), FollowedSeriesBridge.getAllIds().catch(() => [] as string[])])
      .then(([digest, ids]) => {
        if (!aliveRef.current) {
          return;
        }
        if (!digest.isSuccess) {
          setError(digest.error.message ?? digest.error.code ?? 'serials digest failed');
          setLoading(false);
          return;
        }
        setFollowedIds(new Set(ids));
        // Search has no BFF match and no digest index. isFollowed is deliberately NOT baked in
        // here — it's applied when the rows are read, from the live set above.
        setCards(
          SeriesTool.normalize({ serials: digest.serials }).map(serial =>
            SerieTool.normalize.card({ serial, t: tRef.current }),
          ),
        );
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!aliveRef.current) {
          return;
        }
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Rows carry finished label strings, so a language change rewrites them in place. Re-labelling
  // beats refetching: the catalogue itself didn't change, only its wording.
  useEffect(() => {
    if (previousTRef.current === t) {
      return;
    }
    previousTRef.current = t;
    setCards(current => current.map(card => SerieTool.relabel({ card, t })));
  }, [t]);

  // Kotlin pushes the followed ids whenever they change (a toggle here, on the Serie screen, or
  // in the Library). Same emitter the Library subscribes to.
  useEffect(() => {
    const sub = SeriesFollowedEmitter.addListener('seriesFollowedIds', (ids: string[]) => {
      setFollowedIds(new Set(ids));
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    SearchHistory.list().then(items => {
      if (aliveRef.current) {
        setHistory(items);
      }
    });
  }, []);

  // Pure derivation, re-run only when the query, the catalogue or the followed set changes —
  // never a fetch.
  const results = useMemo(
    () => SearchTool.filter({ cards, query }).map(card => ({ ...card, isFollowed: followedIds.has(card.id) })),
    [cards, query, followedIds],
  );

  // The history stores only identity (id/name/cover) — never the followed flag, which would be
  // stale the moment it was written. The flag is applied here, from the same live set.
  // A history row is what was stored plus what has changed since: the followed flag and the
  // catalogue's current progress, so the same series reads identically here and in the Library.
  // The catalogue is only consulted when it is there — a row still renders while it loads or
  // fails, which is why the history stores name and cover in the first place.
  const historyRows = useMemo(
    () =>
      history.map(item => {
        const card = cards.find(c => c.id === item.seriesId);
        return {
          ...item,
          isFollowed: followedIds.has(item.seriesId),
          progressFraction: card?.progressFraction ?? 0,
          progressLabel: card?.progressLabel ?? '',
          chapterCountLabel: card?.chapterCountLabel,
        };
      }),
    [history, cards, followedIds],
  );

  const recordOpened = useCallback(
    ({ seriesId }: { seriesId: string }) => {
      // Name/cover come from whichever list the row was in: a result, or the history itself
      // (reopening an old row revives it to the top without needing the catalogue).
      const card = cards.find(c => c.id === seriesId);
      const previous = history.find(h => h.seriesId === seriesId);
      const name = card?.name ?? previous?.name;
      const coverUrl = card?.coverUrl ?? previous?.coverUrl;
      if (name == null || coverUrl == null) {
        return;
      }
      SearchHistory.put({
        item: { seriesId, name, coverUrl, openedAtEpochMs: Date.now() },
      }).then(items => {
        if (aliveRef.current) {
          setHistory(items);
        }
      });
    },
    [cards, history],
  );

  const requestDelete = useCallback(
    ({ seriesId }: { seriesId: string }) => {
      const found = history.find(h => h.seriesId === seriesId);
      if (found) {
        setPendingDelete(found);
      }
    },
    [history],
  );

  const cancelDelete = useCallback(() => setPendingDelete(null), []);

  const confirmDelete = useCallback(() => {
    const target = pendingDelete;
    if (!target) {
      return;
    }
    setPendingDelete(null);
    SearchHistory.delete({ seriesId: target.seriesId }).then(items => {
      if (aliveRef.current) {
        setHistory(items);
      }
    });
  }, [pendingDelete]);

  return {
    query,
    setQuery,
    results,
    history: historyRows,
    loading,
    error,
    reload: load,
    recordOpened,
    pendingDelete,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
}
