import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Check, X } from 'lucide-react-native';
import { SelectionBottomBar } from './selection-bottom-bar.component';

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
});
