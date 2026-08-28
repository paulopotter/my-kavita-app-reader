import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getStrings } from '../../../../shared/i18n/strings';
import type { Serie, SerieChapter } from '../../../../shared';
import { Header } from './header.component';

const t = getStrings('pt-BR');

function makeSerie(overrides: Partial<Serie> = {}): Serie {
  return {
    id: '10',
    name: 'One Piece',
    coverImage: { url: 'https://example.invalid/cover.jpg' } as Serie['coverImage'],
    chapters: [],
    resolvedAtEpochMs: 0,
    server: {} as Serie['server'],
    ...overrides,
  };
}

function makeChapter(overrides: Partial<SerieChapter> = {}): SerieChapter {
  return {
    id: '1',
    seriesId: '10',
    title: '',
    number: 1,
    readStatus: 'UNREAD',
    coverImage: {} as SerieChapter['coverImage'],
    pages: { list: [] },
    resolvedAtEpochMs: 0,
    server: {} as SerieChapter['server'],
    action: { method: 'navigate', route: 'reader/:seriesId/:chapterId', params: {} },
    ...overrides,
  };
}

describe('Header', () => {
  it('renders the series name', () => {
    const { getByText } = render(<Header serie={makeSerie()} continueChapter={null} t={t} onActionPress={jest.fn()} />);
    expect(getByText('One Piece')).toBeTruthy();
  });

  it('renders the description from metadata', () => {
    const serie = makeSerie({ metadata: { description: 'Piratas em busca de tesouro', genres: [], tags: [] } });
    const { getByText } = render(<Header serie={serie} continueChapter={null} t={t} onActionPress={jest.fn()} />);
    expect(getByText('Piratas em busca de tesouro')).toBeTruthy();
  });

  it('renders no description text when metadata has none', () => {
    const serie = makeSerie({ metadata: { genres: [], tags: [] } });
    const { queryByText } = render(<Header serie={serie} continueChapter={null} t={t} onActionPress={jest.fn()} />);
    expect(queryByText('Piratas em busca de tesouro')).toBeNull();
  });

  it('renders genre/tag chips', () => {
    const serie = makeSerie({
      metadata: { genres: [{ id: 'g1', name: 'Aventura' }], tags: [{ id: 't1', name: 'Piratas' }] },
    });
    const { getByText } = render(<Header serie={serie} continueChapter={null} t={t} onActionPress={jest.fn()} />);
    expect(getByText('Aventura')).toBeTruthy();
    expect(getByText('Piratas')).toBeTruthy();
  });

  it('calls onActionPress when the action button is tapped', () => {
    const onActionPress = jest.fn();
    const chapters = [makeChapter({ readStatus: 'UNREAD' })];
    const serie = makeSerie({ chapters });
    const { getByText } = render(<Header serie={serie} continueChapter={chapters[0]} t={t} onActionPress={onActionPress} />);
    fireEvent.press(getByText(t.seriesDetailStartReading));
    expect(onActionPress).toHaveBeenCalledTimes(1);
  });

  it('shows "start reading" when there are no chapters', () => {
    const { getByText } = render(<Header serie={makeSerie({ chapters: [] })} continueChapter={null} t={t} onActionPress={jest.fn()} />);
    expect(getByText(t.seriesDetailStartReading)).toBeTruthy();
  });

  it('shows "reread" when every chapter is read and there is no continueChapter', () => {
    const chapters = [makeChapter({ readStatus: 'READ' })];
    const serie = makeSerie({ chapters });
    const { getByText } = render(<Header serie={serie} continueChapter={null} t={t} onActionPress={jest.fn()} />);
    expect(getByText(t.seriesDetailRereadFromStart)).toBeTruthy();
  });

  it('shows "continue reading ch. N" using decimalNumber when available', () => {
    const chapters = [makeChapter({ readStatus: 'READ' }), makeChapter({ id: '2', decimalNumber: 2.5, number: 2 })];
    const serie = makeSerie({ chapters });
    const { getByText } = render(<Header serie={serie} continueChapter={chapters[1]} t={t} onActionPress={jest.fn()} />);
    expect(getByText(t.seriesDetailContinueReading.replace('{0}', '2.5'))).toBeTruthy();
  });

  it('falls back to the chapter title when continueChapter has no number', () => {
    const chapters = [makeChapter({ readStatus: 'READ' }), makeChapter({ id: '2', number: undefined, title: 'Especial' })];
    const serie = makeSerie({ chapters });
    const { getByText } = render(<Header serie={serie} continueChapter={chapters[1]} t={t} onActionPress={jest.fn()} />);
    expect(getByText(t.seriesDetailContinueReading.replace('{0}', 'Especial'))).toBeTruthy();
  });
});
