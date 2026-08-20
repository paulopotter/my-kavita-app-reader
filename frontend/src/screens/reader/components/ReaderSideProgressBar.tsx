import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

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
const DOT_SIZE = 6;
// Gap mínimo entre bolinhas = metade do tamanho da bolinha (bolinha 6px -> gap mínimo 3px entre
// vizinhas). A "div" das bolinhas (`dots`) sempre vai de uma seta a outra (flex:1, preenche todo
// o espaço disponível no root) — as bolinhas se distribuem dentro dela via space-evenly; se
// houver muitas páginas, o conteúdo cresce e o próprio ScrollView (ver abaixo) permite rolar
// mantendo o gap mínimo, ao invés de espremer as bolinhas além do legível.
const DOT_GAP = DOT_SIZE / 2;

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

  return (
    <View style={styles.root}>
      <TouchableOpacity
        testID="side-bar-prev"
        style={styles.arrowButton}
        disabled={!hasPrev}
        onPress={() => {
          if (hasPrev) {onPrevChapter();}
        }}>
        <ChevronUp size={18} color={hasPrev ? '#FFFFFF' : '#4A5568'} />
      </TouchableOpacity>
      <View style={styles.dots}>
        {Array.from({ length: totalPages }, (_, index) => (
          <TouchableOpacity
            key={index}
            style={styles.dotTouchable}
            onPress={() => onPageSelect(index)}
            hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}>
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
        <ChevronDown size={18} color={hasNext ? '#FFFFFF' : '#4A5568'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    right: 8,
    // Seta de cima logo abaixo do header (gap mínimo); seta de baixo perto do footer (~92%).
    top: 92,
    bottom: '8%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowButton: {
    width: ARROW_BUTTON_SIZE,
    height: ARROW_BUTTON_SIZE,
    borderRadius: ARROW_BUTTON_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: DOT_GAP,
    marginVertical: 4,
    width: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  dotTouchable: { alignItems: 'center', justifyContent: 'center' },
  dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, backgroundColor: '#A0AEC0' },
  // Página já lida: mesmo dourado da barra fina de progresso (#FFC107), com opacidade reduzida
  // para diferenciar visualmente da página atual sem competir com o destaque dela.
  dotRead: { backgroundColor: 'rgba(255, 193, 7, 0.5)' },
  dotActive: { backgroundColor: '#E94560', width: 8, height: 8, borderRadius: 4 },
});
