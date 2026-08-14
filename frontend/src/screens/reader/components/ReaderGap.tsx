import React from 'react';
import { View } from 'react-native';

interface Props {
  height: number;
}

export function ReaderGap({ height }: Props) {
  return <View testID="reader-gap" style={{ height }} />;
}
