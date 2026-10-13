import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PageBudget } from './page-budget.component';

const base = { title: 'Page size', hint: 'smaller = smoother', options: [32, 48, 64, 80] };

describe('PageBudget', () => {
  it('renders the title, the hint and one button per option', () => {
    const { getByText } = render(<PageBudget {...base} value={48} onSelect={jest.fn()} />);
    expect(getByText('Page size')).toBeTruthy();
    expect(getByText('smaller = smoother')).toBeTruthy();
    for (const mb of base.options) {expect(getByText(`${mb} MB`)).toBeTruthy();}
  });

  it('marks only the current value as selected', () => {
    const { getByLabelText } = render(<PageBudget {...base} value={64} onSelect={jest.fn()} />);
    expect(getByLabelText('64 MB').props.accessibilityState).toEqual({ selected: true });
    expect(getByLabelText('48 MB').props.accessibilityState).toEqual({ selected: false });
  });

  it('reports the tapped option', () => {
    const onSelect = jest.fn();
    const { getByText } = render(<PageBudget {...base} value={48} onSelect={onSelect} />);
    fireEvent.press(getByText('80 MB'));
    expect(onSelect).toHaveBeenCalledWith(80);
  });

  it('selects nothing while the value is still loading', () => {
    const { getByLabelText } = render(<PageBudget {...base} value={null} onSelect={jest.fn()} />);
    expect(getByLabelText('48 MB').props.accessibilityState).toEqual({ selected: false });
  });
});
