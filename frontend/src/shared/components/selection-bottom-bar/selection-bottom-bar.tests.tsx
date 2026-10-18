import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Check, X } from 'lucide-react-native';
import { SelectionBottomBar } from './selection-bottom-bar.component';
import { selectionBottomBarStyles } from './selection-bottom-bar.styles';
import { spacing, text, themes } from '../../theme';

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

// The bar is transparent buttons over a raised surface, so its labels take the "transparent button"
// text role. The "on a primary fill" role (text.button.primary) looks fine in some identities and is
// nearly black-on-dark in others (forest: 1.2:1), which is how this went unnoticed — hence every
// identity is measured, not just the active one.
describe('SelectionBottomBar legibility', () => {
  const channels = (rgb: string): [number, number, number] => {
    const m = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(rgb);
    if (!m) {throw new Error(`not an rgb() token: ${rgb}`);}
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  };
  const luminance = (rgb: string): number => {
    const [r, g, b] = channels(rgb).map(c => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: string, b: string): number => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  it.each(Object.keys(themes) as Array<keyof typeof themes>)('%s: the labels clear 7:1 (WCAG AAA) on the bar', name => {
    const styles = selectionBottomBarStyles({ colors: themes[name], text }) as unknown as {
      root: { backgroundColor: string };
      buttonText: { color: string };
    };
    expect(contrast(styles.buttonText.color, styles.root.backgroundColor)).toBeGreaterThanOrEqual(7);
  });
});

