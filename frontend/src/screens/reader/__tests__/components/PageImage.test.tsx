import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { Image } from 'react-native';
import { PageImage } from '../../components/PageImage';

describe('PageImage', () => {
  beforeEach(() => {
    jest.spyOn(Image, 'getSize').mockImplementation((_uri, success) => {
      success(800, 1200);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('propaga a altura via onLayout', async () => {
    const onLayout = jest.fn();
    const { getByTestId } = render(<PageImage url="https://example/1.jpg" onLayout={onLayout} />);

    await act(async () => {
      getByTestId('page-image-root').props.onLayout({
        nativeEvent: { layout: { height: 812, width: 400, x: 0, y: 0 } },
      });
    });

    expect(onLayout).toHaveBeenCalledWith(812);
  });

  it('esconde o indicador de loading quando a imagem termina de carregar', async () => {
    const { getByTestId, queryByTestId, UNSAFE_getByType } = render(
      <PageImage url="https://example/1.jpg" onLayout={jest.fn()} />,
    );

    expect(getByTestId('page-image-root')).toBeTruthy();

    await act(async () => {
      UNSAFE_getByType(Image).props.onLoadEnd();
    });

    expect(queryByTestId('page-image-loading')).toBeNull();
  });

  it('calcula a altura a partir do aspect ratio real da imagem', async () => {
    const { getByTestId } = render(<PageImage url="https://example/1.jpg" onLayout={jest.fn()} />);

    await waitFor(() => {
      const style = getByTestId('page-image-root').props.style;
      const flattened = Array.isArray(style) ? Object.assign({}, ...style) : style;
      expect(flattened.height).toBeGreaterThan(0);
    });
  });
});
