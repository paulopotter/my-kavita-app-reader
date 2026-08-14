import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ReaderTopBar } from '../../components/ReaderTopBar';

describe('ReaderTopBar', () => {
  it('renderiza nome da serie e titulo do capitulo quando visivel', () => {
    const { getByText } = render(
      <ReaderTopBar seriesName="One Piece" chapterTitle="1. A Chegada" onBack={jest.fn()} visible />,
    );

    expect(getByText('One Piece')).toBeTruthy();
    expect(getByText('1. A Chegada')).toBeTruthy();
  });

  it('nao renderiza nada quando visible e false', () => {
    const { queryByText } = render(
      <ReaderTopBar seriesName="One Piece" chapterTitle="1. A Chegada" onBack={jest.fn()} visible={false} />,
    );

    expect(queryByText('One Piece')).toBeNull();
  });

  it('chama onBack ao tocar na seta', () => {
    const onBack = jest.fn();
    const { getByText } = render(
      <ReaderTopBar seriesName="One Piece" chapterTitle="1. A Chegada" onBack={onBack} visible />,
    );

    fireEvent.press(getByText('‹'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
