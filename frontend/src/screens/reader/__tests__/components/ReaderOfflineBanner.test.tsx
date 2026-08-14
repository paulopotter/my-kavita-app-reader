import React from 'react';
import { render } from '@testing-library/react-native';
import { getStrings } from '../../../../shared/i18n/strings';
import { ReaderOfflineBanner } from '../../components/ReaderOfflineBanner';

const t = getStrings('pt-BR');

describe('ReaderOfflineBanner', () => {
  it('renderiza mensagem quando visible e true', () => {
    const { getByText } = render(<ReaderOfflineBanner visible t={t} />);

    expect(getByText('Sem conexão')).toBeTruthy();
  });

  it('nao renderiza nada quando visible e false', () => {
    const { queryByText } = render(<ReaderOfflineBanner visible={false} t={t} />);

    expect(queryByText('Sem conexão')).toBeNull();
  });
});
