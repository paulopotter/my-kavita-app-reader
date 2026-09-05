import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Select, type SelectProps } from './select.component';

const OPTIONS = [
  { id: 'a', label: 'Option A' },
  { id: 'b', label: 'Option B' },
];

const props = (over: Partial<SelectProps> = {}): SelectProps => ({
  value: undefined,
  options: OPTIONS,
  placeholder: 'Pick one',
  onChange: jest.fn(),
  ...over,
});

describe('Select', () => {
  it('shows the placeholder when nothing is selected', () => {
    const { getByText } = render(<Select {...props()} />);
    expect(getByText('Pick one')).toBeTruthy();
  });

  it('shows the current option label when a value is set', () => {
    const { getByText, queryByText } = render(<Select {...props({ value: 'b' })} />);
    expect(getByText('Option B')).toBeTruthy();
    expect(queryByText('Pick one')).toBeNull();
  });

  it('opens the sheet and calls onChange with the picked id, then closes', () => {
    const onChange = jest.fn();
    const { getByText, queryByText } = render(<Select {...props({ onChange })} />);
    fireEvent.press(getByText('Pick one')); // open
    fireEvent.press(getByText('Option A')); // pick
    expect(onChange).toHaveBeenCalledWith('a');
    // sheet closed → the option row is gone, only the trigger label remains
    expect(queryByText('Option B')).toBeNull();
  });

  it('falls back to the "—" placeholder when none is passed', () => {
    const { getByText } = render(
      <Select value={undefined} options={OPTIONS} onChange={jest.fn()} />,
    );
    expect(getByText('—')).toBeTruthy();
  });

  it('handles an option whose id is undefined (the "no selection" row)', () => {
    const onChange = jest.fn();
    const opts = [{ id: undefined, label: 'None' }, ...OPTIONS];
    // value undefined + an option with id undefined → the trigger shows that option's label
    const { getByText } = render(<Select value={undefined} options={opts} placeholder="p" onChange={onChange} />);
    fireEvent.press(getByText('None')); // open (trigger label is "None")
    fireEvent.press(getByText('Option A')); // pick a real one
    expect(onChange).toHaveBeenCalledWith('a');
  });
});
