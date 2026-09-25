import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ReaderTopBar } from './reader-top-bar.component';

function setup(over: Partial<React.ComponentProps<typeof ReaderTopBar>> = {}) {
  const onBack = jest.fn();
  const utils = render(
    <ReaderTopBar seriesName="One Piece" chapterTitle="Capítulo 1" onBack={onBack} backLabel="Voltar" visible {...over} />,
  );
  return { ...utils, onBack };
}

describe('ReaderTopBar', () => {
  it('renders nothing when not visible', () => {
    const { toJSON } = setup({ visible: false });
    expect(toJSON()).toBeNull();
  });

  it('renders the series name and chapter title', () => {
    const { getByText } = setup();
    expect(getByText('One Piece')).toBeTruthy();
    expect(getByText('Capítulo 1')).toBeTruthy();
  });

  it('fires onBack when the back button is pressed', () => {
    const { UNSAFE_getByType, onBack } = setup();
    const { TouchableOpacity } = require('react-native');
    fireEvent.press(UNSAFE_getByType(TouchableOpacity));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows the page indicator text when given one', () => {
    const { getByText } = setup({ pageIndicatorText: '3 de 10' });
    expect(getByText('3 de 10')).toBeTruthy();
  });

  it('renders no page indicator when none is given (single-page chapter)', () => {
    const { queryByText } = setup({ pageIndicatorText: undefined });
    expect(queryByText(/de/)).toBeNull();
  });
});
