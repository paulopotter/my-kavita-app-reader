import React from 'react';
import { View } from 'react-native';
import { styles } from './reader-overlay-footer.styles';

interface Props {
  visible: boolean;
}

// Reserves the overlay footer space for future features (nav buttons, quick actions) — renders no
// content or background today.
export function ReaderOverlayFooter({ visible }: Props) {
  if (!visible) {return null;}
  return <View testID="reader-overlay-footer" style={styles.root} />;
}
