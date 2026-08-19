import React from 'react';
import { render } from '@testing-library/react-native';
import { ReaderOverlayFooter } from '../../components/ReaderOverlayFooter';

describe('ReaderOverlayFooter', () => {
  it('renderiza a area reservada quando visivel', () => {
    const { getByTestId } = render(<ReaderOverlayFooter visible />);

    expect(getByTestId('reader-overlay-footer')).toBeTruthy();
  });

  it('nao renderiza nada quando visible e false', () => {
    const { queryByTestId } = render(<ReaderOverlayFooter visible={false} />);

    expect(queryByTestId('reader-overlay-footer')).toBeNull();
  });
});
