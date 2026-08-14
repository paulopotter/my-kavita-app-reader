import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, LayoutChangeEvent, StyleSheet, View } from 'react-native';

interface Props {
  url: string;
  onLayout: (height: number) => void;
}

const screenWidth = Dimensions.get('window').width;

export function PageImage({ url, onLayout }: Props) {
  const [loading, setLoading] = useState(true);
  const [computedHeight, setComputedHeight] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setComputedHeight(null);
    Image.getSize(
      url,
      (width, height) => {
        if (cancelled || width <= 0) {return;}
        setComputedHeight((height / width) * screenWidth);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [url]);

  const handleLayout = (event: LayoutChangeEvent) => {
    onLayout(event.nativeEvent.layout.height);
  };

  return (
    <View testID="page-image-root" style={[styles.root, computedHeight != null && { height: computedHeight }]} onLayout={handleLayout}>
      <Image source={{ uri: url }} style={styles.image} resizeMode="cover" onLoadEnd={() => setLoading(false)} />
      {loading && (
        <View testID="page-image-loading" style={styles.loadingOverlay}>
          <ActivityIndicator color="#E94560" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', minHeight: 400, backgroundColor: '#000000' },
  image: { width: '100%', height: '100%' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
