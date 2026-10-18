import { useEffect, useState } from 'react';
import { ChapterService } from '../shared/services/chapters';

// What a chapter is, for choosing the reader that opens it. 'loading' only while it is being asked.
export type ReaderKind = 'loading' | 'book' | 'images';

// Kavita's file format for a chapter served as a book (see PluginChapter.fileFormat).
const BOOK_FORMAT = 'epub';

export function readerKindOf(fileFormat: string | undefined | null): Exclude<ReaderKind, 'loading'> {
  return fileFormat === BOOK_FORMAT ? 'book' : 'images';
}

// A caller that already knows the format (the series screen holds every chapter's) passes it as
// `hint` and nothing is asked. Otherwise the chapter's digest is read — cache-first, so usually no
// request. When it cannot be read the image reader opens: it has the error handling.
export function useReaderKind({
  seriesId,
  chapterId,
  hint,
}: {
  seriesId: string;
  chapterId: string;
  hint?: string;
}): ReaderKind {
  const [kind, setKind] = useState<ReaderKind>(hint != null ? readerKindOf(hint) : 'loading');

  useEffect(() => {
    if (hint != null) {
      setKind(readerKindOf(hint));
      return;
    }
    let cancelled = false;
    setKind('loading');
    ChapterService.get({ seriesId, chapterId })
      .then(digest => {
        if (!cancelled) {setKind(digest.isSuccess ? readerKindOf(digest.pages.fileFormat) : 'images');}
      })
      .catch(() => {
        if (!cancelled) {setKind('images');}
      });
    return () => {
      cancelled = true;
    };
  }, [seriesId, chapterId, hint]);

  return kind;
}
