import { buildPageErrorNode, buildPageLoadingNode, type SduNode } from './reader-sdu';
import type { RgbColor } from '../../shared/theme';

const tokens: Record<'spinner' | 'errorText' | 'retryBackground' | 'retryText', RgbColor> = {
  spinner: 'rgb(1, 2, 3)',
  errorText: 'rgb(16, 32, 48)',
  retryBackground: 'rgb(255, 0, 128)',
  retryText: 'rgb(0, 0, 0)',
};

// Walks the tree the way Kotlin's interpreter does, so a test asserts on what actually reaches it.
function find(node: SduNode, type: SduNode['type']): SduNode | undefined {
  if (node.type === type) {return node;}
  const children = 'children' in node ? node.children : [];
  for (const child of children) {
    const hit = find(child, type);
    if (hit) {return hit;}
  }
  return undefined;
}

describe('page loading node', () => {
  it('paints the spinner with the colour it is given', () => {
    // Native parseColor throws on rgb(), so the token crosses the boundary as hex.
    expect(buildPageLoadingNode({ spinner: tokens.spinner })).toMatchObject({
      type: 'spinner',
      color: '#010203',
    });
  });
});

describe('page error node', () => {
  const node = buildPageErrorNode({ message: 'Failed ({code})', retryLabel: 'Retry', tokens });

  it('carries the message and the retry label as given', () => {
    const text = find(node, 'text');
    expect(text).toMatchObject({ text: 'Failed ({code})', color: '#102030' });

    const pressable = find(node, 'pressable');
    expect(pressable).toMatchObject({ action: 'retry', backgroundColor: '#FF0080' });
  });

  // Kotlin substitutes the token only for a decode failure; declaring it is what permits that.
  it('declares {code} as the placeholder, so Kotlin may swap it', () => {
    expect(find(node, 'text')).toMatchObject({ placeholder: '{code}' });
  });

  // The whole point of taking tokens as arguments rather than reading them at import time.
  it('rebuilds with a different palette, which is what lets the theme reach native', () => {
    const other = buildPageErrorNode({
      message: 'x',
      retryLabel: 'y',
      tokens: { ...tokens, errorText: 'rgb(9, 9, 9)' },
    });
    expect(find(other, 'text')).toMatchObject({ color: '#090909' });
  });

  it('names the retry action exactly as the Kotlin side expects', () => {
    // ReaderPageList.RETRY_ACTION — a rename on either side has to break a test, not the app.
    expect(find(node, 'pressable')).toMatchObject({ action: 'retry' });
  });
});
