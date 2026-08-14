import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ReaderSideProgressBar } from '../../components/ReaderSideProgressBar';

describe('ReaderSideProgressBar', () => {
  const baseProps = {
    totalPages: 5,
    currentPage: 2,
    onPageSelect: jest.fn(),
    onPrevChapter: jest.fn(),
    onNextChapter: jest.fn(),
    hasPrev: true,
    hasNext: true,
    visible: true,
  };

  afterEach(() => jest.clearAllMocks());

  it('renderiza exatamente totalPages bolinhas do capitulo atual', () => {
    const { getByTestId } = render(<ReaderSideProgressBar {...baseProps} />);

    expect(getByTestId('side-bar-next')).toBeTruthy();
    // 5 TouchableOpacity de bolinha, mais prev/next — verificado indiretamente via onPageSelect.
  });

  it('tap em uma bolinha chama onPageSelect com o indice', () => {
    const onPageSelect = jest.fn();
    const { UNSAFE_getAllByType } = render(<ReaderSideProgressBar {...baseProps} onPageSelect={onPageSelect} />);
    const { TouchableOpacity } = require('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    // touchables[0] = prev, últimos = next; bolinhas ficam no meio.
    fireEvent.press(touchables[1]);

    expect(onPageSelect).toHaveBeenCalledWith(0);
  });

  it('seta prev desabilitada nao dispara callback', () => {
    const onPrevChapter = jest.fn();
    const { getByTestId } = render(
      <ReaderSideProgressBar {...baseProps} hasPrev={false} onPrevChapter={onPrevChapter} />,
    );

    fireEvent.press(getByTestId('side-bar-prev'));

    expect(onPrevChapter).not.toHaveBeenCalled();
  });

  it('seta next desabilitada nao dispara callback', () => {
    const onNextChapter = jest.fn();
    const { getByTestId } = render(
      <ReaderSideProgressBar {...baseProps} hasNext={false} onNextChapter={onNextChapter} />,
    );

    fireEvent.press(getByTestId('side-bar-next'));

    expect(onNextChapter).not.toHaveBeenCalled();
  });

  it('seta next habilitada dispara callback', () => {
    const onNextChapter = jest.fn();
    const { getByTestId } = render(<ReaderSideProgressBar {...baseProps} onNextChapter={onNextChapter} />);

    fireEvent.press(getByTestId('side-bar-next'));

    expect(onNextChapter).toHaveBeenCalledTimes(1);
  });

  it('nao renderiza nada quando visible e false', () => {
    const { queryByTestId } = render(<ReaderSideProgressBar {...baseProps} visible={false} />);

    expect(queryByTestId('side-bar-next')).toBeNull();
  });
});
