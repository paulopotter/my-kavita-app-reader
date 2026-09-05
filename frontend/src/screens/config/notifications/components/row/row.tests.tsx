import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Row, type RowProps } from './row.component';

const props = (over: Partial<RowProps> = {}): RowProps => ({
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

  it('renders the trailing label when given', () => {
    const { getByText } = render(<Row {...props({ trailing: 'P2' })} />);
    expect(getByText('P2')).toBeTruthy();
  });

  it('omits the trailing label when not given', () => {
    const { queryByText } = render(<Row {...props()} />);
    expect(queryByText('P2')).toBeNull();
  });

  it('calls onMenu when the ⋯ is pressed', () => {
    const onMenu = jest.fn();
    const { getByText } = render(<Row {...props({ onMenu })} />);
    fireEvent.press(getByText('⋯'));
    expect(onMenu).toHaveBeenCalledTimes(1);
  });
});
