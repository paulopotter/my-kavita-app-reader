import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { styles } from './reader-side-progress-bar.styles';

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

// Dumb: renders arrows + one dot per page from the props it's given; fires the callbacks.
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
