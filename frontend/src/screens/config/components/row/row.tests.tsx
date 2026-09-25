import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CornerDownRight, MoreHorizontal } from 'lucide-react-native';
import { Row, type RowProps } from './row.component';

const props = (over: Partial<RowProps> = {}): RowProps => ({
  active: false,
  primary: 'http://host',
  onMenu: jest.fn(),
  menuLabel: 'More options',
  ...over,
});

describe('Row', () => {
  it('renders the primary line and the menu affordance', () => {
    const { getByText, UNSAFE_getByType } = render(<Row {...props()} />);
    expect(getByText('http://host')).toBeTruthy();
    expect(UNSAFE_getByType(MoreHorizontal)).toBeTruthy();
  });

  it('renders the secondary line and the trailing label when given', () => {
    const { getByText } = render(<Row {...props({ secondary: 'http://linked', trailing: 'P2' })} />);
    expect(getByText('http://linked')).toBeTruthy();
    expect(getByText('P2')).toBeTruthy();
  });

  it('omits the secondary line when not given', () => {
    const { queryByText, UNSAFE_queryByType } = render(<Row {...props()} />);
    expect(queryByText('http://linked')).toBeNull();
    expect(UNSAFE_queryByType(CornerDownRight)).toBeNull();
  });

  // The arrow marks a sub-line that points at something; "nothing linked" points at nothing.
  it('draws the arrow for a linked sub-line but not for an empty one', () => {
    const linked = render(<Row {...props({ secondary: 'http://linked' })} />);
    expect(linked.UNSAFE_getByType(CornerDownRight)).toBeTruthy();

    const empty = render(<Row {...props({ secondary: '(none)', secondaryEmpty: true })} />);
    expect(empty.UNSAFE_queryByType(CornerDownRight)).toBeNull();
  });

  it('renders an empty-styled secondary line when secondaryEmpty is set', () => {
    const { getByText } = render(<Row {...props({ secondary: '(none)', secondaryEmpty: true })} />);
    expect(getByText('(none)')).toBeTruthy();
  });

  it('renders the active dot without crashing', () => {
    const { getByText } = render(<Row {...props({ active: true })} />);
    expect(getByText('http://host')).toBeTruthy();
  });

  it('calls onMenu when the menu button is pressed', () => {
    const onMenu = jest.fn();
    const { UNSAFE_getByType } = render(<Row {...props({ onMenu })} />);
    const { TouchableOpacity } = require('react-native');
    fireEvent.press(UNSAFE_getByType(TouchableOpacity));
    expect(onMenu).toHaveBeenCalledTimes(1);
  });
});
