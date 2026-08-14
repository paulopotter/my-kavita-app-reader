import React, { useEffect } from 'react';
import { ActivityIndicator, Dimensions, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Canvas, Image as SkiaImage, useImage } from '@shopify/react-native-skia';

interface Props {
  url: string;
  onLayout: (height: number) => void;
}

const screenWidth = Dimensions.get('window').width;

export function PageImage({ url, onLayout }: Props) {
  const image = useImage(url);

  // O decoder de imagem nativo do RN (Fresco/Android) lê dimensões erradas para WebP muito
  // altos (páginas de webtoon podem passar de 10000px), reportando larguras minúsculas e
  // deixando a imagem esticada/pixelada. O Skia decodifica corretamente e expõe as
  // dimensões reais via image.width()/height().
  const naturalWidth = image?.width() ?? 0;
  const naturalHeight = image?.height() ?? 0;
  const computedHeight = naturalWidth > 0 ? (naturalHeight / naturalWidth) * screenWidth : null;

  useEffect(() => {
    if (image) {
      console.log(
        `[PageImage] url=${url} naturalWidth=${naturalWidth} naturalHeight=${naturalHeight} screenWidth=${screenWidth}`,
      );
    }
  }, [image, url, naturalWidth, naturalHeight]);

  const handleLayout = (event: LayoutChangeEvent) => {
    onLayout(event.nativeEvent.layout.height);
  };

  return (
    <View
      testID="page-image-root"
      style={[styles.root, computedHeight != null && { height: computedHeight }]}
      onLayout={handleLayout}
    >
      {image && computedHeight != null ? (
        <Canvas style={styles.canvas}>
          <SkiaImage image={image} x={0} y={0} width={screenWidth} height={computedHeight} fit="contain" />
        </Canvas>
      ) : (
        <View testID="page-image-loading" style={styles.loadingOverlay}>
          <ActivityIndicator color="#E94560" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', minHeight: 400, backgroundColor: '#000000' },
  canvas: { width: '100%', height: '100%' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
