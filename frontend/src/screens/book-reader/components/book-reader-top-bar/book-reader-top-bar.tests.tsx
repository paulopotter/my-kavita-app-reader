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

  it('makes the series name a link to the series, with its own label, when given a way to go there', () => {
    const onSeriesPress = jest.fn();
    const { getByLabelText } = setup({ onSeriesPress, seriesLabel: 'Ir para a obra' });
    fireEvent.press(getByLabelText('Ir para a obra'));
    expect(onSeriesPress).toHaveBeenCalledTimes(1);
  });

  it('leaves the series name plain when there is nowhere to go', () => {
    expect(setup().queryByRole('link')).toBeNull();
  });
});
