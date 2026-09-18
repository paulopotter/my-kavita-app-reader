import type { ExternalMetadataMatch } from '../../shared/bridge';
import type { Strings } from '../../shared/i18n';
import { SerieTool, type Serie, type SerialCard } from '../../shared/tools/serials';
import type { SeriesDigestIndexEntry } from '../../shared/managers/store';

// LibraryTool — the screen-local tool for the Library/Following screen. It takes what
// library.hooks.ts already fetched — Serie[] (already normalized by SerieTool), the positional
// BFF match array, the persistent per-series digest index, and the followed-id set — and hands
// each of them to SerieTool.normalize.card, the shared normalizer that produces the row shape
// every card renders. It never fetches; the hook owns "when/how to fetch".
//
// "Library" is not a domain (plan 017, Task 011) — it's a listing view over Serials plus a
// filter. So this composition (which enrichment belongs to which serial) lives with the screen;
// the row SHAPE and its labels live in the serials domain, shared with Search.

// The Library's own name for a row. Structurally a SerialCard — kept as an alias so the screen,
// the hook and their tests keep reading `LibraryEntry`.
export type LibraryEntry = SerialCard;

export const LibraryTool = {
  // Composes the whole list. `matches[i]` corresponds to `series[i]` (positional, from the BFF
  // batch — null = no match). `indexBySeriesId` holds whatever the persistent SeriesDigestIndex
  // had for each id (resolved by the hook). `followedIds` is the current followed set.
  normalize({
    series,
    matches,
    indexBySeriesId,
    followedIds,
    t,
  }: {
    series: Serie[];
    matches: (ExternalMetadataMatch | null)[];
    indexBySeriesId: Map<string, SeriesDigestIndexEntry>;
    followedIds: Set<string>;
    t: Strings;
  }): LibraryEntry[] {
    return series.map((serial, i) => {
      const match = matches[i] ?? null;
      const index = indexBySeriesId.get(serial.id) ?? null;
      return SerieTool.normalize.card({
        serial,
        t,
        enrichment: {
          isFollowed: followedIds.has(serial.id),
          readChapters: index?.readChapters,
          totalChapters: index?.totalChapters,
          // Cascade: BFF match first, then the digest index's Kavita value. Passed as two
          // separate fields so the fallback also applies when the BFF's string is unrecognized,
          // not only when it's absent.
          publicationStatus: match?.status,
          fallbackPublicationStatus: index?.publicationStatus,
          downloadedChapters: match?.downloadedChapters,
          bffTotalChapters: match?.totalChapters,
          hasErrors: match?.hasErrors,
        },
      });
    });
  },
};
