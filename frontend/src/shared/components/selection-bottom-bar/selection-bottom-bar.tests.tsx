import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Check, X } from 'lucide-react-native';
import { SelectionBottomBar } from './selection-bottom-bar.component';
import { spacing } from '../../theme';

describe('SelectionBottomBar', () => {
  it('renders every action passed in', () => {
    const { getByText } = render(
      <SelectionBottomBar
        actions={[
          { key: 'read', icon: Check, label: 'Marcar lido', onPress: jest.fn() },
          { key: 'unread', icon: X, label: 'Marcar não lido', onPress: jest.fn() },
        ]}
      />,
    );
    expect(getByText('Marcar lido')).toBeTruthy();
    expect(getByText('Marcar não lido')).toBeTruthy();
  });

  it('calls the right action onPress when its button is tapped', () => {
    const onRead = jest.fn();
    const onUnread = jest.fn();
    const { getByText } = render(
      <SelectionBottomBar
        actions={[
          { key: 'read', icon: Check, label: 'Marcar lido', onPress: onRead },
          { key: 'unread', icon: X, label: 'Marcar não lido', onPress: onUnread },
        ]}
      />,
    );
    fireEvent.press(getByText('Marcar lido'));
    expect(onRead).toHaveBeenCalledTimes(1);
    expect(onUnread).not.toHaveBeenCalled();

    fireEvent.press(getByText('Marcar não lido'));
    expect(onUnread).toHaveBeenCalledTimes(1);
  });

  it('renders no buttons when given an empty action list', () => {
    const { queryByText } = render(<SelectionBottomBar actions={[]} />);
    expect(queryByText(/./)).toBeNull();
  });

  it('pads its bottom by the system bar so the labels are not hidden under it', () => {
    const { getByText } = render(
      <SafeAreaInsetsContext.Provider value={{ top: 0, bottom: 15, left: 0, right: 0 }}>
        <SelectionBottomBar actions={[{ key: 'read', icon: Check, label: 'Marcar lido', onPress: jest.fn() }]} />
      </SafeAreaInsetsContext.Provider>,
    );
    let node = getByText('Marcar lido').parent as { props: { style?: unknown }; parent: unknown } | null;
    // Up to the bar's own root: the first ancestor that carries a paddingBottom.
    let padding: number | undefined;
    while (node && padding == null) {
      padding = (StyleSheet.flatten(node.props.style as object) as { paddingBottom?: number } | undefined)?.paddingBottom;
      node = node.parent as typeof node;
    }
    expect(padding).toBe(spacing[5] + 15);
  });

  it('adds nothing outside a SafeAreaProvider', () => {
    const { getByText } = render(
      <SelectionBottomBar actions={[{ key: 'read', icon: Check, label: 'Marcar lido', onPress: jest.fn() }]} />,
    );
    let node = getByText('Marcar lido').parent as { props: { style?: unknown }; parent: unknown } | null;
    let padding: number | undefined;
    while (node && padding == null) {
      padding = (StyleSheet.flatten(node.props.style as object) as { paddingBottom?: number } | undefined)?.paddingBottom;
      node = node.parent as typeof node;
    }
    expect(padding).toBe(spacing[5]);
  });
});
