import React from 'react';
import { render } from '@testing-library/react-native';
import { ReaderThinProgressBar } from './reader-thin-progress-bar.component';

// The fill's own style is an array [staticStyle, { position, <axis>, <axisSize> }] — this reads
// the inline object (index 1) regardless of which static style object preceded it, so a test
// doesn't need to know the exact vertical/horizontal style reference.
function fillInlineStyle(fill: { props: { style: unknown[] } }) {
  return fill.props.style[1] as Record<string, unknown>;
}

describe('ReaderThinProgressBar', () => {
  it('defaults to a vertical bar on the right edge, filling top-to-bottom', () => {
    const { getByTestId } = render(<ReaderThinProgressBar fraction={0.5} />);
    const fill = getByTestId('reader-thin-progress-fill');
    const style = fillInlineStyle(fill);
    expect(style.height).toBe('50%');
    expect(style.top).toBe(0);
    expect(style.width).toBeUndefined();
  });

  it('position="left" stays vertical, filling top-to-bottom', () => {
    const { getByTestId } = render(<ReaderThinProgressBar fraction={0.3} position="left" />);
    const style = fillInlineStyle(getByTestId('reader-thin-progress-fill'));
    expect(style.height).toBe('30%');
  });

  it('position="top" switches to a horizontal bar, filling left-to-right', () => {
    const { getByTestId } = render(<ReaderThinProgressBar fraction={0.75} position="top" />);
    const style = fillInlineStyle(getByTestId('reader-thin-progress-fill'));
    expect(style.width).toBe('75%');
    expect(style.left).toBe(0);
    expect(style.height).toBeUndefined();
  });

  it('position="bottom" is also horizontal, filling left-to-right', () => {
    const { getByTestId } = render(<ReaderThinProgressBar fraction={0.1} position="bottom" />);
    const style = fillInlineStyle(getByTestId('reader-thin-progress-fill'));
    expect(style.width).toBe('10%');
  });

  it('clamps a fraction above 1', () => {
    const { getByTestId } = render(<ReaderThinProgressBar fraction={1.5} position="top" />);
    const style = fillInlineStyle(getByTestId('reader-thin-progress-fill'));
    expect(style.width).toBe('100%');
  });

  it('clamps a fraction below 0', () => {
    const { getByTestId } = render(<ReaderThinProgressBar fraction={-0.2} />);
    const style = fillInlineStyle(getByTestId('reader-thin-progress-fill'));
    expect(style.height).toBe('0%');
  });
});
