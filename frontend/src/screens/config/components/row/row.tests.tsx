import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Row, type RowProps } from './row.component';

const props = (over: Partial<RowProps> = {}): RowProps => ({
  active: false,
  primary: 'http://host',
  onMenu: jest.fn(),
  ...over,
});

describe('Row', () => {
  it('renders the primary line and the menu affordance', () => {
    const { getByText } = render(<Row {...props()} />);
    expect(getByText('http://host')).toBeTruthy();
    expect(getByText('⋯')).toBeTruthy();
  });

  it('renders the secondary line and the trailing label when given', () => {
    const { getByText } = render(<Row {...props({ secondary: '↳ http://linked', trailing: 'P2' })} />);
    expect(getByText('↳ http://linked')).toBeTruthy();
    expect(getByText('P2')).toBeTruthy();
  });

  it('omits the secondary line when not given', () => {
    const { queryByText } = render(<Row {...props()} />);
    expect(queryByText(/↳/)).toBeNull();
  });

  it('renders an empty-styled secondary line when secondaryEmpty is set', () => {
    const { getByText } = render(<Row {...props({ secondary: '(none)', secondaryEmpty: true })} />);
    expect(getByText('(none)')).toBeTruthy();
  });

  it('renders the active dot without crashing', () => {
    const { getByText } = render(<Row {...props({ active: true })} />);
    expect(getByText('http://host')).toBeTruthy();
  });

  it('calls onMenu when the ⋯ is pressed', () => {
    const onMenu = jest.fn();
    const { getByText } = render(<Row {...props({ onMenu })} />);
    fireEvent.press(getByText('⋯'));
    expect(onMenu).toHaveBeenCalledTimes(1);
  });
});
