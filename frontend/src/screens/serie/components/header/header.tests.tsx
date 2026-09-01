import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { Serie } from '../../../../shared';
import { Header } from './header.component';

// Dumb component: renders cover/name/description/chips and the `actionLabel` string it's handed,
// and fires onActionPress. The label composition ("start" vs. "continue ch. N" vs. "reread")
// lives in useSerie and is tested in hooks/serie.tests.ts.

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

describe('Header', () => {
  it('renders the series name', () => {
    const { getByText } = render(<Header serie={makeSerie()} actionLabel="Começar leitura" onActionPress={jest.fn()} />);
    expect(getByText('One Piece')).toBeTruthy();
  });

  it('renders the description from metadata', () => {
    const serie = makeSerie({ metadata: { description: 'Piratas em busca de tesouro', genres: [], tags: [] } });
    const { getByText } = render(<Header serie={serie} actionLabel="x" onActionPress={jest.fn()} />);
    expect(getByText('Piratas em busca de tesouro')).toBeTruthy();
  });

  it('renders no description text when metadata has none', () => {
    const serie = makeSerie({ metadata: { genres: [], tags: [] } });
    const { queryByText } = render(<Header serie={serie} actionLabel="x" onActionPress={jest.fn()} />);
    expect(queryByText('Piratas em busca de tesouro')).toBeNull();
  });

  it('renders genre/tag chips', () => {
    const serie = makeSerie({
      metadata: { genres: [{ id: 'g1', name: 'Aventura' }], tags: [{ id: 't1', name: 'Piratas' }] },
    });
    const { getByText } = render(<Header serie={serie} actionLabel="x" onActionPress={jest.fn()} />);
    expect(getByText('Aventura')).toBeTruthy();
    expect(getByText('Piratas')).toBeTruthy();
  });

  it('renders the action label it is given and fires onActionPress when tapped', () => {
    const onActionPress = jest.fn();
    const { getByText } = render(
      <Header serie={makeSerie()} actionLabel="Continuar leitura - Cap. 5" onActionPress={onActionPress} />,
    );
    fireEvent.press(getByText('Continuar leitura - Cap. 5'));
    expect(onActionPress).toHaveBeenCalledTimes(1);
  });
});
