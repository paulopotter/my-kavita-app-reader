import React from 'react';
import { Dimensions, NativeSyntheticEvent, requireNativeComponent, ViewStyle } from 'react-native';

interface VisiblePageChangedEvent {
  pageIndex: number;
}

interface NativeProps {
  testID?: string;
  style?: ViewStyle | ViewStyle[];
  pageUrls: string[];
  onVisiblePageChanged?: (event: NativeSyntheticEvent<VisiblePageChangedEvent>) => void;
}

const RCTReaderPageListView = requireNativeComponent<NativeProps>('ReaderPageListView');

interface Props {
  pageUrls: string[];
  onVisiblePageChanged?: (pageIndex: number) => void;
}

// flex:1 sozinho não é suficiente para Views nativas customizadas sem filhos JS — o Yoga não
// tem como inferir um tamanho intrínseco e pode colapsar a view para 0x0. Passar width/height
// explícitos elimina essa ambiguidade.
const windowSize = Dimensions.get('window');

export function ReaderPageListView({ pageUrls, onVisiblePageChanged }: Props) {
  return (
    <RCTReaderPageListView
      testID="reader-page-list-view"
      style={[styles.root, { width: windowSize.width, height: windowSize.height }]}
      pageUrls={pageUrls}
      onVisiblePageChanged={
        onVisiblePageChanged ? event => onVisiblePageChanged(event.nativeEvent.pageIndex) : undefined
      }
    />
  );
}

const styles: { root: ViewStyle } = {
  root: { flex: 1 },
};
