import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { BookReaderFooter } from './book-reader-footer.component';
import { spacing } from '../../../../shared/theme';

const labels = {
  prevChapter: 'Capítulo anterior',
  nextChapter: 'Próximo capítulo',
  prevPage: 'Página anterior',
  nextPage: 'Próxima página',
  smallerText: 'Diminuir o texto',
  largerText: 'Aumentar o texto',
};

function setup(over: Partial<React.ComponentProps<typeof BookReaderFooter>> = {}) {
  const handlers = {
    onPrevChapter: jest.fn(),
    onNextChapter: jest.fn(),
    onPrevPage: jest.fn(),
    onNextPage: jest.fn(),
    onSmallerText: jest.fn(),
    onLargerText: jest.fn(),
  };
  const utils = render(
    <BookReaderFooter
      visible
      labels={labels}
      hasPrevChapter
      hasNextChapter
      showPages={false}
      hasPrevPage={false}
      hasNextPage={false}
      {...handlers}
      {...over}
    />,
  );
  return { ...utils, ...handlers };
}

describe('BookReaderFooter', () => {
  it('renders nothing when not visible', () => {
    expect(setup({ visible: false }).toJSON()).toBeNull();
  });

  it('fires the text size and chapter handlers', () => {
    const h = setup();
    fireEvent.press(h.getByLabelText(labels.smallerText));
    fireEvent.press(h.getByLabelText(labels.largerText));
    fireEvent.press(h.getByLabelText(labels.prevChapter));
    fireEvent.press(h.getByLabelText(labels.nextChapter));

    expect(h.onSmallerText).toHaveBeenCalledTimes(1);
    expect(h.onLargerText).toHaveBeenCalledTimes(1);
    expect(h.onPrevChapter).toHaveBeenCalledTimes(1);
    expect(h.onNextChapter).toHaveBeenCalledTimes(1);
  });

  it('does not fire a chapter handler that is not available', () => {
    const h = setup({ hasPrevChapter: false, hasNextChapter: false });
    fireEvent.press(h.getByLabelText(labels.prevChapter));
    fireEvent.press(h.getByLabelText(labels.nextChapter));

    expect(h.onPrevChapter).not.toHaveBeenCalled();
    expect(h.onNextChapter).not.toHaveBeenCalled();
  });

  it('has no page buttons for a single-page book', () => {
    const h = setup();
    expect(h.queryByLabelText(labels.prevPage)).toBeNull();
    expect(h.queryByLabelText(labels.nextPage)).toBeNull();
  });

  it('turns pages when the book has several, and respects the ends', () => {
    const h = setup({ showPages: true, hasPrevPage: false, hasNextPage: true });
    fireEvent.press(h.getByLabelText(labels.prevPage));
    fireEvent.press(h.getByLabelText(labels.nextPage));

    expect(h.onPrevPage).not.toHaveBeenCalled();
    expect(h.onNextPage).toHaveBeenCalledTimes(1);
  });

  it('puts the previous chapter on the left, the text size in the middle and the next chapter on the right', () => {
    const { toJSON } = setup();
    const labelsInOrder: string[] = [];
    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object') {return;}
      const n = node as { props?: { accessibilityLabel?: string }; children?: unknown[] };
      if (n.props?.accessibilityLabel) {labelsInOrder.push(n.props.accessibilityLabel);}
      (n.children ?? []).forEach(walk);
    };
    walk(toJSON());

    expect(labelsInOrder).toEqual([
      labels.prevChapter,
      labels.smallerText,
      labels.largerText,
      labels.nextChapter,
    ]);
  });

  it('pads its bottom by the system bar so the controls are not under it', () => {
    const { getByTestId } = render(
      <SafeAreaInsetsContext.Provider value={{ top: 0, bottom: 15, left: 0, right: 0 }}>
        <BookReaderFooter
          visible
          labels={labels}
          hasPrevChapter
          hasNextChapter
          showPages={false}
          hasPrevPage={false}
          hasNextPage={false}
          onPrevChapter={jest.fn()}
          onNextChapter={jest.fn()}
          onPrevPage={jest.fn()}
          onNextPage={jest.fn()}
          onSmallerText={jest.fn()}
          onLargerText={jest.fn()}
        />
      </SafeAreaInsetsContext.Provider>,
    );
    const style = StyleSheet.flatten(getByTestId('book-reader-footer').props.style) as { paddingBottom: number };
    expect(style.paddingBottom).toBe(spacing[7] + 15);
  });
});
