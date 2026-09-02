import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SeriesCard, type SeriesCardProps } from './series-card.component';

function props(over: Partial<SeriesCardProps> = {}): SeriesCardProps {
  return {
    id: 's1',
    name: 'Some Series',
    coverUrl: 'http://cover',
    progressFraction: 0.5,
    progressLabel: '50%',
    isFollowed: false,
    onToggleFollow: jest.fn(),
    onPress: jest.fn(),
    ...over,
  };
}

describe('SeriesCard', () => {
  it('renders name and progress label', () => {
    const { getByText } = render(<SeriesCard {...props()} />);
    expect(getByText('Some Series')).toBeTruthy();
    expect(getByText('50%')).toBeTruthy();
  });

  it('renders the chapter-count label when provided', () => {
    const { getByText, queryByText } = render(<SeriesCard {...props({ chapterCountLabel: '3/12 caps.' })} />);
    expect(getByText('3/12 caps.')).toBeTruthy();
    const { queryByText: q2 } = render(<SeriesCard {...props()} />);
    expect(q2('3/12 caps.')).toBeNull();
    expect(queryByText).toBeDefined();
  });

  it('renders publication and errors badges only when provided', () => {
    const { getByText } = render(
      <SeriesCard {...props({ publicationLabel: 'Ongoing', errorsLabel: 'Errors' })} />,
    );
    expect(getByText('Ongoing')).toBeTruthy();
    expect(getByText('Errors')).toBeTruthy();

    const { queryByText } = render(<SeriesCard {...props()} />);
    expect(queryByText('Ongoing')).toBeNull();
    expect(queryByText('Errors')).toBeNull();
  });

  it('renders the downloaded label only when provided', () => {
    const { getByText } = render(<SeriesCard {...props({ downloadedLabel: '12/40 caps.' })} />);
    expect(getByText('12/40 caps.')).toBeTruthy();
  });

  it('fires onPress with the id', () => {
    const onPress = jest.fn();
    const { getByText } = render(<SeriesCard {...props({ onPress })} />);
    fireEvent.press(getByText('Some Series'));
    expect(onPress).toHaveBeenCalledWith('s1');
  });

  it('fires onToggleFollow with the id from the star', () => {
    const onToggleFollow = jest.fn();
    const { UNSAFE_getAllByType } = render(<SeriesCard {...props({ onToggleFollow })} />);
    // The star is the first nested TouchableOpacity inside the card.
    const { TouchableOpacity } = require('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(touchables[1]);
    expect(onToggleFollow).toHaveBeenCalledWith('s1');
  });

  it('is a memoized component (React.memo) — the Library re-order relies on the shallow-prop skip', () => {
    // React.memo returns a special element type, not a plain function component.
    expect(typeof SeriesCard).toBe('object');
    expect((SeriesCard as unknown as { $$typeof?: symbol }).$$typeof).toBe(Symbol.for('react.memo'));
  });
});
