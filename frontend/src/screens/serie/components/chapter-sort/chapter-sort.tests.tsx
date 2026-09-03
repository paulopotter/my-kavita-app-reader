import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getStrings } from '../../../../shared/i18n/strings';
import { ChapterSortFields, sortModeLabel } from './chapter-sort.component';

const t = getStrings('pt-BR');

describe('sortModeLabel', () => {
  it('returns the plain label for ASCENDING / DESCENDING', () => {
    expect(sortModeLabel('ASCENDING', undefined, 50, t)).toBe(t.seriesDetailSortAscending);
    expect(sortModeLabel('DESCENDING', undefined, 50, t)).toBe(t.seriesDetailSortDescending);
  });

  it('interpolates the threshold into AUTO_FIXED (0 when undefined)', () => {
    expect(sortModeLabel('AUTO_FIXED', 12, 50, t)).toBe(t.seriesDetailSortAutoFixed.replace('{0}', '12'));
    expect(sortModeLabel('AUTO_FIXED', undefined, 50, t)).toBe(t.seriesDetailSortAutoFixed.replace('{0}', '0'));
  });

  it('interpolates the percent into AUTO_PROGRESS', () => {
    expect(sortModeLabel('AUTO_PROGRESS', undefined, 80, t)).toBe(t.seriesDetailSortAutoProgress.replace('{0}', '80'));
  });
});

describe('ChapterSortFields', () => {
  const base = {
    mode: 'ASCENDING' as const,
    progressPercent: 50,
    t,
    onChange: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders all four mode options', () => {
    const { getByText } = render(<ChapterSortFields {...base} />);
    expect(getByText(t.seriesDetailSortAscending)).toBeTruthy();
    expect(getByText(t.seriesDetailSortDescending)).toBeTruthy();
    expect(getByText(t.seriesDetailSortAutoFixed.replace('{0}', '0'))).toBeTruthy();
    expect(getByText(t.seriesDetailSortAutoProgress.replace('{0}', '50'))).toBeTruthy();
  });

  it('emits the picked mode through onChange', () => {
    const onChange = jest.fn();
    const { getByText } = render(<ChapterSortFields {...base} onChange={onChange} />);
    fireEvent.press(getByText(t.seriesDetailSortDescending));
    expect(onChange).toHaveBeenCalledWith('DESCENDING', undefined, 50);
  });

  it('shows the threshold field only when AUTO_FIXED is selected', () => {
    const { getByText, queryByText } = render(<ChapterSortFields {...base} />);
    expect(queryByText(t.seriesDetailSortConfigFixedThresholdLabel)).toBeNull();
    fireEvent.press(getByText(t.seriesDetailSortAutoFixed.replace('{0}', '0')));
    expect(getByText(t.seriesDetailSortConfigFixedThresholdLabel)).toBeTruthy();
  });

  it('parses the threshold input and passes it through onChange', () => {
    const onChange = jest.fn();
    const { getByText, getByDisplayValue } = render(
      <ChapterSortFields {...base} mode="AUTO_FIXED" onChange={onChange} />,
    );
    fireEvent.press(getByText(t.seriesDetailSortAutoFixed.replace('{0}', '0'))); // select it
    const input = getByDisplayValue(''); // threshold text field, starts empty
    fireEvent.changeText(input, '12ab'); // non-digits stripped
    expect(onChange).toHaveBeenLastCalledWith('AUTO_FIXED', 12, 50);
  });

  it('clamps the progress input to 0–100', () => {
    const onChange = jest.fn();
    const { getByText, getByDisplayValue } = render(
      <ChapterSortFields {...base} mode="AUTO_PROGRESS" progressPercent={50} onChange={onChange} />,
    );
    fireEvent.press(getByText(t.seriesDetailSortAutoProgress.replace('{0}', '50')));
    const input = getByDisplayValue('50');
    fireEvent.changeText(input, '250');
    expect(onChange).toHaveBeenLastCalledWith('AUTO_PROGRESS', undefined, 100);
  });

  it('an empty progress input falls back to the current progressPercent', () => {
    const onChange = jest.fn();
    const { getByText, getByDisplayValue } = render(
      <ChapterSortFields {...base} mode="AUTO_PROGRESS" progressPercent={70} onChange={onChange} />,
    );
    fireEvent.press(getByText(t.seriesDetailSortAutoProgress.replace('{0}', '70')));
    fireEvent.changeText(getByDisplayValue('70'), '');
    expect(onChange).toHaveBeenLastCalledWith('AUTO_PROGRESS', undefined, 70);
  });
});
