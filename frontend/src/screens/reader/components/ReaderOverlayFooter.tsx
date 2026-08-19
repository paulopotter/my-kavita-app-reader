import React from 'react';
import { StyleSheet, View } from 'react-native';

interface Props {
  visible: boolean;
}

// Reserva o espaço do footer do overlay para features futuras (botões de navegação,
// ações rápidas etc.) — hoje não exibe nenhum conteúdo nem background.
export function ReaderOverlayFooter({ visible }: Props) {
  if (!visible) {return null;}

  return <View testID="reader-overlay-footer" style={styles.root} />;
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 56,
  },
});
