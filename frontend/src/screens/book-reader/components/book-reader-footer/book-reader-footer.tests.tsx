import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BookReaderFooter } from './book-reader-footer.component';

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
});
