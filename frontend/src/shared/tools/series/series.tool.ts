import type { SerialData } from '../../bridge/server';
import { DateTool } from '../date';
import type { Serie } from './serie.tool';

// SeriesTool — the "series" domain normalizer for a LIST of series (the batch
// SerialsService.list() / ServerBridge.listSerials()), the plural sibling of SerieTool
// (one series, from a full digest). Same rule as ChaptersTool vs ChapterTool: plural is a
// distinct concern that lives beside the singular.
//
// It produces the exact same canonical shape — Serie[] — as SerieTool.normalize. The batch
// source (Kavita's /api/Series/all-v2, via Server → SerialData) simply carries fewer fields, so
// the ones a digest would fill (`chapters`, `resumePoint`, `metadata`, `otherNames`, `otherIds`,
// `colors`, `library`) come back absent. A consumer reads `Serie` the same way regardless of
// which normalizer produced it; it just checks for the fields it needs.

function toSerie(serial: SerialData): Serie {
  // Kavita's *Utc fields are ISO local date-times with no zone and a 7-digit fraction — parsed
  // via DateTool (Date.parse alone would NaN them in Hermes). The canonical Serie carries
  // timestamps as epoch ms, same as the digest's lastUpdatesUTC.
  const chapterAdded = DateTool.parse.to.epochMs(serial.lastChapterAddedUtc);
  const seriesUpdated = DateTool.parse.to.epochMs(serial.lastFolderScannedUtc);
  const readDate = DateTool.parse.to.epochMs(serial.latestReadDateUtc);
  return {
    id: serial.id,
    name: serial.name,
    coverImage: serial.coverImage,
    // Only build lastUpdatesUTC when at least one field resolved — otherwise leave it undefined,
    // same as a digest with no update info.
    lastUpdatesUTC:
      chapterAdded != null || seriesUpdated != null || readDate != null
        ? { series: seriesUpdated, chapterAdded, readDate }
        : undefined,
    // The listing has no per-chapter data.
    chapters: [],
    // Page-level progress is all the batch listing offers.
    pages: { read: serial.pagesRead, total: serial.totalPages },
    otherNames:
      serial.originalName != null || serial.localizedName != null
        ? { original: serial.originalName, localized: serial.localizedName }
        : undefined,
    sortName: serial.sortName,
    otherIds:
      serial.aniListId != null || serial.malId != null
        ? { aniListId: serial.aniListId, malId: serial.malId }
        : undefined,
    colors:
      serial.primaryColor != null || serial.secondaryColor != null
        ? { primary: serial.primaryColor, secondary: serial.secondaryColor }
        : undefined,
    library: serial.libraryId != null ? { id: serial.libraryId, name: serial.libraryName } : undefined,
    resolvedAtEpochMs: serial.coverImage.resolvedAtEpochMs,
    server: serial.coverImage.server,
  };
}

export const SeriesTool = {
  // SerialsService.list() → Serie[]. `serials` is the raw SerialData[] the bridge produced.
  normalize({ serials }: { serials: SerialData[] }): Serie[] {
    return serials.map(toSerie);
  },
};
