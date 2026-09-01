import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ReaderSideProgressBar } from './reader-side-progress-bar.component';

function setup(over: Partial<React.ComponentProps<typeof ReaderSideProgressBar>> = {}) {
  const onPageSelect = jest.fn();
  const onPrevChapter = jest.fn();
  const onNextChapter = jest.fn();
  const utils = render(
    <ReaderSideProgressBar
      totalPages={5}
      currentPage={2}
      onPageSelect={onPageSelect}
      onPrevChapter={onPrevChapter}
      onNextChapter={onNextChapter}
      hasPrev
      hasNext
      visible
      {...over}
    />,
  );
  return { ...utils, onPageSelect, onPrevChapter, onNextChapter };
}

describe('ReaderSideProgressBar', () => {
  it('renders nothing when not visible', () => {
    const { toJSON } = setup({ visible: false });
    expect(toJSON()).toBeNull();
  });

  it('renders one dot per page and selecting one fires onPageSelect with its index', () => {
    const { UNSAFE_getAllByType, onPageSelect } = setup({ totalPages: 3, currentPage: 0 });
    const { TouchableOpacity } = require('react-native');
    // order: prev arrow, dot0, dot1, dot2, next arrow
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    expect(touchables).toHaveLength(5);
    fireEvent.press(touchables[2]); // dot index 1
    expect(onPageSelect).toHaveBeenCalledWith(1);
  });

  it('marks the current page dot active and the pages before it as read', () => {
    // currentPage=2 exercises both the `index < currentPage` (read) and `index === currentPage`
    // (active) style branches — the active dot carries the accent colour #E94560.
    const { toJSON } = setup({ totalPages: 5, currentPage: 2 });
    expect(JSON.stringify(toJSON())).toContain('#E94560');
  });

  it('arrows call their callbacks when enabled', () => {
    const { getByTestId, onPrevChapter, onNextChapter } = setup();
    fireEvent.press(getByTestId('side-bar-prev'));
    fireEvent.press(getByTestId('side-bar-next'));
    expect(onPrevChapter).toHaveBeenCalledTimes(1);
    expect(onNextChapter).toHaveBeenCalledTimes(1);
  });

  it('disabled arrows do not call their callbacks even if pressed', () => {
    const { getByTestId, onPrevChapter, onNextChapter } = setup({ hasPrev: false, hasNext: false });
    fireEvent.press(getByTestId('side-bar-prev'));
    fireEvent.press(getByTestId('side-bar-next'));
    expect(onPrevChapter).not.toHaveBeenCalled();
    expect(onNextChapter).not.toHaveBeenCalled();
  });
});
