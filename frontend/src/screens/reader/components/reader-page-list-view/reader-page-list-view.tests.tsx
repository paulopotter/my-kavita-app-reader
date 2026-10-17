import React from 'react';
import { render } from '@testing-library/react-native';
import { ReaderPageListView } from './reader-page-list-view.component';

const block = { chapterId: 'c1', pageUrls: ['u0'], pageAspectRatios: [1.5], firstNode: null, lastNode: null };

describe('ReaderPageListView', () => {
  it('forwards blocks / scroll props verbatim and unwraps the native event payload', () => {
    const onVisiblePageChanged = jest.fn();
    const { getByTestId } = render(
      <ReaderPageListView
        blocks={[block]}
        scrollToChapterId="c1"
        scrollToPageIndex={3}
        onVisiblePageChanged={onVisiblePageChanged}
      />,
    );
    const native = getByTestId('reader-page-list-view');
    expect(native.props.blocks).toEqual([block]);
    expect(native.props.scrollToChapterId).toBe('c1');
    expect(native.props.scrollToPageIndex).toBe(3);

    native.props.onVisiblePageChanged({
      nativeEvent: { chapterId: 'c9', pageIndex: 2, pageFraction: 0.5, chapterFraction: 0.25 },
    });
    expect(onVisiblePageChanged).toHaveBeenCalledWith('c9', 2, 0.5, 0.25);
  });

  it('keeps zoom off unless asked and unwraps the zoom event payload', () => {
    const onZoomChanged = jest.fn();
    const { getByTestId, rerender } = render(
      <ReaderPageListView blocks={[block]} scrollToChapterId={null} scrollToPageIndex={-1} />,
    );
    expect(getByTestId('reader-page-list-view').props.zoomEnabled).toBe(false);
    expect(getByTestId('reader-page-list-view').props.onZoomChanged).toBeUndefined();

    rerender(
      <ReaderPageListView
        blocks={[block]}
        scrollToChapterId={null}
        scrollToPageIndex={-1}
        zoomEnabled
        onZoomChanged={onZoomChanged}
      />,
    );
    const native = getByTestId('reader-page-list-view');
    expect(native.props.zoomEnabled).toBe(true);
    native.props.onZoomChanged({ nativeEvent: { zoomed: true } });
    expect(onZoomChanged).toHaveBeenCalledWith(true);
  });

  it('passes undefined for onVisiblePageChanged when the prop is omitted', () => {
    const { getByTestId } = render(
      <ReaderPageListView blocks={[block]} scrollToChapterId={null} scrollToPageIndex={-1} />,
    );
    expect(getByTestId('reader-page-list-view').props.onVisiblePageChanged).toBeUndefined();
  });
});
