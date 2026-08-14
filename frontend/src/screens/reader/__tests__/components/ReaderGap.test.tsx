import React from 'react';
import { render } from '@testing-library/react-native';
import { ReaderGap } from '../../components/ReaderGap';

describe('ReaderGap', () => {
  it('renderiza uma View com a altura imposta', () => {
    const { getByTestId } = render(<ReaderGap height={130} />);

    expect(getByTestId('reader-gap').props.style).toEqual({ height: 130 });
  });
});
