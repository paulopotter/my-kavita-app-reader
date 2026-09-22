import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ReaderChapterPicker } from './reader-chapter-picker.component';
import { getStrings } from '../../../../shared/i18n/strings';
import type { OrderedChapter } from '../../reader.types';

const t = getStrings('pt-BR');

function chapter(over: Partial<OrderedChapter> = {}): OrderedChapter {
  return { id: 'c1', seriesId: 's1', number: 1, title: 'Sem título', readStatus: 'UNREAD', ...over };
}

function setup(over: Partial<React.ComponentProps<typeof ReaderChapterPicker>> = {}) {
  const onClose = jest.fn();
  const onSelect = jest.fn();
  const utils = render(
    <ReaderChapterPicker
      visible
      chapters={[chapter({ id: 'c1', number: 1 }), chapter({ id: 'c2', number: 2 }), chapter({ id: 'c3', number: 3 })]}
      focusedChapterId="c2"
      t={t}
      onClose={onClose}
      onSelect={onSelect}
      {...over}
    />,
  );
  return { ...utils, onClose, onSelect };
}

describe('ReaderChapterPicker', () => {
  it('renders the sheet title and one row per chapter', () => {
    // focusedChapterId is the FIRST chapter here (not c2, as `setup` defaults to) — a non-zero
    // initialScrollIndex makes RN's VirtualizedList render everything before it as a plain
    // spacer View with no text, which isn't this test's concern (see the picker's own doc: a
    // failed/absent scroll is a harmless convenience miss, not a bug).
    const { getByText } = setup({ focusedChapterId: 'c1' });
    expect(getByText(t.readerChapterPickerTitle)).toBeTruthy();
    expect(getByText('1. Sem título')).toBeTruthy();
    expect(getByText('2. Sem título')).toBeTruthy();
    expect(getByText('3. Sem título')).toBeTruthy();
  });

  it('shows a loading placeholder instead of an empty sheet while chapters have not arrived yet', () => {
    const { getByText, queryByText } = setup({ chapters: [] });
    expect(getByText(t.readerLoading)).toBeTruthy();
    expect(queryByText(t.readerChapterPickerTitle)).toBeTruthy();
  });

  it('selecting a chapter closes the sheet and reports the chosen id', () => {
    const { getByText, onClose, onSelect } = setup({ focusedChapterId: 'c1' });
    fireEvent.press(getByText('3. Sem título'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('c3');
  });

  it('pressing the backdrop closes without selecting', () => {
    const { UNSAFE_getAllByType, onClose, onSelect } = setup();
    const Pressable = require('react-native').Pressable;
    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]); // backdrop is the outermost Pressable
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
