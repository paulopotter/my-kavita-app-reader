import React from 'react';
import { render } from '@testing-library/react-native';
import { ReaderOfflineBanner } from '../../components/ReaderOfflineBanner';

describe('ReaderOfflineBanner', () => {
  it('renderiza mensagem quando visible e true', () => {
    const { getByText } = render(<ReaderOfflineBanner visible />);

    expect(getByText('Sem conexão')).toBeTruthy();
  });

  it('nao renderiza nada quando visible e false', () => {
    const { queryByText } = render(<ReaderOfflineBanner visible={false} />);

    expect(queryByText('Sem conexão')).toBeNull();
  });
});
