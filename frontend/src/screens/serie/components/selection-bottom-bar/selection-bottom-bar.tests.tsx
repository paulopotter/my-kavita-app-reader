import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getStrings } from '../../../../shared/i18n/strings';
import { SelectionBottomBar } from './selection-bottom-bar.component';

const t = getStrings('pt-BR');

describe('SelectionBottomBar', () => {
  it('renders the 4 action buttons', () => {
    const { getByText } = render(
      <SelectionBottomBar t={t} onMarkRead={jest.fn()} onMarkUnread={jest.fn()} onSelectAll={jest.fn()} onInvertSelection={jest.fn()} />,
    );
    expect(getByText(t.seriesDetailSelectionMarkRead)).toBeTruthy();
    expect(getByText(t.seriesDetailSelectionMarkUnread)).toBeTruthy();
    expect(getByText(t.seriesDetailSelectionSelectAll)).toBeTruthy();
    expect(getByText(t.seriesDetailSelectionInvert)).toBeTruthy();
  });

  it('calls onMarkRead when tapping mark read', () => {
    const onMarkRead = jest.fn();
    const { getByText } = render(
      <SelectionBottomBar t={t} onMarkRead={onMarkRead} onMarkUnread={jest.fn()} onSelectAll={jest.fn()} onInvertSelection={jest.fn()} />,
    );
    fireEvent.press(getByText(t.seriesDetailSelectionMarkRead));
    expect(onMarkRead).toHaveBeenCalledTimes(1);
  });

  it('calls onMarkUnread when tapping mark unread', () => {
    const onMarkUnread = jest.fn();
    const { getByText } = render(
      <SelectionBottomBar t={t} onMarkRead={jest.fn()} onMarkUnread={onMarkUnread} onSelectAll={jest.fn()} onInvertSelection={jest.fn()} />,
    );
    fireEvent.press(getByText(t.seriesDetailSelectionMarkUnread));
    expect(onMarkUnread).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectAll when tapping select all', () => {
    const onSelectAll = jest.fn();
    const { getByText } = render(
      <SelectionBottomBar t={t} onMarkRead={jest.fn()} onMarkUnread={jest.fn()} onSelectAll={onSelectAll} onInvertSelection={jest.fn()} />,
    );
    fireEvent.press(getByText(t.seriesDetailSelectionSelectAll));
    expect(onSelectAll).toHaveBeenCalledTimes(1);
  });

  it('calls onInvertSelection when tapping invert selection', () => {
    const onInvertSelection = jest.fn();
    const { getByText } = render(
      <SelectionBottomBar t={t} onMarkRead={jest.fn()} onMarkUnread={jest.fn()} onSelectAll={jest.fn()} onInvertSelection={onInvertSelection} />,
    );
    fireEvent.press(getByText(t.seriesDetailSelectionInvert));
    expect(onInvertSelection).toHaveBeenCalledTimes(1);
  });
});
