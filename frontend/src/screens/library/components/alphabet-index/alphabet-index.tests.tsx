import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AlphabetIndex } from './alphabet-index.component';

describe('AlphabetIndex', () => {
  it('renders nothing when there are no entries', () => {
    const { toJSON } = render(<AlphabetIndex entries={[]} onJump={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });

  it('renders one row per letter', () => {
    const { getByText } = render(
      <AlphabetIndex entries={[['A', 0], ['M', 12], ['Z', 40]]} onJump={jest.fn()} />,
    );
    expect(getByText('A')).toBeTruthy();
    expect(getByText('M')).toBeTruthy();
    expect(getByText('Z')).toBeTruthy();
  });

  it('fires onJump with the row index of the tapped letter', () => {
    const onJump = jest.fn();
    const { getByText } = render(
      <AlphabetIndex entries={[['A', 0], ['M', 12]]} onJump={onJump} />,
    );
    fireEvent.press(getByText('M'));
    expect(onJump).toHaveBeenCalledWith(12);
  });
});
