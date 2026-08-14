import React from 'react';
import { act, render } from '@testing-library/react-native';
import { PageImage } from '../../components/PageImage';

describe('PageImage', () => {
  it('propaga a altura via onLayout', () => {
    const onLayout = jest.fn();
    const { getByTestId } = render(<PageImage url="https://example/1.jpg" onLayout={onLayout} />);

    getByTestId('page-image-root').props.onLayout({
      nativeEvent: { layout: { height: 812, width: 400, x: 0, y: 0 } },
    });

    expect(onLayout).toHaveBeenCalledWith(812);
  });

  it('esconde o indicador de loading quando a imagem termina de carregar', () => {
    const { getByTestId, queryByTestId, UNSAFE_getByType } = render(
      <PageImage url="https://example/1.jpg" onLayout={jest.fn()} />,
    );

    expect(getByTestId('page-image-root')).toBeTruthy();

    act(() => {
      UNSAFE_getByType(require('react-native').Image).props.onLoadEnd();
    });

    expect(queryByTestId('page-image-loading')).toBeNull();
  });
});
