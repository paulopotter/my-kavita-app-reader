import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  totalPages: number;
  currentPage: number;
  onPageSelect: (index: number) => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  visible: boolean;
}

const ARROW_BUTTON_SIZE = 32;

// Espaçamento confortável entre bolinhas (centro a centro) — mesma ideia do MIN_DOT_SPACING da
// referência: a trilha cresce proporcionalmente ao número de páginas até um teto (senão um
// capítulo de 300 páginas ocuparia a tela toda), com um piso mínimo pra poucas páginas não
// ficarem espremidas em uma trilha minúscula.
const DOT_SPACING = 16;
const MIN_TRACK_HEIGHT = 120;
const screenHeight = Dimensions.get('window').height;
// A trilha nunca deve dominar a tela nem encostar nos botões de seta/status bar.
const MAX_TRACK_HEIGHT = screenHeight * 0.6;

export function ReaderSideProgressBar({
  totalPages,
  currentPage,
  onPageSelect,
  onPrevChapter,
  onNextChapter,
  hasPrev,
  hasNext,
  visible,
}: Props) {
  if (!visible) {return null;}

  const trackHeight = Math.min(Math.max(totalPages * DOT_SPACING, MIN_TRACK_HEIGHT), MAX_TRACK_HEIGHT);

  return (
    <View style={styles.root}>
      <TouchableOpacity
        testID="side-bar-prev"
        style={styles.arrowButton}
        disabled={!hasPrev}
        onPress={() => {
          if (hasPrev) {onPrevChapter();}
        }}>
        <Text style={[styles.arrow, !hasPrev && styles.arrowDisabled]}>{'▲'}</Text>
      </TouchableOpacity>
      <View style={[styles.dots, { height: trackHeight }]}>
        {Array.from({ length: totalPages }, (_, index) => (
          <TouchableOpacity key={index} onPress={() => onPageSelect(index)} hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}>
            <View
              style={[
                styles.dot,
                index < currentPage && styles.dotRead,
                index === currentPage && styles.dotActive,
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        testID="side-bar-next"
        style={styles.arrowButton}
        disabled={!hasNext}
        onPress={() => {
          if (hasNext) {onNextChapter();}
        }}>
        <Text style={[styles.arrow, !hasNext && styles.arrowDisabled]}>{'▼'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    right: 8,
    top: '20%',
    bottom: '20%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowButton: {
    width: ARROW_BUTTON_SIZE,
    height: ARROW_BUTTON_SIZE,
    borderRadius: ARROW_BUTTON_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: { color: '#FFFFFF', fontSize: 18 },
  arrowDisabled: { color: '#4A5568' },
  dots: {
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 8,
    width: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#A0AEC0' },
  // Página já lida: mesmo dourado da barra fina de progresso (#FFC107), com opacidade reduzida
  // para diferenciar visualmente da página atual sem competir com o destaque dela.
  dotRead: { backgroundColor: 'rgba(255, 193, 7, 0.5)' },
  dotActive: { backgroundColor: '#E94560', width: 8, height: 8, borderRadius: 4 },
});
