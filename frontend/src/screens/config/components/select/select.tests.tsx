import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Polygon } from 'react-native-svg';
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

  describe('the swatch', () => {
    const swatch = { accent: 'rgb(56, 189, 199)', surface: 'rgb(15, 26, 33)' } as const;

    it('draws one sample per colour, above and below the diagonal', () => {
      const { UNSAFE_getAllByType } = render(
        <Select value="a" options={[{ id: 'a', label: 'Option A', swatch }]} onChange={jest.fn()} />,
      );
      const fills = UNSAFE_getAllByType(Polygon).map(p => p.props.fill);
      expect(fills).toEqual([swatch.accent, swatch.surface]);
    });

    it('shows it on the closed trigger, so the current choice reads without opening', () => {
      const { UNSAFE_queryAllByType } = render(
        <Select value="a" options={[{ id: 'a', label: 'Option A', swatch }]} onChange={jest.fn()} />,
      );
      expect(UNSAFE_queryAllByType(Polygon).length).toBe(2);
    });

    // The Select stays dumb: a caller that has nothing to sample renders exactly as before.
    it('draws nothing for an option without one', () => {
      const { UNSAFE_queryAllByType, getByText } = render(
        <Select value="a" options={OPTIONS} onChange={jest.fn()} />,
      );
      expect(UNSAFE_queryAllByType(Polygon)).toEqual([]);
      expect(getByText('Option A')).toBeTruthy();
    });

    it('mixes options with and without one', () => {
      const opts = [{ id: 'a', label: 'Option A', swatch }, { id: 'b', label: 'Option B' }];
      const { UNSAFE_queryAllByType, getByText } = render(
        <Select value="b" options={opts} onChange={jest.fn()} />,
      );
      // 'b' is selected and has no swatch, so the closed trigger draws none.
      expect(UNSAFE_queryAllByType(Polygon)).toEqual([]);
      fireEvent.press(getByText('Option B'));
      // Open: only 'a' contributes a pair.
      expect(UNSAFE_queryAllByType(Polygon).length).toBe(2);
    });
  });
});
