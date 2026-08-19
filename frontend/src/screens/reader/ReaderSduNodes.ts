import { PixelRatio } from 'react-native';
import type { SduNode } from './SduNode';

// Reproduces, as SDU data, the exact visual the Kotlin side used to hardcode (see the SUPERSEDED
// comment block in ReaderPageList.kt): black background, white bold 20sp title for the header;
// muted 14sp end-of-chapter label + muted 12sp "next" label + white bold 16sp next title for the
// footer; a plain 48dp black Gap between chapters. Kept visually identical on purpose — this
// migration is about WHERE the styling lives (RN data vs. Kotlin code), not changing how it
// looks. Heights/padding/gaps are in dp here and converted to px (what the native side expects)
// at the call site via PixelRatio, matching the existing OVERSCROLL_TRIGGER_DP pattern in
// useReader.ts.
const GAP_HEIGHT_DP = 48;
const HEADER_PADDING_DP = 32;
const FOOTER_PADDING_DP = 32;
const FOOTER_NEXT_LABEL_GAP_DP = 16;

function dpToPx(dp: number): number {
  return PixelRatio.getPixelSizeForLayoutSize(dp);
}

const BLACK = '#000000';
const WHITE = '#FFFFFF';
const MUTED = '#A0AEC0';

function gapNode(): SduNode {
  return { type: 'container', backgroundColor: BLACK, heightPx: dpToPx(GAP_HEIGHT_DP), children: [] };
}

/**
 * [firstNode] for a chapter block — the Gap-above (omitted for the first loaded chapter of a
 * trio, i.e. when [hasGapAbove] is false) followed by the chapter's title.
 */
export function buildFirstNode(chapterTitle: string, hasGapAbove: boolean): SduNode {
  const header: SduNode = {
    type: 'container',
    backgroundColor: BLACK,
    paddingPx: dpToPx(HEADER_PADDING_DP),
    children: [{ type: 'text', text: chapterTitle, color: WHITE, fontSize: 20, bold: true, maxLines: 2 }],
  };
  if (!hasGapAbove) return header;
  return { type: 'container', children: [gapNode(), header] };
}

/**
 * [lastNode] for a chapter block — end-of-chapter label, plus a next-chapter preview when
 * [nextChapterTitle] is known. Returns null when the caller has no content for this slot at all
 * (e.g. RN chooses not to render a footer for a mid-trio chapter) — see call site.
 */
export function buildLastNode(endOfChapterLabel: string, nextChapterLabel: string, nextChapterTitle: string | null): SduNode {
  const children: SduNode[] = [{ type: 'text', text: endOfChapterLabel, color: MUTED, fontSize: 14 }];
  if (nextChapterTitle != null) {
    // Spacer (not container-level gapPx) matches the original's exact spacing: 16dp only between
    // the end-of-chapter label and the "next" label, none between "next" label and next title.
    children.push({ type: 'spacer', sizePx: dpToPx(FOOTER_NEXT_LABEL_GAP_DP) });
    children.push({ type: 'text', text: nextChapterLabel, color: MUTED, fontSize: 12 });
    children.push({ type: 'text', text: nextChapterTitle, color: WHITE, fontSize: 16, bold: true, maxLines: 1 });
  }
  return {
    type: 'container',
    backgroundColor: BLACK,
    paddingPx: dpToPx(FOOTER_PADDING_DP),
    children,
  };
}
