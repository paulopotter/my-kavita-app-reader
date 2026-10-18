import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getStrings } from '../../i18n/strings';
import { DEFAULT_BOOK_APPEARANCE } from '../../tools/books';
import { BookAppearanceFields } from './book-appearance-fields.component';

const t = getStrings('en');

function setup(over: Partial<React.ComponentProps<typeof BookAppearanceFields>> = {}) {
  const onChange = jest.fn();
  const onChangeMode = jest.fn();
  const utils = render(
    <BookAppearanceFields appearance={DEFAULT_BOOK_APPEARANCE} mode="infinite" t={t} onChange={onChange} onChangeMode={onChangeMode} {...over} />,
  );
  return { ...utils, onChange, onChangeMode };
}

describe('BookAppearanceFields', () => {
  it('lists every choice a novel reader has', () => {
    const { getByText } = setup();
    for (const label of [
      t.bookReaderModeLabel,
      t.bookReaderThemeLabel,
      t.bookReaderFontSizeLabel,
      t.bookReaderFontLabel,
      t.bookReaderLineSpacingLabel,
      t.bookReaderMarginLabel,
      t.bookReaderJustify,
    ]) {
      expect(getByText(label)).toBeTruthy();
    }
  });

  it('reports a text size as a number, labelled as a percentage', () => {
    const { getByText, onChange } = setup();
    fireEvent.press(getByText('130%'));
    expect(onChange).toHaveBeenCalledWith('fontScale', 1.3);
  });

  it('marks the text size in use', () => {
    const { getByText } = setup({ appearance: { ...DEFAULT_BOOK_APPEARANCE, fontScale: 1.5 } });
    expect(getByText('150%').parent?.parent?.props.accessibilityState).toEqual({ selected: true });
  });

  it('reports the reading mode', () => {
    const { getByText, onChangeMode } = setup();
    fireEvent.press(getByText(t.bookReaderModePaged));
    expect(onChangeMode).toHaveBeenCalledWith('paged');
  });
});
