import type { SerialDigest } from '../../bridge/digest';
import { SerieTool, type Serie } from './serie.tool';

// SeriesTool — the "series" domain normalizer for a LIST of series (SerialsService.get(), which
// resolves a SerialsDigest whose `serials` is a SerialDigest[]). The plural sibling of SerieTool
// (one series, one digest). Same rule as ChaptersTool vs ChapterTool: plural is a distinct
// concern that lives beside the singular.
//
// Every item in a SerialsDigest is already digest-shaped — a minimal SerialDigestSuccess built
// straight from the list row (chapters/metadata/resumePoint absent, but id/name/cover/pages/dates
// present). So normalization is literally SerieTool.normalize per item — no hand-mapping of raw
// provider fields. A SerialDigest that came back as a Failure (should never happen for a list
// row, which has no per-series network call) is dropped.

export const SeriesTool = {
  normalize({ serials }: { serials: SerialDigest[] }): Serie[] {
    return serials
      .filter((d): d is Extract<SerialDigest, { isSuccess: true }> => d.isSuccess)
      .map((digest) => SerieTool.normalize({ digest }));
  },
};
