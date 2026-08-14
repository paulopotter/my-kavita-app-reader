import React, { useEffect } from 'react';
import { ActivityIndicator, Dimensions, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Canvas, Image as SkiaImage, useImage } from '@shopify/react-native-skia';

interface Props {
  url: string;
  decodeReal: boolean;
  onLayout: (height: number) => void;
}

const screenWidth = Dimensions.get('window').width;

// O decoder de imagem nativo do RN (Fresco/Android) lê dimensões erradas E distorce o
// conteúdo de WebPs muito altos (páginas de webtoon podem passar de 10000px de altura) —
// o Skia decodifica corretamente e desenha via <Canvas>. Só que montar um <Canvas> por
// célula da lista virtualizada faz o app disputar o mesmo contexto EGL entre si e abortar
// nativamente (SIGABRT no RenderThread) sob scroll rápido. Por isso o Canvas real só é
// montado para páginas dentro de uma janela pequena ao redor da página visível
// (decodeReal=true, controlado pelo ReaderScreen) — as demais mostram um placeholder sem
// tocar em useImage/Canvas, mantendo no máximo poucas superfícies EGL vivas por vez.
export function PageImage({ url, decodeReal, onLayout }: Props) {
  const handleLayout = (event: LayoutChangeEvent) => {
    onLayout(event.nativeEvent.layout.height);
  };

  if (!decodeReal) {
    return (
      <View testID="page-image-root" style={styles.root} onLayout={handleLayout}>
        <View testID="page-image-loading" style={styles.loadingOverlay}>
          <ActivityIndicator color="#E94560" />
        </View>
      </View>
    );
  }

  return <PageImageSkia url={url} onLayout={handleLayout} />;
}

function PageImageSkia({ url, onLayout }: { url: string; onLayout: (event: LayoutChangeEvent) => void }) {
  const image = useImage(url);

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

  return (
    <View
      testID="page-image-root"
      style={[styles.root, computedHeight != null && { height: computedHeight }]}
      onLayout={onLayout}
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
