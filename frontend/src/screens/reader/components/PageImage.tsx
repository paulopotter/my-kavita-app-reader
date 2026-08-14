import React, { useState } from 'react';
import { ActivityIndicator, Image, LayoutChangeEvent, StyleSheet, View } from 'react-native';

interface Props {
  url: string;
  onLayout: (height: number) => void;
}

export function PageImage({ url, onLayout }: Props) {
  const [loading, setLoading] = useState(true);

  const handleLayout = (event: LayoutChangeEvent) => {
    onLayout(event.nativeEvent.layout.height);
  };

  return (
    <View testID="page-image-root" style={styles.root} onLayout={handleLayout}>
      <Image
        source={{ uri: url }}
        style={styles.image}
        resizeMode="contain"
        onLoadEnd={() => setLoading(false)}
      />
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
  image: { width: '100%', height: undefined, aspectRatio: undefined, flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
