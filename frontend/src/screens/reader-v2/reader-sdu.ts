import { PixelRatio } from 'react-native';

// Server-Driven UI: describes non-page reader content (what used to be fixed Header/Footer/Gap
// Kotlin Composables) as plain data RN sends over the bridge — see
// android/features/.../SduNode.kt for the Kotlin-side generic interpreter (SduNodeView), which
// never hardcodes what a "header" looks like, only how to draw a container/text/spacer.
export type SduNode =
  | {
      type: 'container';
      direction?: 'vertical' | 'horizontal';
      backgroundColor?: string;
      heightPx?: number;
      paddingPx?: number;
      gapPx?: number;
      align?: 'start' | 'center' | 'end';
      children: SduNode[];
    }
  | {
      type: 'text';
      text: string;
      color?: string;
      fontSize?: number;
      bold?: boolean;
      maxLines?: number;
    }
  | { type: 'spacer'; sizePx: number };

// White bold 20sp title for the header; muted 14sp "Fim do capítulo" label + bold 13sp chapter
// number for the footer; a transparent Gap between chapters (breathing room, no visible band).
const GAP_HEIGHT_DP = 24;
const HEADER_PADDING_DP = 16;
const FOOTER_PADDING_DP = 16;

function dpToPx(dp: number): number {
  return PixelRatio.getPixelSizeForLayoutSize(dp);
}

const WHITE = '#FFFFFF';
const MUTED = '#A0AEC0';
const HEADER_FOOTER_BG = '#1A1A1A';

function gapNode(): SduNode {
  return { type: 'container', heightPx: dpToPx(GAP_HEIGHT_DP), children: [] };
}

// [firstNode] for a chapter block — the Gap-above (omitted when [hasGapAbove] is false, i.e. the
// first loaded chapter of the window) followed by the chapter's title.
export function buildFirstNode(chapterTitle: string, hasGapAbove: boolean): SduNode {
  const header: SduNode = {
    type: 'container',
    backgroundColor: HEADER_FOOTER_BG,
    paddingPx: dpToPx(HEADER_PADDING_DP),
    children: [{ type: 'text', text: chapterTitle, color: WHITE, fontSize: 20, bold: true, maxLines: 2 }],
  };
  if (!hasGapAbove) {return header;}
  return { type: 'container', children: [gapNode(), header] };
}

// [lastNode] for a chapter block — "Fim do capítulo" label followed by the chapter's number in
// bold. `nextChapterLabel`/`nextChapterTitle` are accepted but DELIBERATELY unused for now (the
// user already sees the next chapter's own header right below); kept so re-enabling the preview
// is a one-line change, not a signature change.
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
