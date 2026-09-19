import { ColorTool, colors, icon, radius, spacing, text, type RgbColor } from '../../shared/theme';

// Server-Driven UI: describes non-page reader content (what used to be fixed Header/Footer/Gap
// Kotlin Composables) as plain data RN sends over the bridge — see
// android/features/.../SduNode.kt for the Kotlin-side generic interpreter (SduNodeView), which
// never hardcodes what a "header" looks like, only how to draw a container/text/spacer.
export type SduNode =
  | {
      type: 'container';
      direction?: 'vertical' | 'horizontal';
      backgroundColor?: string;
      heightDp?: number;
      paddingDp?: number;
      gapDp?: number;
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
      // A token inside `text` that Kotlin replaces before drawing, e.g. '{code}'. Kotlin never
      // learns what the value means, so the wording and the position stay with the language.
      placeholder?: string;
    }
  | { type: 'spacer'; sizeDp: number }
  | { type: 'spinner'; color?: string; sizeDp?: number }
  | {
      type: 'pressable';
      // Names what was tapped. The reader binds 'retry' to re-requesting the failed page, which
      // Compose resolves on its own — no event crosses back to RN.
      action: string;
      backgroundColor?: string;
      cornerRadiusDp?: number;
      paddingHorizontalDp?: number;
      paddingVerticalDp?: number;
      children: SduNode[];
    };

// White bold 20sp title for the header; muted 14sp "Fim do capítulo" label + bold 13sp chapter
// number for the footer; a transparent Gap between chapters (breathing room, no visible band).
const GAP_HEIGHT_DP = 24;
const HEADER_PADDING_DP = 16;
const FOOTER_PADDING_DP = 16;

// Kotlin reads every *Dp field straight into Compose's .dp, so these travel as dp — no density
// conversion here. They were previously multiplied by the screen density on the way out, which
// silently drew the chapter bands at three times the padding these constants name.

// These resolve once, at import time, so the chapter bands do NOT repaint when the theme changes
// until the reader is reopened. Unlike every other screen, the SDU builders are pure functions
// feeding native Compose — no hook can run here — so threading the palette through means changing
// the signature of the whole chain (webtoon.adapter → buildFirstNode/buildLastNode). That is a
// contract change and belongs to plan 028 Task 008, which already opens this boundary to pass
// colours from RN to the reader.
const WHITE = ColorTool.to.hex(colors.text.primary);
const MUTED = ColorTool.to.hex(colors.text.secondary);
const HEADER_FOOTER_BG = ColorTool.to.hex(colors.surface.reading.strip);

function gapNode(): SduNode {
  return { type: 'container', heightDp: GAP_HEIGHT_DP, children: [] };
}

// [firstNode] for a chapter block — the Gap-above (omitted when [hasGapAbove] is false, i.e. the
// first loaded chapter of the window) followed by the chapter's title.
export function buildFirstNode(chapterTitle: string, hasGapAbove: boolean): SduNode {
  const header: SduNode = {
    type: 'container',
    backgroundColor: HEADER_FOOTER_BG,
    paddingDp: HEADER_PADDING_DP,
    children: [{ type: 'text', text: chapterTitle, color: WHITE, fontSize: text.size[6], bold: true, maxLines: 2 }],
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
    paddingDp: FOOTER_PADDING_DP,
    children: [
      { type: 'text', text: `${endOfChapterLabel} `, color: MUTED, fontSize: text.size[3] },
      { type: 'text', text: chapterNumber, color: WHITE, fontSize: text.size[3], bold: true },
    ],
  };
}

// ── Page placeholders ────────────────────────────────────────────────────────
//
// What a single page draws while it loads, and when it fails. Unlike the chapter bands above,
// these take their tokens as ARGUMENTS rather than reading the module-level constants: the caller
// is a component with useTheme() in hand, so switching theme rebuilds these nodes and the native
// side repaints without reopening the reader.

// The spinner is a glyph like any other, so it takes its size from the icon scale rather than a
// number of its own.
const SPINNER_SIZE = icon.size[9];

export interface PageNodeTokens {
  spinner: RgbColor;
  errorText: RgbColor;
  retryBackground: RgbColor;
  retryText: RgbColor;
}

export function buildPageLoadingNode(tokens: Pick<PageNodeTokens, 'spinner'>): SduNode {
  return { type: 'spinner', color: ColorTool.to.hex(tokens.spinner), sizeDp: SPINNER_SIZE };
}

/**
 * The error placeholder: a message and a retry control.
 *
 * `message` carries `{code}` and `placeholder` tells Kotlin to swap it — but only a decode failure
 * has a code, so Kotlin leaves the token alone for a network error. That is why the caller passes
 * the WithCode wording: the variant without it would have nothing to substitute into.
 */
export function buildPageErrorNode({
  message,
  retryLabel,
  tokens,
}: {
  message: string;
  retryLabel: string;
  tokens: PageNodeTokens;
}): SduNode {
  return {
    type: 'container',
    align: 'center',
    gapDp: spacing[5],
    children: [
      {
        type: 'text',
        text: message,
        color: ColorTool.to.hex(tokens.errorText),
        fontSize: text.size[3],
        placeholder: '{code}',
      },
      {
        type: 'pressable',
        action: 'retry',
        backgroundColor: ColorTool.to.hex(tokens.retryBackground),
        cornerRadiusDp: radius.medium,
        paddingHorizontalDp: spacing[7],
        paddingVerticalDp: spacing[5],
        children: [
          {
            type: 'text',
            text: retryLabel,
            color: ColorTool.to.hex(tokens.retryText),
            fontSize: text.size[3],
            bold: true,
          },
        ],
      },
    ],
  };
}
