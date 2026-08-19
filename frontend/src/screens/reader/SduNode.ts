// Server-Driven UI: describes non-page reader content (what used to be fixed Header/Footer/Gap
// Kotlin Composables) as plain data RN sends over the bridge — see
// android/features/.../SduNode.kt for the Kotlin-side generic interpreter (SduNodeView), which
// never hardcodes what a "header" looks like, only how to draw a container/text/spacer. Any new
// visual composition (two differently-styled texts, a colored band) is just a new tree here, with
// zero Kotlin changes required.
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
