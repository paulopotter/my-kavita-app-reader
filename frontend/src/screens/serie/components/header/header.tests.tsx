import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { serieEvents, type Serie } from '../../../../shared';
import { getStrings } from '../../../../shared/i18n/strings';
import { Header } from './header.component';

// Dumb component: renders cover/name/description/chips and the `actionLabel` string it's handed,
// and fires onActionPress. The label composition ("start" vs. "continue ch. N" vs. "reread")
// lives in useSerie and is tested in hooks/serie.tests.ts.

const t = getStrings('pt-BR');

function makeSerie(overrides: Partial<Serie> = {}): Serie {
  return {
    id: '10',
    name: 'One Piece',
    coverImage: { url: 'https://example.invalid/cover.jpg' } as Serie['coverImage'],
    chapters: [],
    resolvedAtEpochMs: 0,
    server: {} as Serie['server'],
    events: serieEvents({ seriesId: '10' }),
    ...overrides,
  };
}

// A real RN <Text> only knows its own line count once it lays out — a unit test never does real
// layout, so this simulates what RN would fire by calling onTextLayout directly with a given
// line count, same as other tests already do for native layout callbacks.
function fireTextLayout(element: unknown, lineCount: number) {
  fireEvent(element as never, 'textLayout', { nativeEvent: { lines: Array.from({ length: lineCount }, () => ({})) } });
}

describe('Header', () => {
  it('renders the series name', () => {
    const { getByText } = render(<Header serie={makeSerie()} actionLabel="Começar leitura" onActionPress={jest.fn()} t={t} />);
    expect(getByText('One Piece')).toBeTruthy();
  });

  it('renders the description from metadata', () => {
    const serie = makeSerie({ metadata: { description: 'Piratas em busca de tesouro', genres: [], tags: [] } });
    const { getByText } = render(<Header serie={serie} actionLabel="x" onActionPress={jest.fn()} t={t} />);
    expect(getByText('Piratas em busca de tesouro')).toBeTruthy();
  });

  it('renders no description text when metadata has none', () => {
    const serie = makeSerie({ metadata: { genres: [], tags: [] } });
    const { queryByText } = render(<Header serie={serie} actionLabel="x" onActionPress={jest.fn()} t={t} />);
    expect(queryByText('Piratas em busca de tesouro')).toBeNull();
  });

  it('renders genre/tag chips', () => {
    const serie = makeSerie({
      metadata: { genres: [{ id: 'g1', name: 'Aventura' }], tags: [{ id: 't1', name: 'Piratas' }] },
    });
    const { getByText } = render(<Header serie={serie} actionLabel="x" onActionPress={jest.fn()} t={t} />);
    expect(getByText('Aventura')).toBeTruthy();
    expect(getByText('Piratas')).toBeTruthy();
  });

  it('renders the action label it is given and fires onActionPress when tapped', () => {
    const onActionPress = jest.fn();
    const { getByText } = render(
      <Header serie={makeSerie()} actionLabel="Continuar leitura - Cap. 5" onActionPress={onActionPress} t={t} />,
    );
    fireEvent.press(getByText('Continuar leitura - Cap. 5'));
    expect(onActionPress).toHaveBeenCalledTimes(1);
  });

  // ── description clamping ("read more" / "read less") ───────────────────────
  describe('description clamping', () => {
    it('the "read more" toggle stays disabled (a tap does nothing) when the description fits within the clamp', () => {
      const serie = makeSerie({ metadata: { description: 'Short description', genres: [], tags: [] } });
      const { getByText, queryByText } = render(<Header serie={serie} actionLabel="x" onActionPress={jest.fn()} t={t} />);
      fireTextLayout(getByText('Short description'), 2);

      // The toggle is always in the tree (reserved space — no late-mount layout shift, see
      // header.component.tsx's own doc), but disabled when there's nothing to expand: tapping it
      // must not flip to "read less".
      fireEvent.press(getByText(t.seriesDetailDescriptionReadMore));
      expect(queryByText(t.seriesDetailDescriptionReadLess)).toBeNull();
    });

    it('shows "read more" once the description overflows the clamp', () => {
      const serie = makeSerie({ metadata: { description: 'A very long description', genres: [], tags: [] } });
      const { getByText } = render(<Header serie={serie} actionLabel="x" onActionPress={jest.fn()} t={t} />);
      fireTextLayout(getByText('A very long description'), 7);
      expect(getByText(t.seriesDetailDescriptionReadMore)).toBeTruthy();
    });

    it('tapping "read more" expands the description and swaps the toggle to "read less"', () => {
      const serie = makeSerie({ metadata: { description: 'A very long description', genres: [], tags: [] } });
      const { getByText, queryByText } = render(<Header serie={serie} actionLabel="x" onActionPress={jest.fn()} t={t} />);
      fireTextLayout(getByText('A very long description'), 7);

      fireEvent.press(getByText(t.seriesDetailDescriptionReadMore));

      expect(getByText(t.seriesDetailDescriptionReadLess)).toBeTruthy();
      expect(queryByText(t.seriesDetailDescriptionReadMore)).toBeNull();
    });

    it('tapping "read less" collapses it back', () => {
      const serie = makeSerie({ metadata: { description: 'A very long description', genres: [], tags: [] } });
      const { getByText } = render(<Header serie={serie} actionLabel="x" onActionPress={jest.fn()} t={t} />);
      fireTextLayout(getByText('A very long description'), 7);
      fireEvent.press(getByText(t.seriesDetailDescriptionReadMore));

      fireEvent.press(getByText(t.seriesDetailDescriptionReadLess));

      expect(getByText(t.seriesDetailDescriptionReadMore)).toBeTruthy();
    });
  });
});
