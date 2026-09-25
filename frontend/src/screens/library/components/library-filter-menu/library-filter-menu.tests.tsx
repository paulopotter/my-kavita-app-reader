import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getStrings } from '../../../../shared/i18n/strings';
import { LibraryFilterMenu } from './library-filter-menu.component';
import type { LibraryReadStatusFilter } from '../../library.types';

const t = getStrings('pt-BR');

function setup(over: Partial<React.ComponentProps<typeof LibraryFilterMenu>> = {}) {
  const onClose = jest.fn();
  const onToggle = jest.fn();
  const onClear = jest.fn();
  const utils = render(
    <LibraryFilterMenu
      visible
      active={new Set<LibraryReadStatusFilter>()}
      t={t}
      onClose={onClose}
      onToggle={onToggle}
      onClear={onClear}
      {...over}
    />,
  );
  return { ...utils, onClose, onToggle, onClear };
}

describe('LibraryFilterMenu', () => {
  it('shows the title and all three status options', () => {
    const { getByText } = setup();
    expect(getByText(t.libraryFilterMenuTitle)).toBeTruthy();
    expect(getByText(t.readStatusUnread)).toBeTruthy();
    expect(getByText(t.readStatusReading)).toBeTruthy();
    expect(getByText(t.readStatusRead)).toBeTruthy();
  });

  it('pressing an option calls onToggle with its value, without closing the menu', () => {
    const { getByText, onToggle, onClose } = setup();
    fireEvent.press(getByText(t.readStatusUnread));
    expect(onToggle).toHaveBeenCalledWith('UNREAD');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('the clear button is disabled when nothing is active', () => {
    const { getByText, onClear } = setup({ active: new Set() });
    fireEvent.press(getByText(t.libraryFilterClearAll));
    expect(onClear).not.toHaveBeenCalled();
  });

  it('the clear button calls onClear when something is active', () => {
    const { getByText, onClear } = setup({ active: new Set<LibraryReadStatusFilter>(['READ']) });
    fireEvent.press(getByText(t.libraryFilterClearAll));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is pressed', () => {
    const { UNSAFE_getAllByType, onClose } = setup();
    const Pressable = require('react-native').Pressable;
    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]); // backdrop is the outermost Pressable
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('marks an active option checked via accessibilityState', () => {
    const { getByText } = setup({ active: new Set<LibraryReadStatusFilter>(['IN_PROGRESS']) });
    const Pressable = require('react-native').Pressable;
    let node = getByText(t.readStatusReading).parent;
    while (node && node.type !== Pressable) {
      node = node.parent;
    }
    expect(node?.props.accessibilityState).toEqual({ checked: true });
  });
});
