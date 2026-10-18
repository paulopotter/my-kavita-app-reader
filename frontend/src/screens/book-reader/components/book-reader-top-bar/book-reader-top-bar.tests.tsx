import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BookReaderTopBar } from './book-reader-top-bar.component';

function setup(over: Partial<React.ComponentProps<typeof BookReaderTopBar>> = {}) {
  const onBack = jest.fn();
  const utils = render(
    <BookReaderTopBar seriesName="Leveling with gods" onBack={onBack} backLabel="Voltar" visible {...over} />,
  );
  return { ...utils, onBack };
}

describe('BookReaderTopBar', () => {
  it('renders nothing when not visible', () => {
    expect(setup({ visible: false }).toJSON()).toBeNull();
  });

  it('shows the series name', () => {
    const { getByText } = setup();
    expect(getByText('Leveling with gods')).toBeTruthy();
  });

  it('shows the page indicator only when it is given one', () => {
    expect(setup({ pageIndicatorText: 'Página 2 de 5' }).getByText('Página 2 de 5')).toBeTruthy();
    expect(setup().queryByText(/Página/)).toBeNull();
  });

  it('fires onBack from the back button', () => {
    const { getByLabelText, onBack } = setup();
    fireEvent.press(getByLabelText('Voltar'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
