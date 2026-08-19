import { PixelRatio } from 'react-native';
import type { SduNode } from './SduNode';

// Server-Driven UI styling for Header/Footer/Gap — white bold 20sp title for the header; muted
// 14sp "Fim do capítulo" label + bold 13sp chapter number for the footer (see buildLastNode doc
// for why the next-chapter preview is currently hidden); a transparent Gap between chapters (just
// breathing room, no visible band). Padding values reduced from the original 32dp (which read as
// oversized once DEBUG backgrounds made the element's real bounds visible — see conversation).
// Heights/padding/gaps are in dp here and converted to px (what the native side expects) at the
// call site via PixelRatio, matching the existing OVERSCROLL_TRIGGER_DP pattern in useReader.ts.
const GAP_HEIGHT_DP = 24;
const HEADER_PADDING_DP = 16;
const FOOTER_PADDING_DP = 16;
// Unused while the next-chapter preview is hidden (see buildLastNode doc) — kept for when it's
// re-enabled: 16dp spacing between the end-of-chapter line and the "next" label.
// const FOOTER_NEXT_LABEL_GAP_DP = 16;

function dpToPx(dp: number): number {
  return PixelRatio.getPixelSizeForLayoutSize(dp);
}

const WHITE = '#FFFFFF';
const MUTED = '#A0AEC0';

// Final dark-gray background for both Header and Footer, per explicit request. Gap stays
// transparent (see gapNode) — no visible band, just breathing room.
const HEADER_FOOTER_BG = '#1A1A1A';

function gapNode(): SduNode {
  return { type: 'container', heightPx: dpToPx(GAP_HEIGHT_DP), children: [] };
}

/**
 * [firstNode] for a chapter block — the Gap-above (omitted for the first loaded chapter of a
 * trio, i.e. when [hasGapAbove] is false) followed by the chapter's title.
 */
export function buildFirstNode(chapterTitle: string, hasGapAbove: boolean): SduNode {
  const header: SduNode = {
    type: 'container',
    backgroundColor: HEADER_FOOTER_BG,
    paddingPx: dpToPx(HEADER_PADDING_DP),
    children: [{ type: 'text', text: chapterTitle, color: WHITE, fontSize: 20, bold: true, maxLines: 2 }],
  };
  if (!hasGapAbove) return header;
  return { type: 'container', children: [gapNode(), header] };
}

/**
 * [lastNode] for a chapter block — "Fim do capítulo" label followed by the chapter's number in
 * bold. Same padding as the header, matching size intentionally (see conversation).
 *
 * [nextChapterTitle]/[nextChapterLabel] are accepted but DELIBERATELY unused for now — the
 * next-chapter preview is hidden as a test (the user already sees the next chapter's own Header
 * right below, so this reduces "repetition" of information). Kept as params so re-enabling it
 * later is a one-line change, not a signature change.
 */
export function buildLastNode(
  endOfChapterLabel: string,
  chapterNumber: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  nextChapterLabel: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  nextChapterTitle: string | null,
): SduNode {
  return {
    type: 'container',
    direction: 'horizontal',
    backgroundColor: HEADER_FOOTER_BG,
    paddingPx: dpToPx(FOOTER_PADDING_DP),
    children: [
      { type: 'text', text: `${endOfChapterLabel} `, color: MUTED, fontSize: 14 },
      { type: 'text', text: chapterNumber, color: WHITE, fontSize: 13, bold: true },
    ],
  };
}
