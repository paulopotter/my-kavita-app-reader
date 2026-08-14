import React from 'react';
import { render } from '@testing-library/react-native';
import { ReaderThinProgressBar } from '../../components/ReaderThinProgressBar';

describe('ReaderThinProgressBar', () => {
  it('aplica a fracao como altura percentual (barra vertical)', () => {
    const { getByTestId } = render(<ReaderThinProgressBar fraction={0.42} />);

    const fill = getByTestId('reader-thin-progress-fill');
    expect(fill.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ height: '42%' })]));
  });

  it('clampa fracao acima de 1', () => {
    const { getByTestId } = render(<ReaderThinProgressBar fraction={1.5} />);

    const fill = getByTestId('reader-thin-progress-fill');
    expect(fill.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ height: '100%' })]));
  });

  it('clampa fracao negativa', () => {
    const { getByTestId } = render(<ReaderThinProgressBar fraction={-0.5} />);

    const fill = getByTestId('reader-thin-progress-fill');
    expect(fill.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ height: '0%' })]));
  });
});
