import { Chapter } from '../bridge/series';

export function computeGapHeight(prevFooterHeight: number, nextHeaderHeight: number): number {
  return Math.max(0, prevFooterHeight) + Math.max(0, nextHeaderHeight);
}

export interface ChapterWithPages {
  chapter: Chapter;
  pages: string[];
  // Aspect ratio (height / width, from the original image dimensions) per page, aligned by
  // index with `pages` — null entries mean the dimension wasn't available (Kavita unreachable,
  // page not covered) and the native side falls back to measuring that page once it's actually
  // decoded on-device. Undefined (the whole array missing) means dimensions were never fetched
  // for this chapter at all — same fallback behavior.
  pageAspectRatios?: (number | null)[];
}

export interface ViewerChapters {
  prev: ChapterWithPages | null;
  curr: ChapterWithPages;
  next: ChapterWithPages | null;
}

export function currChapterOf(viewer: ViewerChapters): ChapterWithPages {
  return viewer.curr;
}

export function pagePreloadOrder(currentIndex: number, windowRadius: number, totalPages: number): number[] {
  if (totalPages <= 0) {
    return [];
  }
  const candidates = new Map<number, number>();
  for (let offset = -windowRadius; offset <= windowRadius; offset++) {
    const index = currentIndex + offset;
    if (index < 0 || index >= totalPages) {
      continue;
    }
    candidates.set(index, Math.abs(offset));
  }
  return Array.from(candidates.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([index]) => index);
}

export function isNearChapterEdge(currentPage: number, totalPages: number, edgeThreshold: number): boolean {
  if (totalPages <= 0) {
    return false;
  }
  return currentPage >= totalPages - 1 - edgeThreshold;
}
