import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getStrings } from '../../../../shared/i18n/strings';
import { DEFAULT_BOOK_APPEARANCE } from '../../../../shared/tools/books';
import { BookReaderSettingsSheet } from './book-reader-settings-sheet.component';

const t = getStrings('en');

function setup(over: Partial<React.ComponentProps<typeof BookReaderSettingsSheet>> = {}) {
  const onChange = jest.fn();
  const onChangeMode = jest.fn();
  const onClose = jest.fn();
  const utils = render(
    <BookReaderSettingsSheet
      visible
      appearance={DEFAULT_BOOK_APPEARANCE}
      mode="infinite"
      t={t}
      onChange={onChange}
      onChangeMode={onChangeMode}
      onClose={onClose}
      {...over}
    />,
  );
  return { ...utils, onChange, onChangeMode, onClose };
}

describe('BookReaderSettingsSheet', () => {
  it('renders nothing when not visible', () => {
    expect(setup({ visible: false }).queryByText(t.bookReaderAppearance)).toBeNull();
  });

  it('lists every section', () => {
    const { getByText } = setup();
    for (const label of [t.bookReaderAppearance, t.bookReaderModeLabel, t.bookReaderThemeLabel, t.bookReaderFontLabel, t.bookReaderLineSpacingLabel, t.bookReaderMarginLabel, t.bookReaderJustify]) {
      expect(getByText(label)).toBeTruthy();
    }
  });

  it('offers every theme, the app one included, and reports the choice', () => {
    const { getByLabelText, onChange } = setup();
    for (const label of [t.bookReaderThemeApp, t.bookReaderThemePaper, t.bookReaderThemeSepia, t.bookReaderThemeGray, t.bookReaderThemeGreen, t.bookReaderThemeDark, t.bookReaderThemeNight, t.bookReaderThemeBlack, t.bookReaderThemeContrast]) {
      expect(getByLabelText(label)).toBeTruthy();
    }
    fireEvent.press(getByLabelText(t.bookReaderThemeSepia));
    expect(onChange).toHaveBeenCalledWith('theme', 'sepia');
  });

  it('marks the chosen theme as selected', () => {
    const { getByLabelText } = setup({ appearance: { ...DEFAULT_BOOK_APPEARANCE, theme: 'night' } });
    expect(getByLabelText(t.bookReaderThemeNight).props.accessibilityState).toEqual({ selected: true });
    expect(getByLabelText(t.bookReaderThemeApp).props.accessibilityState).toEqual({ selected: false });
  });

  it('reports a font, a line height and a margin', () => {
    const { getByText, onChange } = setup();
    fireEvent.press(getByText(t.bookReaderFontSans));
    fireEvent.press(getByText('1.8'));
    fireEvent.press(getByText(t.bookReaderMarginWide));

    expect(onChange).toHaveBeenCalledWith('fontFamily', 'sans');
    expect(onChange).toHaveBeenCalledWith('lineSpacing', 1.8);
    expect(onChange).toHaveBeenCalledWith('margin', 'wide');
  });

  it('shows the current line height and margin as chosen', () => {
    const { getAllByRole } = setup({ appearance: { ...DEFAULT_BOOK_APPEARANCE, lineSpacing: 2, margin: 'narrow' } });
    const selected = getAllByRole('button').filter(b => b.props.accessibilityState?.selected === true);
    // The infinite mode, the app theme swatch, the serif font, line spacing 2 and narrow margins.
    expect(selected).toHaveLength(5);
  });

  it('offers both reading modes, marks the current one and reports the choice', () => {
    const { getByText, onChangeMode } = setup({ mode: 'paged' });

    fireEvent.press(getByText(t.bookReaderModeInfinite));
    expect(onChangeMode).toHaveBeenCalledWith('infinite');
    fireEvent.press(getByText(t.bookReaderModePaged));
    expect(onChangeMode).toHaveBeenCalledWith('paged');
  });

  it('reports the justification switch', () => {
    const { UNSAFE_getByType, onChange } = setup();
    const { Switch } = require('react-native');
    fireEvent(UNSAFE_getByType(Switch), 'valueChange', true);
    expect(onChange).toHaveBeenCalledWith('justify', true);
  });

  it('closes from the button and from the backdrop', () => {
    const { getByText, getByTestId, onClose } = setup();
    fireEvent.press(getByText(t.bookReaderClose));
    fireEvent.press(getByTestId('book-reader-settings-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
