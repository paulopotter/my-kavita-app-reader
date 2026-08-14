import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { PageImage } from '../../components/PageImage';

const mockUseImage = jest.fn();

jest.mock('@shopify/react-native-skia', () => {
  const mock = jest.requireActual('@shopify/react-native-skia/lib/commonjs/mock').Mock();
  return {
    ...mock,
    useImage: (...args: unknown[]) => mockUseImage(...args),
  };
});

function makeSkImage(width: number, height: number) {
  return { width: () => width, height: () => height };
}

describe('PageImage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('decodeReal=true (janela ativa)', () => {
    it('propaga a altura via onLayout', async () => {
      mockUseImage.mockReturnValue(makeSkImage(800, 1200));
      const onLayout = jest.fn();
      const { getByTestId } = render(<PageImage url="https://example/1.jpg" decodeReal onLayout={onLayout} />);

      await act(async () => {
        getByTestId('page-image-root').props.onLayout({
          nativeEvent: { layout: { height: 812, width: 400, x: 0, y: 0 } },
        });
      });

      expect(onLayout).toHaveBeenCalledWith(812);
    });

    it('mostra o indicador de loading enquanto a imagem ainda nao decodificou', () => {
      mockUseImage.mockReturnValue(null);
      const { getByTestId } = render(<PageImage url="https://example/1.jpg" decodeReal onLayout={jest.fn()} />);

      expect(getByTestId('page-image-loading')).toBeTruthy();
    });

    it('esconde o indicador de loading e desenha o Canvas quando a imagem decodifica', () => {
      mockUseImage.mockReturnValue(makeSkImage(800, 1200));
      const { queryByTestId } = render(<PageImage url="https://example/1.jpg" decodeReal onLayout={jest.fn()} />);

      expect(queryByTestId('page-image-loading')).toBeNull();
    });

    it('calcula a altura a partir do aspect ratio real da imagem', async () => {
      mockUseImage.mockReturnValue(makeSkImage(800, 1200));
      const { getByTestId } = render(<PageImage url="https://example/1.jpg" decodeReal onLayout={jest.fn()} />);

      await waitFor(() => {
        const style = getByTestId('page-image-root').props.style;
        const flattened = Array.isArray(style) ? Object.assign({}, ...style) : style;
        expect(flattened.height).toBeGreaterThan(0);
      });
    });
  });

  describe('decodeReal=false (fora da janela ativa)', () => {
    it('mostra placeholder sem chamar useImage (nao monta Canvas do Skia)', () => {
      const { getByTestId } = render(<PageImage url="https://example/1.jpg" decodeReal={false} onLayout={jest.fn()} />);

      expect(getByTestId('page-image-loading')).toBeTruthy();
      expect(mockUseImage).not.toHaveBeenCalled();
    });

    it('propaga a altura via onLayout mesmo em placeholder', async () => {
      const onLayout = jest.fn();
      const { getByTestId } = render(
        <PageImage url="https://example/1.jpg" decodeReal={false} onLayout={onLayout} />,
      );

      await act(async () => {
        getByTestId('page-image-root').props.onLayout({
          nativeEvent: { layout: { height: 500, width: 400, x: 0, y: 0 } },
        });
      });

      expect(onLayout).toHaveBeenCalledWith(500);
    });
  });
});
